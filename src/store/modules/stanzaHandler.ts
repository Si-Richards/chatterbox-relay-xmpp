
import { xml } from '@xmpp/client';
import { Message, Contact, Room, RoomAffiliation } from '../types';
import { toast } from '@/hooks/use-toast';

export const createStanzaHandler = (set: any, get: any) => ({
  handleStanza: (stanza: any) => {
    // Handle MAM result messages
    if (stanza.is('message')) {
      const result = stanza.getChild('result', 'urn:xmpp:mam:2');
      if (result) {
        const forwarded = result.getChild('forwarded', 'urn:xmpp:forward:0');
        if (forwarded) {
          const message = forwarded.getChild('message');
          const delay = forwarded.getChild('delay', 'urn:xmpp:delay');
          
          if (message && message.getChildText('body')) {
            const from = message.attrs.from;
            const to = message.attrs.to;
            const type = message.attrs.type || 'chat';
            const body = message.getChildText('body');
            const id = message.attrs.id || result.attrs.id || Date.now().toString();
            
            let timestamp = new Date();
            if (delay && delay.attrs.stamp) {
              timestamp = new Date(delay.attrs.stamp);
            }
            
            const archivedMessage: Message = {
              id,
              from,
              to,
              body,
              timestamp,
              type: type as 'chat' | 'groupchat',
              status: 'delivered'
            };
            
            const archiveChatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
            
            set((state: any) => {
              const existingMessages = state.messages[archiveChatJid] || [];
              const messageExists = existingMessages.find((msg: Message) => msg.id === id);
              if (!messageExists) {
                return {
                  messages: {
                    ...state.messages,
                    [archiveChatJid]: [...existingMessages, archivedMessage].sort((a, b) => 
                      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    )
                  }
                };
              }
              return state;
            });
            
            return;
          }
        }
      }
    }

    // Handle MAM query completion
    if (stanza.is('iq') && stanza.attrs.type === 'result') {
      const fin = stanza.getChild('fin', 'urn:xmpp:mam:2');
      if (fin) {
        console.log('MAM query completed');
        return;
      }
    }

    // Handle IQ results
    if (stanza.is('iq') && stanza.attrs.type === 'result') {
      // Handle roster (contact list) response
      const query = stanza.getChild('query', 'jabber:iq:roster');
      if (query) {
        const items = query.getChildren('item');
        const newContacts: Contact[] = items.map((item: any) => ({
          jid: item.attrs.jid,
          name: item.attrs.name || item.attrs.jid.split('@')[0],
          presence: 'offline',
          avatar: null,
          lastSeen: new Date()
        }));
        
        set((state: any) => {
          const mergedContacts = newContacts.map(newContact => {
            const existingContact = state.contacts.find((c: Contact) => c.jid === newContact.jid);
            if (existingContact) {
              return {
                ...existingContact,
                name: newContact.name,
              };
            }
            return newContact;
          });
          
          const existingContactsNotInRoster = state.contacts.filter(
            (existingContact: Contact) => !newContacts.find(newContact => newContact.jid === existingContact.jid)
          );
          
          return {
            contacts: [...mergedContacts, ...existingContactsNotInRoster]
          };
        });
        
        const { client } = get();
        if (client) {
          newContacts.forEach(contact => {
            const presenceProbe = xml('presence', { to: contact.jid, type: 'probe' });
            client.send(presenceProbe);
          });
        }
        
        return;
      }
      
      // Handle room VCard response
      const vcard = stanza.getChild('vCard', 'vcard-temp');
      if (vcard) {
        const roomJid = stanza.attrs.from;
        const photo = vcard.getChild('PHOTO');
        let avatarUrl = null;
        
        if (photo) {
          const binval = photo.getChildText('BINVAL');
          const type = photo.getChildText('TYPE') || 'image/jpeg';
          if (binval) {
            avatarUrl = `data:${type};base64,${binval}`;
          }
        }
        
        set((state: any) => ({
          rooms: state.rooms.map((room: Room) => 
            room.jid === roomJid 
              ? { ...room, avatar: avatarUrl }
              : room
          )
        }));
        return;
      }
      
      // Handle disco#items response for MUC discovery
      const discoQuery = stanza.getChild('query', 'http://jabber.org/protocol/disco#items');
      if (discoQuery && stanza.attrs.from?.includes('conference')) {
        const items = discoQuery.getChildren('item');
        const rooms: Room[] = items.map((item: any) => ({
          jid: item.attrs.jid,
          name: item.attrs.name || item.attrs.jid.split('@')[0],
          participants: [],
          isOwner: false,
          isPermanent: true,
          affiliations: [],
          avatar: null
        }));
        
        set({ rooms });
        
        const { client } = get();
        if (client) {
          rooms.forEach(room => {
            get().fetchRoomVCard(room.jid);
          });
        }
        
        return;
      }
      
      // Handle room affiliations response
      const adminQuery = stanza.getChild('query', 'http://jabber.org/protocol/muc#admin');
      if (adminQuery) {
        const roomJid = stanza.attrs.from;
        const items = adminQuery.getChildren('item');
        const affiliations: RoomAffiliation[] = items.map((item: any) => ({
          jid: item.attrs.jid,
          name: item.attrs.jid?.split('@')[0] || 'Unknown',
          affiliation: item.attrs.affiliation || 'none',
          role: item.attrs.role || 'none'
        }));
        
        set((state: any) => ({
          rooms: state.rooms.map((room: Room) => 
            room.jid === roomJid 
              ? { ...room, affiliations }
              : room
          )
        }));
        return;
      }
    }

    // Handle messages
    if (stanza.is('message')) {
      const from = stanza.attrs.from;
      const to = stanza.attrs.to;
      const type = stanza.attrs.type || 'chat';
      const body = stanza.getChildText('body');
      const id = stanza.attrs.id || Date.now().toString();
      
      // Handle chat state notifications (XEP-0085)
      const composing = stanza.getChild('composing', 'http://jabber.org/protocol/chatstates');
      const active = stanza.getChild('active', 'http://jabber.org/protocol/chatstates');
      const paused = stanza.getChild('paused', 'http://jabber.org/protocol/chatstates');
      const inactive = stanza.getChild('inactive', 'http://jabber.org/protocol/chatstates');
      const gone = stanza.getChild('gone', 'http://jabber.org/protocol/chatstates');
      
      if (composing || paused) {
        const stateChatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
        const userJid = from;
        const state = composing ? 'composing' : 'paused';
        
        const { currentUser } = get();
        let isCurrentUser = false;
        
        if (type === 'groupchat') {
          const currentUserNickname = currentUser.split('@')[0];
          const fromNickname = from.split('/')[1];
          isCurrentUser = fromNickname === currentUserNickname;
        } else {
          isCurrentUser = from.split('/')[0] === currentUser.split('/')[0];
        }
        
        if (!isCurrentUser) {
          console.log(`Setting typing state for ${userJid} in ${stateChatJid}: ${state}`);
          get().setChatState(stateChatJid, userJid, state);
        }
        return;
      }
      
      if (active || inactive || gone) {
        const stateChatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
        const userJid = from;
        console.log(`Clearing typing state for ${userJid} in ${stateChatJid}`);
        get().clearTypingState(stateChatJid, userJid);
        return;
      }

      // Handle message receipts
      const receivedNode = stanza.getChild('received', 'urn:xmpp:receipts');
      const readNode = stanza.getChild('read', 'urn:xmpp:receipts');
      
      if (receivedNode) {
        const msgId = receivedNode.attrs.id;
        const fromJid = from.split('/')[0];
        
        set((state: any) => ({
          messages: {
            ...state.messages,
            [fromJid]: (state.messages[fromJid] || []).map((msg: Message) => 
              msg.id === msgId ? { ...msg, status: 'delivered' } : msg
            )
          }
        }));
        
        return;
      }
      
      if (readNode) {
        const msgId = readNode.attrs.id;
        const fromJid = from.split('/')[0];
        
        set((state: any) => ({
          messages: {
            ...state.messages,
            [fromJid]: (state.messages[fromJid] || []).map((msg: Message) => 
              msg.id === msgId ? { ...msg, status: 'read' } : msg
            )
          }
        }));
        
        return;
      }
      
      // Handle incoming message with body
      if (body) {
        const messageStateChatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
        const messageUserJid = from;
        get().clearTypingState(messageStateChatJid, messageUserJid);
        
        const { client } = get();
        if (client && stanza.getChild('request', 'urn:xmpp:receipts')) {
          const receipt = xml(
            'message',
            { to: from, id: `receipt-${id}` },
            xml('received', { xmlns: 'urn:xmpp:receipts', id })
          );
          client.send(receipt);
        }

        let fileData = null;
        const fileNode = stanza.getChild('file', 'urn:xmpp:file-transfer');
        if (fileNode) {
          fileData = {
            name: fileNode.attrs.name || 'file',
            type: fileNode.attrs.type || 'application/octet-stream',
            size: parseInt(fileNode.attrs.size) || 0,
            url: fileNode.attrs.url || ''
          };
        }
        
        const message: Message = {
          id,
          from,
          to,
          body,
          timestamp: new Date(),
          type: type as 'chat' | 'groupchat',
          status: 'delivered',
          fileData
        };
        
        const { currentUser, activeChat } = get();
        
        const isOwnMessage = type === 'groupchat' 
          ? from.includes(`/${currentUser.split('@')[0]}`)
          : from.split('/')[0] === currentUser;
        
        const messageChatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
        
        if (!isOwnMessage && messageChatJid !== activeChat) {
          const senderName = type === 'groupchat'
            ? from.split('/')[1] || from.split('@')[0]
            : from.split('@')[0];
          
          toast({
            title: "New Message",
            description: `${senderName}: ${body.length > 50 ? body.substring(0, 50) + '...' : body}`,
            duration: 4000,
            onClick: () => {
              get().setActiveChat(messageChatJid, type as 'chat' | 'groupchat');
            }
          });
        }
        
        set((state: any) => ({
          messages: {
            ...state.messages,
            [messageChatJid]: [...(state.messages[messageChatJid] || []), message]
          }
        }));
      }
      
      // Handle MUC (Multi-User Chat) presence updates
      const x = stanza.getChild('x', 'http://jabber.org/protocol/muc#user');
      if (x) {
        const item = x.getChild('item');
        if (item) {
          const roomJid = from.split('/')[0];
          const nick = from.split('/')[1];
          const affiliation = item.attrs.affiliation;
          const role = item.attrs.role;
          
          if (role === 'none') {
            set((state: any) => ({
              rooms: state.rooms.map((room: Room) => 
                room.jid === roomJid
                  ? { ...room, participants: room.participants.filter(p => !p.includes(nick)) }
                  : room
              )
            }));
          } else {
            set((state: any) => ({
              rooms: state.rooms.map((room: Room) => {
                if (room.jid === roomJid) {
                  const participant = `${nick}@${roomJid.split('@')[1]}`;
                  if (!room.participants.includes(participant)) {
                    return { 
                      ...room, 
                      participants: [...room.participants, participant],
                      isOwner: affiliation === 'owner' || room.isOwner
                    };
                  }
                }
                return room;
              })
            }));
          }
        }
      }
    }
    
    // Handle presence
    if (stanza.is('presence')) {
      const from = stanza.attrs.from;
      const type = stanza.attrs.type;
      const show = stanza.getChildText('show') || 'online';
      
      if (!type || type === 'available') {
        const presenceStatus = show === 'online' ? 'online' : show;
        set((state: any) => ({
          contacts: state.contacts.map((contact: Contact) => 
            contact.jid === from.split('/')[0] 
              ? { ...contact, presence: presenceStatus as any }
              : contact
          )
        }));
      } else if (type === 'unavailable') {
        set((state: any) => ({
          contacts: state.contacts.map((contact: Contact) => 
            contact.jid === from.split('/')[0] 
              ? { 
                  ...contact, 
                  presence: 'offline', 
                  lastSeen: contact.lastSeen ? contact.lastSeen : new Date()
                }
              : contact
          )
        }));
      }
    }
  }
});
