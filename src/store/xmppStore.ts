import { create } from 'zustand';
import { Contact, Message } from '@/types';
import { xml, jid } from '@xmpp/client';

interface XMPPState {
  client: any;
  currentUser: string;
  serverUsers: string[];
  contacts: Contact[];
  rooms: any[];
  messages: { [key: string]: Message[] };
  typingStates: { [key: string]: { user: string; state: 'composing' | 'paused'; timestamp: Date }[] };
  currentRoom: string | null;
  userAvatar: string | null;
  
  setClient: (client: any) => void;
  setCurrentUser: (currentUser: string) => void;
  setServerUsers: (users: string[]) => void;
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;
  updateContact: (contact: Contact) => void;
  removeContact: (jid: string) => void;
  setRooms: (rooms: any[]) => void;
  addRoom: (room: any) => void;
  updateRoom: (room: any) => void;
  removeRoom: (jid: string) => void;
  setCurrentRoom: (room: string | null) => void;
  setUserAvatar: (avatar: string | null) => void;
  
  addMessage: (chatJid: string, message: Message) => void;
  updateMessageStatus: (chatJid: string, messageId: string, status: string) => void;
  deleteMessage: (chatJid: string, messageId: string) => void;
  addReaction: (chatJid: string, messageId: string, emoji: string) => void;
  
  handleStanza: (stanza: any) => void;
  sendMessage: (to: string, body: string, type: 'chat' | 'groupchat') => void;
  sendFileMessage: (to: string, fileData: any, type: 'chat' | 'groupchat') => void;
  
  createRoom: (roomName: string) => void;
  deleteRoom: (roomJid: string) => void;
  inviteUserToRoom: (roomJid: string, userJid: string) => void;
  updateRoomDescription: (roomJid: string, description: string) => void;
  fetchRoomAffiliations: (roomJid: string) => void;
  setRoomAffiliation: (roomJid: string, userJid: string, affiliation: string) => void;
  fetchServerUsers: () => void;
  
  setChatState: (chatJid: string, userJid: string, state: 'composing' | 'paused') => void;
  clearTypingState: (chatJid: string, userJid: string) => void;
  sendChatState: (to: string, state: 'composing' | 'paused' | 'active', chatType: 'chat' | 'groupchat') => void;
  setCurrentUserTyping: (chatJid: string, isTyping: boolean) => void;
}

export const useXMPPStore = create<XMPPState>((set, get) => ({
  client: null,
  currentUser: '',
  serverUsers: [],
  contacts: [],
  rooms: [],
  messages: {},
  typingStates: {},
  currentRoom: null,
  userAvatar: null,

  setClient: (client) => set({ client }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setServerUsers: (users: string[]) => set({ serverUsers: users }),
  setContacts: (contacts) => set({ contacts }),
  addContact: (contact) => set((state) => ({ contacts: [...state.contacts, contact] })),
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
      ),
    },
  })),
  deleteMessage: (chatJid, messageId) => set((state) => ({
    messages: {
      ...state.messages,
      [chatJid]: state.messages[chatJid]?.filter(msg => msg.id !== messageId),
    },
  })),
  addReaction: (chatJid, messageId, emoji) => set((state) => ({
    messages: {
      ...state.messages,
      [chatJid]: state.messages[chatJid]?.map(msg =>
        msg.id === messageId
          ? {
            ...msg,
            reactions: msg.reactions
              ? [...msg.reactions, { emoji, from: get().currentUser }]
              : [{ emoji, from: get().currentUser }],
          }
          : msg
      ),
    },
  })),

  handleStanza: (stanza: any) => {
    const { type, from, to } = stanza._attributes;
    const { contacts, rooms, currentUser, updateContact, updateRoom } = get();

    // Handle presence stanzas to update contact status
    if (stanza.name === 'presence') {
      const contactJid = from.split('/')[0];
      const contact = contacts.find(c => c.jid === contactJid);

      if (contact) {
        const presenceType = stanza.attrs.type || 'available';
        const updatedContact = { ...contact, status: presenceType !== 'unavailable' ? 'online' : 'offline' };
        updateContact(updatedContact);
      }

      // Handle MUC presence to update room participants
      if (type === 'groupchat') {
        const roomJid = to;
        const room = rooms.find(r => r.jid === roomJid);

        if (room) {
          const userJid = from;
          const affiliation = stanza.getChild('x', 'http://jabber.org/protocol/muc#user')
            ?.getChild('item')
            ?.attrs?.affiliation || 'none';
          const role = stanza.getChild('x', 'http://jabber.org/protocol/muc#user')
            ?.getChild('item')
            ?.attrs?.role || 'none';

          // Check if the user is the current user
          const isCurrentUser = userJid.includes(`/${currentUser.split('@')[0]}`);

          // Update the participant list based on presence and affiliation
          let updatedParticipants = [...(room.participants || [])];
          const existingParticipantIndex = updatedParticipants.findIndex(p => typeof p === 'string' ? p === userJid : p.jid === userJid);

          if (affiliation === 'none' || role === 'none') {
            // Remove the participant if affiliation or role is none
            if (existingParticipantIndex !== -1) {
              updatedParticipants.splice(existingParticipantIndex, 1);
            }
          } else {
            // Update or add the participant
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

          // Update the room with the new participant list
          const updatedRoom = { ...room, participants: updatedParticipants };
          updateRoom(updatedRoom);
        }
      }
    }

    // Handle chat states (composing, paused, active, etc.)
    const composing = stanza.getChild('composing', 'http://jabber.org/protocol/chatstates');
    const paused = stanza.getChild('paused', 'http://jabber.org/protocol/chatstates');
    const active = stanza.getChild('active', 'http://jabber.org/protocol/chatstates');
    const inactive = stanza.getChild('inactive', 'http://jabber.org/protocol/chatstates');
    const gone = stanza.getChild('gone', 'http://jabber.org/protocol/chatstates');
    
    if (composing || paused) {
      // For MUC rooms: chatJid is room JID, userJid is full JID with nickname
      // For direct chat: chatJid is user JID, userJid is user JID
      const stateChatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
      const userJid = from; // Keep full JID to preserve nickname for MUC
      const state = composing ? 'composing' : 'paused';
      
      console.log('Chat state received:', { type, from, stateChatJid, userJid, state });
      
      // Don't show typing for current user
      const { currentUser } = get();
      const isCurrentUser = type === 'groupchat' 
        ? from.includes(`/${currentUser.split('@')[0]}`)
        : from.split('/')[0] === currentUser;
      
      console.log('Is current user typing?', { isCurrentUser, currentUser, from });
      
      if (!isCurrentUser) {
        get().setChatState(stateChatJid, userJid, state);
      }
      return;
    }
    
    if (active || inactive || gone) {
      const stateChatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
      const userJid = from;
      console.log('Clearing chat state:', { stateChatJid, userJid });
      get().clearTypingState(stateChatJid, userJid);
      return;
    }

    // Handle message stanzas
    if (stanza.name === 'message' && stanza.attrs.type !== 'error') {
      const body = stanza.getChildText('body');
      if (body) {
        const message: Message = {
          id: stanza.id(),
          from: from,
          to: to,
          body: body,
          timestamp: new Date(),
          status: 'sent',
          type: type === 'groupchat' ? 'groupchat' : 'chat',
        };
        get().addMessage(from, message);
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

  createRoom: (roomName) => {
    const { client } = get();
    if (!client) return;

    const roomJid = `${roomName}@muc.localhost`; // Replace with your MUC domain
    client.send(xml('presence', { to: roomJid + '/' + get().currentUser.split('@')[0] }));
  },

  deleteRoom: (roomJid) => {
    const { client } = get();
    if (!client) return;

    // Send a destroy configuration to the room
    const message = xml('message', {
      to: roomJid,
      type: 'groupchat'
    },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc#owner' },
        xml('destroy', {})
      )
    );
    client.send(message);

    // Remove the room from the local state
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
  
    // Update the room in the local state
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

    // Listen for the response and update the state
    client.on('stanza', (stanza: any) => {
      if (stanza.attrs.id === 'get-affiliations' && stanza.attrs.type === 'result') {
        const items = stanza.getChild('query')?.getChildren('item');
        const affiliations = items.map((item: any) => ({
          jid: item.attrs.jid,
          affiliation: item.attrs.affiliation,
          role: item.attrs.role,
          name: item.attrs.name || item.attrs.jid.split('@')[0]
        }));

        set((state) => ({
          rooms: state.rooms.map(room =>
            room.jid === roomJid ? { ...room, affiliations: affiliations } : room
          ),
        }));
      }
    });
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

    // Update the room in the local state
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

  fetchServerUsers: () => {
    const { client } = get();
    if (!client) return;
  
    const discoItemsIQ = xml('iq', {
      to: 'localhost', // Replace with your server domain
      type: 'get',
      id: 'disco-items-1'
    },
      xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' })
    );
  
    client.send(discoItemsIQ);
  
    client.on('stanza', (stanza: any) => {
      if (stanza.attrs.id === 'disco-items-1' && stanza.attrs.type === 'result') {
        const items = stanza.getChild('query')?.getChildren('item');
        const users = items.map((item: any) => item.attrs.jid);
        set({ serverUsers: users });
      }
    });
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
      
      console.log('New typing states:', newTypingStates);
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

    // Add the appropriate chat state
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
      // Directly update the typingStates without affecting other states
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
}));
