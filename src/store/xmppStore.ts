import { create } from 'zustand';
import { Contact, Message, Room } from '@/types';
import { client, xml, jid } from '@xmpp/client';

interface XMPPState {
  client: any;
  currentUser: string;
  isConnected: boolean;
  serverUsers: string[];
  contacts: Contact[];
  rooms: Room[];
  messages: { [key: string]: Message[] };
  typingStates: { [key: string]: { user: string; state: 'composing' | 'paused'; timestamp: Date }[] };
  currentRoom: string | null;
  userAvatar: string | null;
  activeChat: string | null;
  activeChatType: 'chat' | 'groupchat' | null;
  userStatus: 'online' | 'offline' | 'away' | 'busy';
  contactSortMethod: 'newest' | 'alphabetical';
  roomSortMethod: 'newest' | 'alphabetical';
  
  setClient: (client: any) => void;
  setCurrentUser: (currentUser: string) => void;
  setIsConnected: (connected: boolean) => void;
  setServerUsers: (users: string[]) => void;
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact | string) => void;
  updateContact: (contact: Contact) => void;
  removeContact: (jid: string) => void;
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  updateRoom: (room: Room) => void;
  removeRoom: (jid: string) => void;
  setCurrentRoom: (room: string | null) => void;
  setUserAvatar: (avatar: string | null) => void;
  setRoomAvatar: (roomJid: string, avatar: string) => void;
  setActiveChat: (chatJid: string | null, chatType: 'chat' | 'groupchat' | null) => void;
  setUserStatus: (status: 'online' | 'offline' | 'away' | 'busy') => void;
  setContactSortMethod: (method: 'newest' | 'alphabetical') => void;
  setRoomSortMethod: (method: 'newest' | 'alphabetical') => void;
  
  addMessage: (chatJid: string, message: Message) => void;
  updateMessageStatus: (chatJid: string, messageId: string, status: 'sent' | 'delivered' | 'read') => void;
  deleteMessage: (chatJid: string, messageId: string) => void;
  addReaction: (chatJid: string, messageId: string, emoji: string) => void;
  
  handleStanza: (stanza: any) => void;
  sendMessage: (to: string, body: string, type: 'chat' | 'groupchat') => void;
  sendFileMessage: (to: string, fileData: any, type: 'chat' | 'groupchat') => void;
  
  connect: (username: string, password: string) => Promise<void>;
  disconnect: () => void;
  joinRoom: (roomJid: string) => void;
  createRoom: (roomName: string, description?: string, isPermanent?: boolean, options?: any) => void;
  deleteRoom: (roomJid: string) => void;
  inviteUserToRoom: (roomJid: string, userJid: string) => void;
  updateRoomDescription: (roomJid: string, description: string) => void;
  fetchRoomAffiliations: (roomJid: string) => void;
  setRoomAffiliation: (roomJid: string, userJid: string, affiliation: string) => void;
  fetchServerUsers: () => Promise<any[]>;
  
  setChatState: (chatJid: string, userJid: string, state: 'composing' | 'paused') => void;
  clearTypingState: (chatJid: string, userJid: string) => void;
  sendChatState: (to: string, state: 'composing' | 'paused' | 'active', chatType: 'chat' | 'groupchat') => void;
  setCurrentUserTyping: (chatJid: string, isTyping: boolean) => void;
  
  // XMPP functionality
  requestRoster: () => void;
  discoverServices: () => void;
  discoverRooms: (mucService: string) => void;
}

export const useXMPPStore = create<XMPPState>((set, get) => ({
  client: null,
  currentUser: '',
  isConnected: false,
  serverUsers: [],
  contacts: [],
  rooms: [],
  messages: {},
  typingStates: {},
  currentRoom: null,
  userAvatar: null,
  activeChat: null,
  activeChatType: null,
  userStatus: 'offline',
  contactSortMethod: 'newest',
  roomSortMethod: 'newest',

  setClient: (client) => set({ client }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setServerUsers: (users: string[]) => set({ serverUsers: users }),
  setContacts: (contacts) => set({ contacts }),
  addContact: (contact) => {
    if (typeof contact === 'string') {
      const newContact: Contact = {
        jid: contact,
        name: contact.split('@')[0],
        status: 'offline'
      };
      set((state) => ({ contacts: [...state.contacts, newContact] }));
    } else {
      set((state) => ({ contacts: [...state.contacts, contact] }));
    }
  },
  updateContact: (contact) => set((state) => ({
    contacts: state.contacts.map(c => c.jid === contact.jid ? contact : c)
  })),
  removeContact: (jid) => set((state) => ({
    contacts: state.contacts.filter(c => c.jid !== jid)
  })),
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((state) => ({ rooms: [...state.rooms, room] })),
  updateRoom: (room) => set((state) => ({
    rooms: state.rooms.map(r => r.jid === room.jid ? room : r)
  })),
  removeRoom: (jid) => set((state) => ({
    rooms: state.rooms.filter(r => r.jid !== jid)
  })),
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setUserAvatar: (avatar) => set({ userAvatar: avatar }),
  setRoomAvatar: (roomJid: string, avatar: string) => set((state) => ({
    rooms: state.rooms.map(room => 
      room.jid === roomJid ? { ...room, avatar } : room
    )
  })),
  setActiveChat: (chatJid: string | null, chatType: 'chat' | 'groupchat' | null) => 
    set({ activeChat: chatJid, activeChatType: chatType }),
  setUserStatus: (status) => {
    set({ userStatus: status });
    const { client, currentUser } = get();
    if (client && currentUser) {
      // Send presence with new status
      const show = status === 'away' ? 'away' : status === 'busy' ? 'dnd' : '';
      const presence = xml('presence', {}, show ? xml('show', {}, show) : null);
      client.send(presence);
    }
  },
  setContactSortMethod: (method) => set({ contactSortMethod: method }),
  setRoomSortMethod: (method) => set({ roomSortMethod: method }),

  addMessage: (chatJid, message) => set((state) => {
    const chatMessages = state.messages[chatJid] || [];
    return {
      messages: {
        ...state.messages,
        [chatJid]: [...chatMessages, message],
      },
    };
  }),
  updateMessageStatus: (chatJid, messageId, status) => set((state) => ({
    messages: {
      ...state.messages,
      [chatJid]: state.messages[chatJid]?.map(msg =>
        msg.id === messageId ? { ...msg, status } : msg
      ) || [],
    },
  })),
  deleteMessage: (chatJid, messageId) => set((state) => ({
    messages: {
      ...state.messages,
      [chatJid]: state.messages[chatJid]?.filter(msg => msg.id !== messageId) || [],
    },
  })),
  addReaction: (chatJid, messageId, emoji) => set((state) => ({
    messages: {
      ...state.messages,
      [chatJid]: state.messages[chatJid]?.map(msg => {
        if (msg.id === messageId) {
          const existingReactions = msg.reactions || [];
          const existingReaction = existingReactions.find(r => r.emoji === emoji);
          
          if (existingReaction) {
            const updatedReactions = existingReactions.map(r => 
              r.emoji === emoji 
                ? { ...r, users: [...r.users, get().currentUser] }
                : r
            );
            return { ...msg, reactions: updatedReactions };
          } else {
            return {
              ...msg,
              reactions: [...existingReactions, { emoji, users: [get().currentUser] }]
            };
          }
        }
        return msg;
      }) || [],
    },
  })),

  handleStanza: (stanza: any) => {
    const { type, from, to, id } = stanza.attrs;
    const { contacts, rooms, currentUser, updateContact, updateRoom, addMessage } = get();

    console.log('Handling stanza:', { type, from, to, stanzaName: stanza.name, id });

    // Handle roster IQ responses
    if (stanza.name === 'iq' && stanza.attrs.type === 'result') {
      const query = stanza.getChild('query');
      
      // Roster response
      if (query && query.attrs.xmlns === 'jabber:iq:roster') {
        console.log('Processing roster response');
        const items = query.getChildren('item');
        const newContacts: Contact[] = items.map((item: any) => ({
          jid: item.attrs.jid,
          name: item.attrs.name || item.attrs.jid.split('@')[0],
          status: 'offline'
        }));
        set({ contacts: newContacts });
        console.log('Added contacts:', newContacts);
      }
      
      // Service discovery response
      if (query && query.attrs.xmlns === 'http://jabber.org/protocol/disco#items') {
        console.log('Processing service discovery response');
        const items = query.getChildren('item');
        items.forEach((item: any) => {
          const serviceJid = item.attrs.jid;
          if (serviceJid && serviceJid.includes('muc') || serviceJid.includes('conference')) {
            console.log('Found MUC service:', serviceJid);
            get().discoverRooms(serviceJid);
          }
        });
      }
      
      // Room discovery response
      if (query && query.attrs.xmlns === 'http://jabber.org/protocol/disco#items' && from && from.includes('muc')) {
        console.log('Processing room discovery response');
        const items = query.getChildren('item');
        const newRooms: Room[] = items.map((item: any) => ({
          jid: item.attrs.jid,
          name: item.attrs.name || item.attrs.jid.split('@')[0],
          participants: [],
          isOwner: false,
          isPermanent: true
        }));
        set((state) => ({ rooms: [...state.rooms, ...newRooms] }));
        console.log('Added rooms:', newRooms);
      }
    }

    // Handle presence stanzas
    if (stanza.name === 'presence') {
      const contactJid = from.split('/')[0];
      const contact = contacts.find(c => c.jid === contactJid);

      if (contact) {
        const presenceType = stanza.attrs.type || 'available';
        let status: 'online' | 'offline' | 'away' | 'busy' = 'offline';
        
        if (presenceType !== 'unavailable') {
          const show = stanza.getChildText('show');
          if (show === 'away') status = 'away';
          else if (show === 'dnd') status = 'busy';
          else status = 'online';
        }
        
        const updatedContact = { ...contact, status };
        updateContact(updatedContact);
      }

      // Handle MUC presence
      if (type === 'groupchat') {
        const roomJid = to;
        const room = rooms.find(r => r.jid === roomJid);

        if (room) {
          const userJid = from;
          const x = stanza.getChild('x', 'http://jabber.org/protocol/muc#user');
          const item = x?.getChild('item');
          const affiliation = item?.attrs?.affiliation || 'none';
          const role = item?.attrs?.role || 'none';

          const isCurrentUser = userJid.includes(`/${currentUser.split('@')[0]}`);

          let updatedParticipants = [...(room.participants || [])];
          const existingParticipantIndex = updatedParticipants.findIndex(p => 
            typeof p === 'string' ? p === userJid : p.jid === userJid
          );

          if (affiliation === 'none' || role === 'none') {
            if (existingParticipantIndex !== -1) {
              updatedParticipants.splice(existingParticipantIndex, 1);
            }
          } else {
            const participantData = {
              jid: userJid,
              nick: userJid.split('/')[1] || userJid.split('@')[0],
              affiliation,
              role,
            };

            if (existingParticipantIndex !== -1) {
              updatedParticipants[existingParticipantIndex] = participantData;
            } else {
              updatedParticipants.push(participantData);
            }
          }

          const updatedRoom = { ...room, participants: updatedParticipants };
          updateRoom(updatedRoom);
        }
      }
    }

    // Handle chat states
    const composing = stanza.getChild('composing', 'http://jabber.org/protocol/chatstates');
    const paused = stanza.getChild('paused', 'http://jabber.org/protocol/chatstates');
    const active = stanza.getChild('active', 'http://jabber.org/protocol/chatstates');
    
    if (composing || paused) {
      const stateChatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
      const userJid = from;
      const state = composing ? 'composing' : 'paused';
      
      const isCurrentUser = type === 'groupchat' 
        ? from.includes(`/${currentUser.split('@')[0]}`)
        : from.split('/')[0] === currentUser;
      
      if (!isCurrentUser) {
        get().setChatState(stateChatJid, userJid, state);
      }
      return;
    }
    
    if (active) {
      const stateChatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
      const userJid = from;
      get().clearTypingState(stateChatJid, userJid);
      return;
    }

    // Handle message stanzas
    if (stanza.name === 'message' && stanza.attrs.type !== 'error') {
      const body = stanza.getChildText('body');
      if (body) {
        const message: Message = {
          id: stanza.attrs.id || Math.random().toString(36).substring(7),
          from: from,
          to: to,
          body: body,
          timestamp: new Date(),
          status: 'sent',
          type: type === 'groupchat' ? 'groupchat' : 'chat',
        };
        addMessage(from, message);
      }
    }
  },

  sendMessage: (to, body, type) => {
    const { client, currentUser, addMessage } = get();
    if (!client) return;

    const id = Math.random().toString(36).substring(7);
    const message = xml('message', {
      to: to,
      from: currentUser,
      type: type === 'groupchat' ? 'groupchat' : 'chat',
      id: id
    },
      xml('body', {}, body)
    );

    client.send(message);

    const newMessage: Message = {
      id: id,
      from: currentUser,
      to: to,
      body: body,
      timestamp: new Date(),
      status: 'sent',
      type: type === 'groupchat' ? 'groupchat' : 'chat',
    };
    addMessage(to, newMessage);
  },

  sendFileMessage: (to, fileData, type) => {
    const { client, currentUser, addMessage } = get();
    if (!client) return;
  
    const id = Math.random().toString(36).substring(7);
    const message = xml('message', {
      to: to,
      from: currentUser,
      type: type === 'groupchat' ? 'groupchat' : 'chat',
      id: id
    },
      xml('body', {}, `File: ${fileData.name}`),
      xml('file', {
        xmlns: 'urn:xmpp:file:transfer',
        name: fileData.name,
        size: fileData.size,
        type: fileData.type
      },
        xml('url', {}, fileData.url)
      )
    );
  
    client.send(message);
  
    const newMessage: Message = {
      id: id,
      from: currentUser,
      to: to,
      body: `File: ${fileData.name}`,
      fileData: fileData,
      timestamp: new Date(),
      status: 'sent',
      type: type === 'groupchat' ? 'groupchat' : 'chat',
    };
    addMessage(to, newMessage);
  },

  connect: async (username: string, password: string) => {
    try {
      console.log('Creating XMPP client...');
      
      // Create XMPP client
      const xmppClient = client({
        service: 'ws://localhost:5280/ws', // WebSocket connection to XMPP server
        domain: 'localhost',
        username: username,
        password: password,
      });

      console.log('Setting up event handlers...');

      // Set up event handlers
      xmppClient.on('error', (err: any) => {
        console.error('XMPP Error:', err);
        set({ isConnected: false });
      });

      xmppClient.on('offline', () => {
        console.log('XMPP client offline');
        set({ isConnected: false });
      });

      xmppClient.on('stanza', (stanza: any) => {
        get().handleStanza(stanza);
      });

      xmppClient.on('online', (address: any) => {
        console.log('XMPP client online:', address.toString());
        set({ 
          isConnected: true, 
          currentUser: address.toString(),
          userStatus: 'online'
        });

        // Send initial presence
        xmppClient.send(xml('presence'));

        // Request roster
        get().requestRoster();

        // Discover services
        get().discoverServices();
      });

      console.log('Starting XMPP client...');
      set({ client: xmppClient });
      await xmppClient.start();

    } catch (error) {
      console.error('Connection failed:', error);
      set({ isConnected: false });
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
      contacts: [],
      rooms: [],
      messages: {},
      userStatus: 'offline'
    });
  },

  joinRoom: (roomJid: string) => {
    const { client, currentUser } = get();
    if (!client) return;
    
    const presence = xml('presence', { 
      to: `${roomJid}/${currentUser.split('@')[0]}` 
    });
    client.send(presence);
  },

  createRoom: (roomName: string, description?: string, isPermanent?: boolean, options?: any) => {
    const { client, currentUser } = get();
    if (!client) return;

    const roomJid = `${roomName}@conference.localhost`;
    const newRoom: Room = {
      jid: roomJid,
      name: roomName,
      description: description || '',
      participants: [],
      isOwner: true,
      isPermanent: isPermanent || false
    };
    
    get().addRoom(newRoom);
    
    // Join the room
    const presence = xml('presence', { 
      to: `${roomJid}/${currentUser.split('@')[0]}` 
    });
    client.send(presence);
  },

  deleteRoom: (roomJid) => {
    const { client } = get();
    if (!client) return;

    const message = xml('message', {
      to: roomJid,
      type: 'groupchat'
    },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc#owner' },
        xml('destroy', {})
      )
    );
    client.send(message);

    set((state) => ({
      rooms: state.rooms.filter(room => room.jid !== roomJid),
    }));
  },

  inviteUserToRoom: (roomJid, userJid) => {
    const { client } = get();
    if (!client) return;

    const message = xml('message', {
      to: roomJid,
      type: 'groupchat'
    },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc#user' },
        xml('invite', { to: userJid })
      )
    );
    client.send(message);
  },

  updateRoomDescription: (roomJid, description) => {
    const { client } = get();
    if (!client) return;
  
    const message = xml('message', {
      to: roomJid,
      type: 'groupchat'
    },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc#user' },
        xml(' MucConfigForm', {xmlns: 'http://jabber.org/protocol/muc#owner'},
          xml('field', {var: 'muc#roomconfig_roomdesc'},
            xml('value', {}, description)
          )
        )
      )
    );
  
    client.send(message);
  
    set((state) => ({
      rooms: state.rooms.map(room =>
        room.jid === roomJid ? { ...room, description: description } : room
      ),
    }));
  },

  fetchRoomAffiliations: (roomJid) => {
    const { client } = get();
    if (!client) return;

    const iq = xml('iq', {
      to: roomJid,
      type: 'get',
      id: 'get-affiliations'
    },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
        xml('item', { affiliation: 'owner' })
      )
    );

    client.send(iq);
  },

  setRoomAffiliation: (roomJid, userJid, affiliation) => {
    const { client } = get();
    if (!client) return;

    const iq = xml('iq', {
      to: roomJid,
      type: 'set',
      id: 'set-affiliation'
    },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
        xml('item', { jid: userJid, affiliation: affiliation })
      )
    );

    client.send(iq);

    set((state) => ({
      rooms: state.rooms.map(room => {
        if (room.jid === roomJid) {
          const updatedAffiliations = room.affiliations?.map(aff => {
            if (aff.jid === userJid) {
              return { ...aff, affiliation: affiliation };
            }
            return aff;
          });
          return { ...room, affiliations: updatedAffiliations };
        }
        return room;
      }),
    }));
  },

  fetchServerUsers: async () => {
    const { client } = get();
    if (!client) return [];
  
    const discoItemsIQ = xml('iq', {
      to: 'localhost',
      type: 'get',
      id: 'disco-items-users'
    },
      xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' })
    );
  
    client.send(discoItemsIQ);
    return [];
  },

  setChatState: (chatJid: string, userJid: string, state: 'composing' | 'paused') => {
    console.log('Setting chat state:', { chatJid, userJid, state });
    set((currentState) => {
      const currentTyping = currentState.typingStates[chatJid] || [];
      const filteredTyping = currentTyping.filter(t => t.user !== userJid);
      
      const newTypingStates = {
        ...currentState.typingStates,
        [chatJid]: [
          ...filteredTyping,
          {
            user: userJid,
            state,
            timestamp: new Date()
          }
        ]
      };
      
      return { typingStates: newTypingStates };
    });
  },

  clearTypingState: (chatJid: string, userJid: string) => {
    console.log('Clearing typing state:', { chatJid, userJid });
    set((state) => {
      const currentTyping = state.typingStates[chatJid] || [];
      const filteredTyping = currentTyping.filter(t => t.user !== userJid);
      
      return {
        typingStates: {
          ...state.typingStates,
          [chatJid]: filteredTyping
        }
      };
    });
  },

  sendChatState: (to: string, state: 'composing' | 'paused' | 'active', chatType: 'chat' | 'groupchat') => {
    const { client } = get();
    if (!client) return;

    console.log('Sending chat state:', { to, state, chatType });
    
    const message = xml('message', {
      to: to,
      type: chatType === 'groupchat' ? 'groupchat' : 'chat'
    });

    if (state === 'composing') {
      message.c('composing', { xmlns: 'http://jabber.org/protocol/chatstates' });
    } else if (state === 'paused') {
      message.c('paused', { xmlns: 'http://jabber.org/protocol/chatstates' });
    } else if (state === 'active') {
      message.c('active', { xmlns: 'http://jabber.org/protocol/chatstates' });
    }

    client.send(message);
  },

  setCurrentUserTyping: (chatJid: string, isTyping: boolean) => {
    set((state) => {
      return {
        typingStates: {
          ...state.typingStates,
          [chatJid]: isTyping
            ? [{ user: state.currentUser, state: 'composing', timestamp: new Date() }]
            : [],
        },
      };
    });
  },

  // Real XMPP functionality implementations
  requestRoster: () => {
    const { client } = get();
    if (!client) return;

    console.log('Requesting roster...');
    const rosterIQ = xml('iq', {
      type: 'get',
      id: 'roster-request'
    },
      xml('query', { xmlns: 'jabber:iq:roster' })
    );

    client.send(rosterIQ);
  },

  discoverServices: () => {
    const { client } = get();
    if (!client) return;

    console.log('Discovering services...');
    const discoIQ = xml('iq', {
      to: 'localhost',
      type: 'get',
      id: 'disco-services'
    },
      xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' })
    );

    client.send(discoIQ);
  },

  discoverRooms: (mucService: string) => {
    const { client } = get();
    if (!client) return;

    console.log(`Discovering rooms on service: ${mucService}`);
    const discoRoomsIQ = xml('iq', {
      to: mucService,
      type: 'get',
      id: `disco-rooms-${mucService}`
    },
      xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' })
    );

    client.send(discoRoomsIQ);
  },
}));
