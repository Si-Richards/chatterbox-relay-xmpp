
import { create } from 'zustand';
import { client, xml } from '@xmpp/client';

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  type: 'chat' | 'groupchat';
  status?: 'sent' | 'delivered' | 'read'; // Added message status
}

interface Contact {
  jid: string;
  name: string;
  presence: 'online' | 'offline' | 'away' | 'dnd' | 'xa'; // Added more status options
}

interface Room {
  jid: string;
  name: string;
  participants: string[];
  isOwner?: boolean;
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
  userStatus: 'online' | 'away' | 'dnd' | 'xa'; // User's current status
  
  // Actions
  connect: (username: string, password: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (to: string, body: string, type: 'chat' | 'groupchat') => void;
  deleteMessage: (chatJid: string, messageId: string) => void; // New method for deleting messages
  addContact: (jid: string) => void;
  createRoom: (roomName: string) => void;
  joinRoom: (roomJid: string) => void;
  inviteToRoom: (roomJid: string, userJid: string) => void; // New method for inviting users
  kickFromRoom: (roomJid: string, userJid: string) => void; // New method for removing users
  setActiveChat: (jid: string, type: 'chat' | 'groupchat') => void;
  setUserStatus: (status: 'online' | 'away' | 'dnd' | 'xa') => void; // New method for setting status
  markMessageAsDelivered: (from: string, id: string) => void; // New method for marking delivered
  markMessageAsRead: (from: string, id: string) => void; // New method for marking read
  handleStanza: (stanza: any) => void;
}

export const useXMPPStore = create<XMPPState>((set, get) => ({
  client: null,
  isConnected: false,
  currentUser: '',
  contacts: [],
  rooms: [],
  messages: {},
  activeChat: null,
  activeChatType: null,
  userStatus: 'online',

  // Handle XMPP stanzas (messages, presence, etc.)
  handleStanza: (stanza: any) => {
    // Handle messages
    if (stanza.is('message')) {
      const from = stanza.attrs.from;
      const to = stanza.attrs.to;
      const type = stanza.attrs.type || 'chat';
      const body = stanza.getChildText('body');
      const id = stanza.attrs.id || Date.now().toString();
      
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
        
        const message: Message = {
          id,
          from,
          to,
          body,
          timestamp: new Date(),
          type: type as 'chat' | 'groupchat',
          status: 'delivered'
        };
        
        const chatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
        
        set((state) => ({
          messages: {
            ...state.messages,
            [chatJid]: [...(state.messages[chatJid] || []), message]
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
        set((state) => ({
          contacts: state.contacts.map(contact => 
            contact.jid === from.split('/')[0] 
              ? { ...contact, presence: show as any }
              : contact
          )
        }));
      }
    }
  },

  connect: async (username: string, password: string) => {
    try {
      const xmppClient = client({
        service: 'wss://ejabberd.voicehost.io:5443/websocket',
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
      });

      xmppClient.on('stanza', (stanza: any) => {
        const { handleStanza } = get();
        if (handleStanza) {
          handleStanza(stanza);
        }
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
      activeChatType: null
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
      xml('request', { xmlns: 'urn:xmpp:receipts' }) // Add XEP-0184 request
    );

    client.send(message);

    // Add to local messages
    const newMessage: Message = {
      id: messageId,
      from: currentUser,
      to,
      body: body.trim(),
      timestamp: new Date(),
      type,
      status: 'sent'
    };

    const chatJid = type === 'groupchat' ? to : to.split('/')[0];
    
    set((state) => ({
      messages: {
        ...state.messages,
        [chatJid]: [...(state.messages[chatJid] || []), newMessage]
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
      contacts: [...state.contacts, { jid, name: jid.split('@')[0], presence: 'offline' }]
    }));
  },

  createRoom: (roomName: string) => {
    const roomJid = `${roomName}@conference.ejabberd.voicehost.io`;
    const { joinRoom } = get();
    joinRoom(roomJid);
  },

  joinRoom: (roomJid: string) => {
    const { client, currentUser, rooms } = get();
    if (!client || rooms.find(r => r.jid === roomJid)) return;

    const nickname = currentUser.split('@')[0];
    const presence = xml('presence', { to: `${roomJid}/${nickname}` });
    client.send(presence);

    set((state) => ({
      rooms: [...state.rooms, { jid: roomJid, name: roomJid.split('@')[0], participants: [] }]
    }));
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
  }
}));
