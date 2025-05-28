import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { client, xml } from '@xmpp/client';
import { toast } from '@/hooks/use-toast';

interface MessageReaction {
  emoji: string;
  users: string[];
}

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  type: 'chat' | 'groupchat';
  status?: 'sent' | 'delivered' | 'read';
  reactions?: MessageReaction[];
  fileData?: {
    name: string;
    type: string;
    size: number;
    url: string;
  };
}

interface Contact {
  jid: string;
  name: string;
  presence: 'online' | 'offline' | 'away' | 'dnd' | 'xa';
  avatar?: string;
  lastSeen?: Date;
}

export interface RoomAffiliation {
  jid: string;
  name: string;
  affiliation: 'owner' | 'admin' | 'member' | 'none';
  role: 'moderator' | 'participant' | 'visitor' | 'none';
}

export interface Room {
  jid: string;
  name: string;
  description?: string;
  participants: string[];
  isOwner?: boolean;
  isPermanent?: boolean;
  affiliations?: RoomAffiliation[];
  avatar?: string;
}

interface TypingState {
  user: string;
  chatJid: string;
  timestamp: Date;
  state: 'composing' | 'paused';
}

interface XMPPState {
  client: any;
  isConnected: boolean;
  currentUser: string;
  contacts: Contact[];
  rooms: Room[];
  messages: Record<string, Message[]>;
  activeChat: string | null;
  activeChatType: 'chat' | 'groupchat' | null;
  userStatus: 'online' | 'away' | 'dnd' | 'xa';
  userAvatar: string | null;
  contactSortMethod: 'newest' | 'alphabetical';
  roomSortMethod: 'newest' | 'alphabetical';
  typingStates: Record<string, TypingState[]>;
  currentUserTyping: Record<string, boolean>;
  
  // Actions
  connect: (username: string, password: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (to: string, body: string, type: 'chat' | 'groupchat') => void;
  sendFileMessage: (to: string, fileData: any, type: 'chat' | 'groupchat') => void;
  deleteMessage: (chatJid: string, messageId: string) => void;
  addContact: (jid: string) => void;
  createRoom: (roomName: string, description?: string, isPermanent?: boolean, privacyOptions?: any) => void;
  updateRoomDescription: (roomJid: string, description: string) => void;
  deleteRoom: (roomJid: string) => void;
  joinRoom: (roomJid: string) => void;
  inviteToRoom: (roomJid: string, userJid: string) => void;
  kickFromRoom: (roomJid: string, userJid: string) => void;
  setActiveChat: (jid: string, type: 'chat' | 'groupchat') => void;
  setUserStatus: (status: 'online' | 'away' | 'dnd' | 'xa') => void;
  setUserAvatar: (avatarUrl: string) => void;
  setRoomAvatar: (roomJid: string, avatarUrl: string) => void;
  markMessageAsDelivered: (from: string, id: string) => void;
  markMessageAsRead: (from: string, id: string) => void;
  fetchServerUsers: () => Promise<{ jid: string; name: string; }[]>;
  handleStanza: (stanza: any) => void;
  addReaction: (chatJid: string, messageId: string, emoji: string) => void;
  fetchRoomAffiliations: (roomJid: string) => void;
  setRoomAffiliation: (roomJid: string, userJid: string, affiliation: 'owner' | 'admin' | 'member' | 'none') => void;
  fetchRoomVCard: (roomJid: string) => void;
  setContactSortMethod: (method: 'newest' | 'alphabetical') => void;
  setRoomSortMethod: (method: 'newest' | 'alphabetical') => void;
  sendChatState: (to: string, state: 'composing' | 'active' | 'paused' | 'inactive' | 'gone', type: 'chat' | 'groupchat') => void;
  setChatState: (chatJid: string, userJid: string, state: 'composing' | 'paused') => void;
  clearTypingState: (chatJid: string, userJid?: string) => void;
  setCurrentUserTyping: (chatJid: string, isTyping: boolean) => void;
}

export const useXMPPStore = create<XMPPState>()(
  persist(
    (set, get) => ({
      client: null,
      isConnected: false,
      currentUser: '',
      contacts: [],
      rooms: [],
      messages: {},
      activeChat: null,
      activeChatType: null,
      userStatus: 'online',
      userAvatar: null,
      contactSortMethod: 'newest',
      roomSortMethod: 'newest',
      typingStates: {},
      currentUserTyping: {},
      
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
                
                // Parse timestamp from delay element or use current time
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
                
                set((state) => {
                  const existingMessages = state.messages[archiveChatJid] || [];
                  // Only add if message doesn't already exist
                  const messageExists = existingMessages.find(msg => msg.id === id);
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
            
            set((state) => {
              // Merge with existing contacts to preserve lastSeen data
              const mergedContacts = newContacts.map(newContact => {
                const existingContact = state.contacts.find(c => c.jid === newContact.jid);
                if (existingContact) {
                  // Preserve existing lastSeen and other data, but update name if needed
                  return {
                    ...existingContact,
                    name: newContact.name, // Update name in case it changed
                  };
                }
                return newContact;
              });
              
              // Add any existing contacts that weren't in the roster
              const existingContactsNotInRoster = state.contacts.filter(
                existingContact => !newContacts.find(newContact => newContact.jid === existingContact.jid)
              );
              
              return {
                contacts: [...mergedContacts, ...existingContactsNotInRoster]
              };
            });
            
            // Request presence for all contacts
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
            
            set((state) => ({
              rooms: state.rooms.map(room => 
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
            
            // Fetch VCard for each room
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
            
            set((state) => ({
              rooms: state.rooms.map(room => 
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
            // For MUC rooms: chatJid is room JID, userJid is full JID with nickname
            // For direct chat: chatJid is user JID, userJid is user JID
            const stateChatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
            const userJid = from; // Keep full JID to preserve nickname for MUC
            const state = composing ? 'composing' : 'paused';
            
            // Don't show typing for current user
            const { currentUser } = get();
            const isCurrentUser = type === 'groupchat' 
              ? from.includes(`/${currentUser.split('@')[0]}`)
              : from.split('/')[0] === currentUser;
            
            if (!isCurrentUser) {
              get().setChatState(stateChatJid, userJid, state);
            }
            return;
          }
          
          if (active || inactive || gone) {
            const stateChatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
            const userJid = from;
            get().clearTypingState(stateChatJid, userJid);
            return;
          }

          // Handle message receipts
          const receivedNode = stanza.getChild('received', 'urn:xmpp:receipts');
          const readNode = stanza.getChild('read', 'urn:xmpp:receipts');
          
          if (receivedNode) {
            const msgId = receivedNode.attrs.id;
            const fromJid = from.split('/')[0];
            
            set((state) => ({
              messages: {
                ...state.messages,
                [fromJid]: (state.messages[fromJid] || []).map(msg => 
                  msg.id === msgId ? { ...msg, status: 'delivered' } : msg
                )
              }
            }));
            
            return;
          }
          
          if (readNode) {
            const msgId = readNode.attrs.id;
            const fromJid = from.split('/')[0];
            
            set((state) => ({
              messages: {
                ...state.messages,
                [fromJid]: (state.messages[fromJid] || []).map(msg => 
                  msg.id === msgId ? { ...msg, status: 'read' } : msg
                )
              }
            }));
            
            return;
          }
          
          // Handle incoming message with body
          if (body) {
            // Clear typing state when message is received
            const messageStateChatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
            const messageUserJid = from;
            get().clearTypingState(messageStateChatJid, messageUserJid);
            
            // Send receipt for received message
            const { client } = get();
            if (client && stanza.getChild('request', 'urn:xmpp:receipts')) {
              const receipt = xml(
                'message',
                { to: from, id: `receipt-${id}` },
                xml('received', { xmlns: 'urn:xmpp:receipts', id })
              );
              client.send(receipt);
            }

            // Handle file data from XMPP message
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
            
            // Show toast notification for new messages (except from current user)
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
            
            set((state) => ({
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
              
              // Handle user joining or leaving room
              if (role === 'none') {
                // User left or was removed
                set((state) => ({
                  rooms: state.rooms.map(room => 
                    room.jid === roomJid
                      ? { ...room, participants: room.participants.filter(p => !p.includes(nick)) }
                      : room
                  )
                }));
              } else {
                // User joined
                set((state) => ({
                  rooms: state.rooms.map(room => {
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
            set((state) => ({
              contacts: state.contacts.map(contact => 
                contact.jid === from.split('/')[0] 
                  ? { ...contact, presence: presenceStatus as any }
                  : contact
              )
            }));
          } else if (type === 'unavailable') {
            set((state) => ({
              contacts: state.contacts.map(contact => 
                contact.jid === from.split('/')[0] 
                  ? { 
                      ...contact, 
                      presence: 'offline', 
                      // Only update lastSeen if it's not already set or if this is more recent
                      lastSeen: contact.lastSeen ? contact.lastSeen : new Date()
                    }
                  : contact
              )
            }));
          }
        }
      },
      
      connect: async (username: string, password: string) => {
        try {
          const xmppClient = client({
            service: 'wss://ejabberd.voicehost.io:443/websocket',
            domain: 'ejabberd.voicehost.io',
            username: username,
            password: password,
          });

          xmppClient.on('error', (err: any) => {
            console.error('XMPP Error:', err);
          });

          xmppClient.on('offline', () => {
            set({ isConnected: false });
          });

          xmppClient.on('online', (address: any) => {
            console.log('Connected as:', address.toString());
            set({ 
              isConnected: true, 
              currentUser: address.toString(),
              client: xmppClient 
            });
            
            // Send initial presence
            xmppClient.send(xml('presence'));
            
            // Request MAM archive to retrieve all messages
            const mamQuery = xml(
              'iq',
              { type: 'set', id: 'mam1' },
              xml('query', { xmlns: 'urn:xmpp:mam:2' })
            );
            xmppClient.send(mamQuery);
            
            // Fetch roster (contact list)
            const rosterIq = xml(
              'iq',
              { type: 'get', id: 'roster-1' },
              xml('query', { xmlns: 'jabber:iq:roster' })
            );
            xmppClient.send(rosterIq);
            
            // Discover MUC rooms on the conference server
            const discoIq = xml(
              'iq',
              { type: 'get', to: 'conference.ejabberd.voicehost.io', id: 'disco-rooms' },
              xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' })
            );
            xmppClient.send(discoIq);
          });

          xmppClient.on('stanza', (stanza: any) => {
            const { handleStanza } = get();
            handleStanza(stanza);
          });

          await xmppClient.start();
        } catch (error) {
          console.error('Connection failed:', error);
          throw error;
        }
      },
      
      disconnect: () => {
        const { client } = get();
        if (client) {
          client.stop();
        }
        set({ 
          isConnected: false, 
          client: null, 
          currentUser: '',
          activeChat: null,
          activeChatType: null,
          typingStates: {},
          currentUserTyping: {}
        });
      },
      
      sendMessage: (to: string, body: string, type: 'chat' | 'groupchat') => {
        const { client, currentUser } = get();
        if (!client || !body.trim()) return;

        const messageId = `msg-${Date.now()}`;
        const message = xml(
          'message',
          { to, type, id: messageId },
          xml('body', {}, body.trim()),
          xml('request', { xmlns: 'urn:xmpp:receipts' }), // Add XEP-0184 request
          xml('active', { xmlns: 'http://jabber.org/protocol/chatstates' }) // Send active state
        );

        client.send(message);

        // Clear typing state for current user
        const sendChatJid = type === 'groupchat' ? to : to.split('/')[0];
        get().setCurrentUserTyping(sendChatJid, false);

        // Add to local messages
        const newMessage: Message = {
          id: messageId,
          from: currentUser,
          to,
          body: body.trim(),
          timestamp: new Date(), // Always create new Date object
          type,
          status: 'sent'
        };

        set((state) => ({
          messages: {
            ...state.messages,
            [sendChatJid]: [...(state.messages[sendChatJid] || []), newMessage]
          }
        }));
      },
      
      sendFileMessage: (to: string, fileData: any, type: 'chat' | 'groupchat') => {
        const { client, currentUser } = get();
        if (!client) return;

        const messageId = `msg-${Date.now()}`;
        
        // For XMPP file transfer, we would normally use XEP-0096 (SI File Transfer)
        // For this demo, we'll send as a message with file info
        const message = xml(
          'message',
          { to, type, id: messageId },
          xml('body', {}, `Shared ${fileData.type.startsWith('image/') ? 'an image' : 'a file'}: ${fileData.name}`),
          xml('file', { 
            xmlns: 'urn:xmpp:file-transfer',
            name: fileData.name,
            type: fileData.type,
            size: fileData.size.toString(),
            url: fileData.url
          })
        );

        client.send(message);

        // Add to local messages
        const newMessage: Message = {
          id: messageId,
          from: currentUser,
          to,
          body: `Shared ${fileData.type.startsWith('image/') ? 'an image' : 'a file'}: ${fileData.name}`,
          timestamp: new Date(), // Always create new Date object
          type,
          status: 'sent',
          fileData
        };

        const fileChatJid = type === 'groupchat' ? to : to.split('/')[0];
        
        set((state) => ({
          messages: {
            ...state.messages,
            [fileChatJid]: [...(state.messages[fileChatJid] || []), newMessage]
          }
        }));
      },
      
      // Delete a message (only works for your own messages)
      deleteMessage: (chatJid: string, messageId: string) => {
        const { messages, currentUser, client, activeChatType } = get();
        const chatMessages = messages[chatJid] || [];
        const messageIndex = chatMessages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex === -1) return;
        
        const message = chatMessages[messageIndex];
        
        // Only allow deletion of own messages
        if (message.from !== currentUser && !message.from.includes(currentUser.split('@')[0])) {
          console.log('Cannot delete messages from other users');
          return;
        }
        
        // For MUC, send retraction message
        if (activeChatType === 'groupchat' && client) {
          const retraction = xml(
            'message',
            { to: chatJid, type: 'groupchat' },
            xml('apply-to', { xmlns: 'urn:xmpp:fasten:0', id: messageId },
              xml('retract', { xmlns: 'urn:xmpp:message-retract:0' })
            )
          );
          client.send(retraction);
        }
        
        // Remove message locally
        set((state) => ({
          messages: {
            ...state.messages,
            [chatJid]: state.messages[chatJid].filter(msg => msg.id !== messageId)
          }
        }));
      },
      
      addContact: (jid: string) => {
        const { client, contacts } = get();
        if (!client || contacts.find(c => c.jid === jid)) return;

        // Send subscription request
        const presence = xml('presence', { to: jid, type: 'subscribe' });
        client.send(presence);

        // Add to contacts list
        set((state) => ({
          contacts: [...state.contacts, { jid, name: jid.split('@')[0], presence: 'offline', avatar: null, lastSeen: new Date() }]
        }));
      },
      
      createRoom: (roomName: string, description?: string, isPermanent: boolean = false, privacyOptions?: any) => {
        const { client, currentUser } = get();
        if (!client) return;

        const roomJid = `${roomName}@conference.ejabberd.voicehost.io`;
        const nickname = currentUser.split('@')[0];
        
        // Join the room first
        const presence = xml('presence', { to: `${roomJid}/${nickname}` });
        client.send(presence);

        // Configure the room with privacy options
        if (isPermanent || privacyOptions) {
          setTimeout(() => {
            const configFields = [
              xml('field', { var: 'FORM_TYPE' },
                xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig')
              )
            ];

            // Add permanent room setting if needed
            if (isPermanent) {
              configFields.push(
                xml('field', { var: 'muc#roomconfig_persistentroom' },
                  xml('value', {}, '1')
                )
              );
            }

            // Add privacy settings if provided
            if (privacyOptions) {
              if (privacyOptions.members_only !== undefined) {
                configFields.push(
                  xml('field', { var: 'muc#roomconfig_membersonly' },
                    xml('value', {}, privacyOptions.members_only ? '1' : '0')
                  )
                );
              }
              if (privacyOptions.public_list !== undefined) {
                configFields.push(
                  xml('field', { var: 'muc#roomconfig_publicroom' },
                    xml('value', {}, privacyOptions.public_list ? '1' : '0')
                  )
                );
              }
              if (privacyOptions.public !== undefined) {
                configFields.push(
                  xml('field', { var: 'muc#roomconfig_publicroom' },
                    xml('value', {}, privacyOptions.public ? '1' : '0')
                  )
                );
              }
            }

            const configForm = xml(
              'iq',
              { type: 'set', to: roomJid, id: `config-${Date.now()}` },
              xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
                xml('x', { xmlns: 'jabber:x:data', type: 'submit' }, ...configFields)
              )
            );
            client.send(configForm);
          }, 1000);
        }

        set((state) => ({
          rooms: [...state.rooms, { 
            jid: roomJid, 
            name: roomName,
            description: description || '',
            participants: [],
            isOwner: true, // Set creator as owner by default
            isPermanent,
            affiliations: [],
            avatar: null
          }]
        }));

        // Fetch room VCard
        setTimeout(() => {
          get().fetchRoomVCard(roomJid);
        }, 2000);
      },
      
      updateRoomDescription: (roomJid: string, description: string) => {
        set((state) => ({
          rooms: state.rooms.map(room => 
            room.jid === roomJid 
              ? { ...room, description }
              : room
          )
        }));
      },
      
      deleteRoom: (roomJid: string) => {
        const { client, rooms } = get();
        if (!client) return;

        const room = rooms.find(r => r.jid === roomJid);
        if (!room || !room.isOwner) {
          console.log('Only room owners can delete rooms');
          return;
        }

        // Send destroy room command
        const destroyIq = xml(
          'iq',
          { type: 'set', to: roomJid, id: `destroy-${Date.now()}` },
          xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
            xml('destroy', { jid: roomJid },
              xml('reason', {}, 'Room deleted by owner')
            )
          )
        );
        
        client.send(destroyIq);

        // Remove room from local state
        set((state) => ({
          rooms: state.rooms.filter(r => r.jid !== roomJid),
          messages: Object.fromEntries(
            Object.entries(state.messages).filter(([key]) => key !== roomJid)
          ),
          activeChat: state.activeChat === roomJid ? null : state.activeChat,
          activeChatType: state.activeChat === roomJid ? null : state.activeChatType
        }));
      },
      
      joinRoom: (roomJid: string) => {
        const { client, currentUser, rooms } = get();
        if (!client || rooms.find(r => r.jid === roomJid)) return;

        const nickname = currentUser.split('@')[0];
        const presence = xml('presence', { to: `${roomJid}/${nickname}` });
        client.send(presence);

        set((state) => ({
          rooms: [...state.rooms, { jid: roomJid, name: roomJid.split('@')[0], participants: [], affiliations: [], avatar: null }]
        }));

        // Fetch room VCard
        setTimeout(() => {
          get().fetchRoomVCard(roomJid);
        }, 1000);
      },
      
      // Invite a user to a group chat
      inviteToRoom: (roomJid: string, userJid: string) => {
        const { client, currentUser } = get();
        if (!client) return;
        
        // Send direct invitation (XEP-0249)
        const message = xml(
          'message',
          { to: userJid },
          xml('x', { xmlns: 'jabber:x:conference', jid: roomJid })
        );
        
        client.send(message);
        
        // Add message to conversation
        const systemMessage: Message = {
          id: `invite-${Date.now()}`,
          from: currentUser,
          to: roomJid,
          body: `Invited ${userJid.split('@')[0]} to the room`,
          timestamp: new Date(),
          type: 'groupchat',
          status: 'sent'
        };
        
        set((state) => ({
          messages: {
            ...state.messages,
            [roomJid]: [...(state.messages[roomJid] || []), systemMessage]
          }
        }));
      },
      
      // Kick a user from a group chat (requires admin/owner privileges)
      kickFromRoom: (roomJid: string, userJid: string) => {
        const { client, currentUser, rooms } = get();
        if (!client) return;
        
        const room = rooms.find(r => r.jid === roomJid);
        if (!room || !room.isOwner) {
          console.log('You need to be room owner to kick users');
          return;
        }
        
        const nickname = userJid.split('@')[0];
        
        // Send IQ to kick the user
        const iq = xml(
          'iq',
          { to: roomJid, type: 'set', id: `kick-${Date.now()}` },
          xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
            xml('item', { nick: nickname, role: 'none' },
              xml('reason', {}, 'Kicked by room admin')
            )
          )
        );
        
        client.send(iq);
        
        // Add message to conversation
        const systemMessage: Message = {
          id: `kick-${Date.now()}`,
          from: currentUser,
          to: roomJid,
          body: `Kicked ${nickname} from the room`,
          timestamp: new Date(),
          type: 'groupchat',
          status: 'sent'
        };
        
        set((state) => ({
          messages: {
            ...state.messages,
            [roomJid]: [...(state.messages[roomJid] || []), systemMessage]
          },
          rooms: state.rooms.map(r => 
            r.jid === roomJid 
              ? { ...r, participants: r.participants.filter(p => !p.includes(nickname)) }
              : r
          )
        }));
      },
      
      setActiveChat: (jid: string, type: 'chat' | 'groupchat') => {
        set({ activeChat: jid, activeChatType: type });
        
        // Mark all messages in this chat as read
        const { messages } = get();
        const chatMessages = messages[jid] || [];
        
        if (chatMessages.length > 0) {
          set((state) => ({
            messages: {
              ...state.messages,
              [jid]: state.messages[jid].map(msg => 
                msg.from !== state.currentUser ? { ...msg, status: 'read' } : msg
              )
            }
          }));
          
          // Send read receipts for messages
          const { client } = get();
          if (client && type === 'chat') {
            chatMessages.forEach(msg => {
              if (msg.from !== get().currentUser && msg.id) {
                const receipt = xml(
                  'message',
                  { to: msg.from, id: `read-${msg.id}` },
                  xml('read', { xmlns: 'urn:xmpp:receipts', id: msg.id })
                );
                client.send(receipt);
              }
            });
          }
        }
      },
      
      // Set user status (online, away, dnd, xa)
      setUserStatus: (status: 'online' | 'away' | 'dnd' | 'xa') => {
        const { client } = get();
        if (!client) return;
        
        let presenceStanza;
        
        if (status === 'online') {
          presenceStanza = xml('presence');
        } else {
          presenceStanza = xml(
            'presence',
            {},
            xml('show', {}, status)
          );
        }
        
        client.send(presenceStanza);
        
        set({ userStatus: status });
      },
      
      // Set user avatar
      setUserAvatar: (avatarUrl: string) => {
        const { client } = get();
        if (!client) return;
        
        // Store avatar URL in local state
        set({ userAvatar: avatarUrl });
        
        // Publish avatar update in presence
        const presence = xml(
          'presence',
          {},
          xml('x', { xmlns: 'vcard-temp:x:update' },
            xml('photo', {}, avatarUrl)
          )
        );
        
        client.send(presence);
      },

      // Set room avatar
      setRoomAvatar: (roomJid: string, avatarUrl: string) => {
        const { client } = get();
        if (!client) return;

        // Convert URL to base64 if it's a data URL
        let base64Data = '';
        let mimeType = 'image/jpeg';
        
        if (avatarUrl.startsWith('data:')) {
          const parts = avatarUrl.split(',');
          if (parts.length === 2) {
            const header = parts[0];
            base64Data = parts[1];
            const mimeMatch = header.match(/data:([^;]+)/);
            if (mimeMatch) {
              mimeType = mimeMatch[1];
            }
          }
        } else {
          // For external URLs, we'll store the URL directly for now
          // In a real implementation, you'd fetch and convert to base64
          base64Data = avatarUrl;
        }

        // Send VCard update
        const vcardIq = xml(
          'iq',
          { type: 'set', to: roomJid, id: `vcard-${Date.now()}` },
          xml('vCard', { xmlns: 'vcard-temp' },
            xml('PHOTO',
              xml('TYPE', {}, mimeType),
              xml('BINVAL', {}, base64Data)
            )
          )
        );

        client.send(vcardIq);

        // Update local state
        set((state) => ({
          rooms: state.rooms.map(room => 
            room.jid === roomJid 
              ? { ...room, avatar: avatarUrl }
              : room
          )
        }));
      },

      // Fetch room VCard
      fetchRoomVCard: (roomJid: string) => {
        const { client } = get();
        if (!client) return;

        const vcardIq = xml(
          'iq',
          { type: 'get', to: roomJid, id: `vcard-get-${Date.now()}` },
          xml('vCard', { xmlns: 'vcard-temp' })
        );

        client.send(vcardIq);
      },
      
      // Mark message as delivered
      markMessageAsDelivered: (from: string, id: string) => {
        const { client } = get();
        if (!client || !id) return;
        
        const receipt = xml(
          'message',
          { to: from, id: `receipt-${id}` },
          xml('received', { xmlns: 'urn:xmpp:receipts', id })
        );
        
        client.send(receipt);
      },
      
      // Mark message as read
      markMessageAsRead: (from: string, id: string) => {
        const { client } = get();
        if (!client || !id) return;
        
        const receipt = xml(
          'message',
          { to: from, id: `read-${id}` },
          xml('read', { xmlns: 'urn:xmpp:receipts', id })
        );
        
        client.send(receipt);
        
        // Update local message status
        const fromJid = from.split('/')[0];
        
        set((state) => ({
          messages: {
            ...state.messages,
            [fromJid]: (state.messages[fromJid] || []).map(msg => 
              msg.id === id ? { ...msg, status: 'read' } : msg
            )
          }
        }));
      },
      
      // Fetch all users from the server
      fetchServerUsers: async () => {
        const { client } = get();
        if (!client) {
          throw new Error('Not connected to server');
        }

        return new Promise((resolve, reject) => {
          const queryId = `users-${Date.now()}`;
          
          // Send IQ query to get all users (this is a simplified implementation)
          // In a real scenario, you might need to query specific components or use different methods
          const iq = xml(
            'iq',
            { type: 'get', to: 'ejabberd.voicehost.io', id: queryId },
            xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' })
          );

          // Set up a temporary listener for the response
          const handleResponse = (stanza: any) => {
            if (stanza.is('iq') && stanza.attrs.id === queryId) {
              client.off('stanza', handleResponse);
              
              if (stanza.attrs.type === 'result') {
                const query = stanza.getChild('query');
                const users: { jid: string; name: string; }[] = [];
                
                if (query) {
                  const items = query.getChildren('item');
                  items.forEach((item: any) => {
                    const jid = item.attrs.jid;
                    if (jid && jid.includes('@ejabberd.voicehost.io') && !jid.includes('conference')) {
                      users.push({
                        jid: jid,
                        name: jid.split('@')[0]
                      });
                    }
                  });
                }
                
                resolve(users);
              } else {
                // If disco#items doesn't work, return a mock list for demonstration
                // In production, you'd implement proper user discovery
                const mockUsers = [
                  { jid: 'user1@ejabberd.voicehost.io', name: 'user1' },
                  { jid: 'user2@ejabberd.voicehost.io', name: 'user2' },
                  { jid: 'user3@ejabberd.voicehost.io', name: 'user3' },
                  { jid: 'demo@ejabberd.voicehost.io', name: 'demo' },
                  { jid: 'test@ejabberd.voicehost.io', name: 'test' },
                  { jid: 'admin@ejabberd.voicehost.io', name: 'admin' },
                  { jid: 'support@ejabberd.voicehost.io', name: 'support' },
                  { jid: 'guest@ejabberd.voicehost.io', name: 'guest' }
                ];
                
                // Filter out current user
                const currentUser = get().currentUser;
                const filteredUsers = mockUsers.filter(user => user.jid !== currentUser);
                
                resolve(filteredUsers);
              }
            }
          };

          client.on('stanza', handleResponse);
          
          // Send the query
          client.send(iq);
          
          // Set a timeout in case no response
          setTimeout(() => {
            client.off('stanza', handleResponse);
            // Return mock users as fallback
            const mockUsers = [
              { jid: 'user1@ejabberd.voicehost.io', name: 'user1' },
              { jid: 'user2@ejabberd.voicehost.io', name: 'user2' },
              { jid: 'user3@ejabberd.voicehost.io', name: 'user3' },
              { jid: 'demo@ejabberd.voicehost.io', name: 'demo' },
              { jid: 'test@ejabberd.voicehost.io', name: 'test' },
              { jid: 'admin@ejabberd.voicehost.io', name: 'admin' },
              { jid: 'support@ejabberd.voicehost.io', name: 'support' },
              { jid: 'guest@ejabberd.voicehost.io', name: 'guest' }
            ];
            
            const currentUser = get().currentUser;
            const filteredUsers = mockUsers.filter(user => user.jid !== currentUser);
            
            resolve(filteredUsers);
          }, 5000);
        });
      },
      
      addReaction: (chatJid: string, messageId: string, emoji: string) => {
        const { currentUser } = get();
        
        set((state) => {
          const chatMessages = state.messages[chatJid] || [];
          const updatedMessages = chatMessages.map(msg => {
            if (msg.id === messageId) {
              const reactions = msg.reactions || [];
              const existingReaction = reactions.find(r => r.emoji === emoji);
              
              if (existingReaction) {
                // Toggle reaction - remove if user already reacted, add if not
                if (existingReaction.users.includes(currentUser)) {
                  existingReaction.users = existingReaction.users.filter(u => u !== currentUser);
                  if (existingReaction.users.length === 0) {
                    return {
                      ...msg,
                      reactions: reactions.filter(r => r.emoji !== emoji)
                    };
                  }
                } else {
                  existingReaction.users.push(currentUser);
                }
                return { ...msg, reactions };
              } else {
                // Add new reaction
                return {
                  ...msg,
                  reactions: [...reactions, { emoji, users: [currentUser] }]
                };
              }
            }
            return msg;
          });
          
          return {
            messages: {
              ...state.messages,
              [chatJid]: updatedMessages
            }
          };
        });
      },

      fetchRoomAffiliations: (roomJid: string) => {
        const { client } = get();
        if (!client) return;

        const iq = xml(
          'iq',
          { type: 'get', to: roomJid, id: `affiliations-${Date.now()}` },
          xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
            xml('item', { affiliation: 'owner' }),
            xml('item', { affiliation: 'admin' }),
            xml('item', { affiliation: 'member' })
          )
        );

        client.send(iq);
      },

      setRoomAffiliation: (roomJid: string, userJid: string, affiliation: 'owner' | 'admin' | 'member' | 'none') => {
        const { client, currentUser } = get();
        if (!client) return;

        const iq = xml(
          'iq',
          { type: 'set', to: roomJid, id: `set-affiliation-${Date.now()}` },
          xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
            xml('item', { jid: userJid, affiliation })
          )
        );

        client.send(iq);

        // Update local state
        set((state) => ({
          rooms: state.rooms.map(room => {
            if (room.jid === roomJid && room.affiliations) {
              const updatedAffiliations = room.affiliations.map(aff => 
                aff.jid === userJid ? { ...aff, affiliation } : aff
              );
              
              // If user not in affiliations list, add them
              if (!room.affiliations.find(aff => aff.jid === userJid)) {
                updatedAffiliations.push({
                  jid: userJid,
                  name: userJid.split('@')[0],
                  affiliation,
                  role: 'participant'
                });
              }
              
              return { ...room, affiliations: updatedAffiliations };
            }
            return room;
          })
        }));

        // Add system message
        const systemMessage: Message = {
          id: `affiliation-${Date.now()}`,
          from: currentUser,
          to: roomJid,
          body: `Set ${userJid.split('@')[0]}'s affiliation to ${affiliation}`,
          timestamp: new Date(),
          type: 'groupchat',
          status: 'sent'
        };
        
        set((state) => ({
          messages: {
            ...state.messages,
            [roomJid]: [...(state.messages[roomJid] || []), systemMessage]
          }
        }));
      },

      // Set contact sorting method
      setContactSortMethod: (method: 'newest' | 'alphabetical') => {
        set({ contactSortMethod: method });
      },

      // Set room sorting method  
      setRoomSortMethod: (method: 'newest' | 'alphabetical') => {
        set({ roomSortMethod: method });
      },

      sendChatState: (to: string, state: 'composing' | 'active' | 'paused' | 'inactive' | 'gone', type: 'chat' | 'groupchat') => {
        const { client } = get();
        if (!client) return;

        const stateMessage = xml(
          'message',
          { to, type, id: `state-${Date.now()}` },
          xml(state, { xmlns: 'http://jabber.org/protocol/chatstates' })
        );

        client.send(stateMessage);
      },

      setChatState: (chatJid: string, userJid: string, state: 'composing' | 'paused') => {
        set((prevState) => {
          const currentStates = prevState.typingStates[chatJid] || [];
          const filteredStates = currentStates.filter(s => s.user !== userJid);
          
          const newState: TypingState = {
            user: userJid,
            chatJid,
            timestamp: new Date(),
            state
          };

          return {
            typingStates: {
              ...prevState.typingStates,
              [chatJid]: [...filteredStates, newState]
            }
          };
        });

        // Auto-clear typing state after 10 seconds
        setTimeout(() => {
          get().clearTypingState(chatJid, userJid);
        }, 10000);
      },

      clearTypingState: (chatJid: string, userJid?: string) => {
        set((state) => {
          const currentStates = state.typingStates[chatJid] || [];
          const filteredStates = userJid 
            ? currentStates.filter(s => s.user !== userJid)
            : [];

          return {
            typingStates: {
              ...state.typingStates,
              [chatJid]: filteredStates
            }
          };
        });
      },

      setCurrentUserTyping: (chatJid: string, isTyping: boolean) => {
        set((state) => ({
          currentUserTyping: {
            ...state.currentUserTyping,
            [chatJid]: isTyping
          }
        }));
      }
    }),
    {
      name: 'xmpp-store',
      partialize: (state) => ({
        messages: state.messages,
        contacts: state.contacts,
        rooms: state.rooms,
        userAvatar: state.userAvatar,
        userStatus: state.userStatus,
        contactSortMethod: state.contactSortMethod,
        roomSortMethod: state.roomSortMethod
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.messages) {
          // Convert timestamp strings back to Date objects
          const messagesWithDates = Object.fromEntries(
            Object.entries(state.messages).map(([chatJid, messages]) => [
              chatJid,
              messages.map(msg => ({
                ...msg,
                timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
              }))
            ])
          );
          state.messages = messagesWithDates;
        }
        
        if (state?.contacts) {
          // Convert lastSeen strings back to Date objects and ensure proper format
          state.contacts = state.contacts.map(contact => ({
            ...contact,
            lastSeen: contact.lastSeen 
              ? (typeof contact.lastSeen === 'string' ? new Date(contact.lastSeen) : contact.lastSeen)
              : undefined
          }));
        }
      }
    }
  )
);
