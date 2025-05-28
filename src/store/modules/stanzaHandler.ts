
import { xml } from '@xmpp/client';
import { Message, Contact, Room, RoomAffiliation } from '../types';

export const createStanzaHandler = (set: any, get: any) => ({
  handleStanza: (stanza: any) => {
    if (stanza.is('message')) {
      handleMessageStanza(stanza, set, get);
    } else if (stanza.is('presence')) {
      handlePresenceStanza(stanza, set, get);
    } else if (stanza.is('iq')) {
      handleIqStanza(stanza, set, get);
    }
  }
});

const handleMessageStanza = (stanza: any, set: any, get: any) => {
  const { currentUser, markMessageAsDelivered, setChatState, clearTypingState } = get();
  const from = stanza.attrs.from;
  const to = stanza.attrs.to;
  const type = stanza.attrs.type || 'chat';
  const id = stanza.attrs.id;
  const body = stanza.getChildText('body');

  // Handle chat state notifications
  const chatStates = ['active', 'composing', 'paused', 'inactive', 'gone'];
  for (const state of chatStates) {
    if (stanza.getChild(state, 'http://jabber.org/protocol/chatstates')) {
      const chatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
      const userJid = type === 'groupchat' ? from : from.split('/')[0];
      
      if (state === 'composing') {
        setChatState(chatJid, userJid, 'composing');
      } else if (state === 'paused') {
        setChatState(chatJid, userJid, 'paused');
      } else {
        clearTypingState(chatJid, userJid);
      }
      
      if (!body) return; // Pure chat state, no message content
    }
  }

  // Handle message receipts
  if (stanza.getChild('received', 'urn:xmpp:receipts')) {
    const messageId = stanza.getChild('received', 'urn:xmpp:receipts').attrs.id;
    const fromJid = from.split('/')[0];
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [fromJid]: (state.messages[fromJid] || []).map((msg: Message) => 
          msg.id === messageId ? { ...msg, status: 'delivered' } : msg
        )
      }
    }));
    return;
  }

  if (stanza.getChild('read', 'urn:xmpp:receipts')) {
    const messageId = stanza.getChild('read', 'urn:xmpp:receipts').attrs.id;
    const fromJid = from.split('/')[0];
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [fromJid]: (state.messages[fromJid] || []).map((msg: Message) => 
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        )
      }
    }));
    return;
  }

  // Handle regular messages
  if (body && from !== currentUser) {
    const fileElement = stanza.getChild('file', 'urn:xmpp:file-transfer');
    let fileData = null;
    
    if (fileElement) {
      fileData = {
        name: fileElement.attrs.name,
        type: fileElement.attrs.type,
        size: parseInt(fileElement.attrs.size),
        url: fileElement.attrs.url
      };
    }

    const message: Message = {
      id: id || `msg-${Date.now()}`,
      from,
      to,
      body,
      timestamp: new Date(),
      type: type as 'chat' | 'groupchat',
      fileData
    };

    const chatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [chatJid]: [...(state.messages[chatJid] || []), message]
      }
    }));

    // Send delivery receipt
    if (id && stanza.getChild('request', 'urn:xmpp:receipts')) {
      markMessageAsDelivered(from, id);
    }

    // Clear typing state for sender
    clearTypingState(chatJid, from);
  }
};

const handlePresenceStanza = (stanza: any, set: any, get: any) => {
  const from = stanza.attrs.from;
  const type = stanza.attrs.type;
  
  if (from.includes('conference.')) {
    // Handle MUC presence
    const roomJid = from.split('/')[0];
    const nickname = from.split('/')[1];
    
    if (type === 'unavailable') {
      // User left the room
      set((state: any) => ({
        rooms: state.rooms.map((room: Room) => {
          if (room.jid === roomJid) {
            return {
              ...room,
              participants: room.participants.filter(p => 
                typeof p === 'string' ? !p.includes(nickname) : p.jid !== from
              )
            };
          }
          return room;
        })
      }));
    } else {
      // User joined or updated presence
      set((state: any) => ({
        rooms: state.rooms.map((room: Room) => {
          if (room.jid === roomJid) {
            const existingParticipant = room.participants.find(p => 
              typeof p === 'string' ? p.includes(nickname) : p.jid === from
            );
            
            if (!existingParticipant) {
              return {
                ...room,
                participants: [...room.participants, from]
              };
            }
          }
          return room;
        })
      }));
    }
  } else {
    // Handle regular contact presence
    const jid = from.split('/')[0];
    const show = stanza.getChildText('show') || 'online';
    const presence = type === 'unavailable' ? 'offline' : show;
    
    set((state: any) => ({
      contacts: state.contacts.map((contact: Contact) => {
        if (contact.jid === jid) {
          return {
            ...contact,
            presence: presence as Contact['presence'],
            lastSeen: presence === 'offline' ? new Date() : contact.lastSeen
          };
        }
        return contact;
      })
    }));
  }
};

const handleIqStanza = (stanza: any, set: any, get: any) => {
  const type = stanza.attrs.type;
  const id = stanza.attrs.id;
  
  // Handle roster (contact list)
  if (stanza.getChild('query', 'jabber:iq:roster') && type === 'result') {
    const query = stanza.getChild('query', 'jabber:iq:roster');
    const items = query.getChildren('item');
    
    const contacts: Contact[] = items.map((item: any) => ({
      jid: item.attrs.jid,
      name: item.attrs.name || item.attrs.jid.split('@')[0],
      presence: 'offline' as Contact['presence']
    }));
    
    set({ contacts });
  }
  
  // Handle room discovery
  if (stanza.getChild('query', 'http://jabber.org/protocol/disco#items') && type === 'result') {
    const query = stanza.getChild('query', 'http://jabber.org/protocol/disco#items');
    const items = query.getChildren('item');
    
    const rooms: Room[] = items.map((item: any) => ({
      jid: item.attrs.jid,
      name: item.attrs.name || item.attrs.jid.split('@')[0],
      participants: [],
      isOwner: false
    }));
    
    if (rooms.length > 0) {
      set((state: any) => ({
        rooms: [...state.rooms, ...rooms.filter(room => 
          !state.rooms.find((r: Room) => r.jid === room.jid)
        )]
      }));
    }
  }

  // Handle room affiliations response
  if (stanza.getChild('query', 'http://jabber.org/protocol/muc#admin') && type === 'result') {
    const query = stanza.getChild('query', 'http://jabber.org/protocol/muc#admin');
    const items = query.getChildren('item');
    const roomJid = stanza.attrs.from;
    
    const affiliations: RoomAffiliation[] = items.map((item: any) => ({
      jid: item.attrs.jid,
      name: item.attrs.jid?.split('@')[0] || 'Unknown',
      affiliation: item.attrs.affiliation,
      role: item.attrs.role
    }));
    
    set((state: any) => ({
      rooms: state.rooms.map((room: Room) => 
        room.jid === roomJid ? { ...room, affiliations } : room
      )
    }));
  }
};
