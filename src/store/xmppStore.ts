
import { create } from 'zustand';
import { xml, jid } from '@xmpp/client';

interface Room {
  jid: string;
  name: string;
  description?: string;
  isPermanent: boolean;
  isOwner: boolean;
  isPrivate?: boolean;
  hasPassword?: boolean;
  avatar?: string;
  participants: Array<{
    jid: string;
    nick: string;
    affiliation: string;
    role: string;
  }>;
  affiliations?: Array<{
    jid: string;
    name: string;
    affiliation: string;
    role: string;
  }>;
}

interface Contact {
  jid: string;
  name: string;
  presence: string;
  avatar?: string;
  lastSeen?: Date;
}

interface Message {
  id: string;
  from: string;
  body: string;
  timestamp: Date;
  type: 'chat' | 'groupchat';
  status?: 'sent' | 'delivered' | 'read';
  fileData?: {
    name: string;
    type: string;
    size: number;
    url: string;
  };
  reactions?: Array<{
    emoji: string;
    users: string[];
  }>;
}

interface XMPPState {
  isConnected: boolean;
  client: any;
  userJid: string | null;
  currentUser: string;
  userAvatar: string | null;
  userStatus: 'online' | 'away' | 'dnd' | 'xa';
  messages: Record<string, Message[]>;
  rooms: Room[];
  contacts: Contact[];
  activeChat: string | null;
  activeChatType: 'chat' | 'groupchat' | null;
  contactSortMethod: 'newest' | 'alphabetical';
  roomSortMethod: 'newest' | 'alphabetical';
  currentRoomJid: string | null;
  nickname: string | null;
}

interface XMPPStore extends XMPPState {
  connect: (jid: string, password: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (to: string, body: string, type?: 'chat' | 'groupchat') => void;
  sendFileMessage: (to: string, fileData: any, type: 'chat' | 'groupchat') => void;
  deleteMessage: (chatJid: string, messageId: string) => void;
  addReaction: (chatJid: string, messageId: string, emoji: string) => void;
  joinRoom: (roomJid: string, nickname: string, password?: string) => void;
  leaveRoom: (roomJid: string) => void;
  createRoom: (roomName: string, description: string, options: {
    isPermanent: boolean;
    isPrivate: boolean;
    hasPassword: boolean;
    password?: string;
  }) => void;
  deleteRoom: (roomJid: string) => void;
  fetchRoomAffiliations: (roomJid: string) => void;
  setRoomAffiliation: (roomJid: string, userJid: string, affiliation: string) => void;
  updateRoomSettings: (roomJid: string, settings: Record<string, any>) => void;
  updateRoomDescription: (roomJid: string, description: string) => void;
  addContact: (contactJid: string) => void;
  setUserAvatar: (avatar: string) => void;
  setRoomAvatar: (roomJid: string, avatar: string) => void;
  setActiveChat: (chatJid: string, type: 'chat' | 'groupchat') => void;
  setUserStatus: (status: 'online' | 'away' | 'dnd' | 'xa') => void;
  setContactSortMethod: (method: 'newest' | 'alphabetical') => void;
  setRoomSortMethod: (method: 'newest' | 'alphabetical') => void;
  fetchServerUsers: () => Promise<Array<{jid: string; name: string}>>;
}

export const useXMPPStore = create<XMPPStore>((set, get) => ({
  isConnected: false,
  client: null,
  userJid: null,
  currentUser: '',
  userAvatar: null,
  userStatus: 'online',
  messages: {},
  rooms: [],
  contacts: [],
  activeChat: null,
  activeChatType: null,
  contactSortMethod: 'newest',
  roomSortMethod: 'newest',
  currentRoomJid: null,
  nickname: null,

  connect: async (jid: string, password: string) => {
    const { Client } = await import('@xmpp/client');
    const client = new Client();

    client.on('error', err => {
      console.error('XMPP error:', err);
    });

    client.on('offline', () => {
      set({ isConnected: false, client: null, userJid: null, currentUser: '' });
    });

    client.on('stanza', (stanza: any) => {
      console.log('Incoming stanza:', stanza.toString());
      if (stanza.is('message')) {
        const from = stanza.attrs.from;
        const body = stanza.getChildText('body');
        const type = stanza.attrs.type === 'groupchat' ? 'groupchat' : 'chat';

        if (from && body) {
          const message: Message = {
            id: Date.now().toString(),
            from,
            body,
            timestamp: new Date(),
            type,
            status: 'delivered'
          };

          set((state) => ({
            messages: {
              ...state.messages,
              [from]: [...(state.messages[from] || []), message]
            }
          }));
        }
      }
    });

    try {
      await client.start({
        service: 'xmpp://localhost:5280',
        domain: 'localhost',
        username: jid.split('@')[0],
        password: password
      });

      set({ 
        isConnected: true, 
        client: client, 
        userJid: jid,
        currentUser: jid
      });

      client.send(xml('presence', {}));
    } catch (err) {
      console.error('XMPP connection error:', err);
      set({ isConnected: false, client: null, userJid: null, currentUser: '' });
      throw err;
    }
  },

  disconnect: () => {
    const { client } = get();
    if (client) {
      client.stop().then(() => {
        set({ 
          isConnected: false, 
          client: null, 
          userJid: null, 
          currentUser: '',
          activeChat: null,
          activeChatType: null
        });
      });
    }
  },

  sendMessage: (to: string, body: string, type = 'chat') => {
    const { isConnected, client, currentUser } = get();
    if (!isConnected || !client || !currentUser) return;

    const message = xml('message', { to, type, from: currentUser },
      xml('body', {}, body)
    );
    client.send(message);

    const newMessage: Message = {
      id: Date.now().toString(),
      from: currentUser,
      body,
      timestamp: new Date(),
      type: type as 'chat' | 'groupchat',
      status: 'sent'
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [to]: [...(state.messages[to] || []), newMessage]
      }
    }));
  },

  sendFileMessage: (to: string, fileData: any, type: 'chat' | 'groupchat') => {
    const { currentUser } = get();
    if (!currentUser) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      from: currentUser,
      body: '',
      timestamp: new Date(),
      type,
      status: 'sent',
      fileData
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [to]: [...(state.messages[to] || []), newMessage]
      }
    }));
  },

  deleteMessage: (chatJid: string, messageId: string) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatJid]: (state.messages[chatJid] || []).filter(msg => msg.id !== messageId)
      }
    }));
  },

  addReaction: (chatJid: string, messageId: string, emoji: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    set((state) => ({
      messages: {
        ...state.messages,
        [chatJid]: (state.messages[chatJid] || []).map(msg => {
          if (msg.id === messageId) {
            const reactions = msg.reactions || [];
            const existingReaction = reactions.find(r => r.emoji === emoji);
            
            if (existingReaction) {
              if (existingReaction.users.includes(currentUser)) {
                existingReaction.users = existingReaction.users.filter(u => u !== currentUser);
                if (existingReaction.users.length === 0) {
                  return { ...msg, reactions: reactions.filter(r => r.emoji !== emoji) };
                }
              } else {
                existingReaction.users.push(currentUser);
              }
            } else {
              reactions.push({ emoji, users: [currentUser] });
            }
            
            return { ...msg, reactions };
          }
          return msg;
        })
      }
    }));
  },

  joinRoom: (roomJid: string, nickname: string, password?: string) => {
    const { isConnected, client, currentUser } = get();
    if (!isConnected || !client || !currentUser) return;

    const presence = xml('presence', {
      to: `${roomJid}/${nickname}`,
    },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc' },
        password ? xml('password', {}, password) : null
      )
    );

    client.send(presence);

    set({ currentRoomJid: roomJid, nickname: nickname });

    // Add room to rooms list if not already present
    const { rooms } = get();
    if (!rooms.find(r => r.jid === roomJid)) {
      const newRoom: Room = {
        jid: roomJid,
        name: roomJid.split('@')[0],
        isPermanent: false,
        isOwner: false,
        participants: []
      };
      set({ rooms: [...rooms, newRoom] });
    }
  },

  leaveRoom: (roomJid: string) => {
    const { isConnected, client } = get();
    if (!isConnected || !client) return;

    const presence = xml('presence', {
      to: roomJid,
      type: 'unavailable'
    });

    client.send(presence);
    set({ currentRoomJid: null, nickname: null });
  },

  createRoom: (roomName: string, description: string, options) => {
    const { isConnected, client, currentUser } = get();
    if (!isConnected || !client || !currentUser) return;

    const domain = currentUser.split('@')[1];
    const roomJid = `${roomName}@conference.${domain}`;
    const nickname = currentUser.split('@')[0];

    // Join the room first
    const presence = xml('presence', {
      to: `${roomJid}/${nickname}`,
    }, xml('x', { xmlns: 'http://jabber.org/protocol/muc' }));

    client.send(presence);

    // Configure the room
    setTimeout(() => {
      const configForm = xml('iq', {
        type: 'set',
        to: roomJid,
      }, xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
        xml('x', { xmlns: 'jabber:x:data', type: 'submit' },
          xml('field', { var: 'FORM_TYPE' },
            xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig')
          ),
          xml('field', { var: 'muc#roomconfig_roomname' },
            xml('value', {}, roomName)
          ),
          xml('field', { var: 'muc#roomconfig_roomdesc' },
            xml('value', {}, description)
          ),
          xml('field', { var: 'muc#roomconfig_persistentroom' },
            xml('value', {}, options.isPermanent ? '1' : '0')
          ),
          xml('field', { var: 'muc#roomconfig_membersonly' },
            xml('value', {}, options.isPrivate ? '1' : '0')
          ),
          xml('field', { var: 'muc#roomconfig_publicroom' },
            xml('value', {}, options.isPrivate ? '0' : '1')
          ),
          xml('field', { var: 'muc#roomconfig_passwordprotectedroom' },
            xml('value', {}, options.hasPassword ? '1' : '0')
          ),
          ...(options.hasPassword && options.password ? [
            xml('field', { var: 'muc#roomconfig_roomsecret' },
              xml('value', {}, options.password)
            )
          ] : [])
        )
      ));

      client.send(configForm);
    }, 1000);

    // Add to rooms list
    set((state) => ({
      rooms: [...state.rooms, {
        jid: roomJid,
        name: roomName,
        description,
        isPermanent: options.isPermanent,
        isOwner: true,
        isPrivate: options.isPrivate,
        hasPassword: options.hasPassword,
        participants: []
      }]
    }));
  },

  deleteRoom: (roomJid: string) => {
    const { isConnected, client } = get();
    if (!isConnected || !client) return;

    const destroyIQ = xml('iq', {
      type: 'set',
      to: roomJid,
    },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
        xml('destroy', {})
      )
    );

    client.send(destroyIQ);

    set((state) => ({
      rooms: state.rooms.filter(room => room.jid !== roomJid),
    }));
  },

  fetchRoomAffiliations: async (roomJid: string) => {
    // Implementation placeholder
    console.log('Fetching room affiliations for:', roomJid);
  },

  setRoomAffiliation: (roomJid: string, userJid: string, affiliation: string) => {
    // Implementation placeholder
    console.log('Setting room affiliation:', roomJid, userJid, affiliation);
  },

  updateRoomSettings: (roomJid: string, settings: Record<string, any>) => {
    const { isConnected, client } = get();
    if (!isConnected || !client) return;

    const configForm = xml('iq', {
      type: 'set',
      to: roomJid,
    }, xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
      xml('x', { xmlns: 'jabber:x:data', type: 'submit' },
        xml('field', { var: 'FORM_TYPE' },
          xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig')
        ),
        ...Object.entries(settings).map(([key, value]) => {
          const fieldVar = key.startsWith('muc#roomconfig_') ? key : `muc#roomconfig_${key}`;
          return xml('field', { var: fieldVar },
            xml('value', {}, typeof value === 'boolean' ? (value ? '1' : '0') : String(value))
          );
        })
      )
    ));

    client.send(configForm);

    set((state) => ({
      rooms: state.rooms.map(room => 
        room.jid === roomJid 
          ? { 
              ...room, 
              isPrivate: settings.members_only || room.isPrivate,
              hasPassword: settings.password_protected || room.hasPassword
            }
          : room
      )
    }));
  },

  updateRoomDescription: (roomJid: string, description: string) => {
    set((state) => ({
      rooms: state.rooms.map(room =>
        room.jid === roomJid ? { ...room, description } : room
      )
    }));
  },

  addContact: (contactJid: string) => {
    const { contacts } = get();
    if (!contacts.find(c => c.jid === contactJid)) {
      const newContact: Contact = {
        jid: contactJid,
        name: contactJid.split('@')[0],
        presence: 'offline'
      };
      set({ contacts: [...contacts, newContact] });
    }
  },

  setUserAvatar: (avatar: string) => {
    set({ userAvatar: avatar });
  },

  setRoomAvatar: (roomJid: string, avatar: string) => {
    set((state) => ({
      rooms: state.rooms.map(room =>
        room.jid === roomJid ? { ...room, avatar } : room
      )
    }));
  },

  setActiveChat: (chatJid: string, type: 'chat' | 'groupchat') => {
    set({ activeChat: chatJid, activeChatType: type });
  },

  setUserStatus: (status: 'online' | 'away' | 'dnd' | 'xa') => {
    set({ userStatus: status });
  },

  setContactSortMethod: (method: 'newest' | 'alphabetical') => {
    set({ contactSortMethod: method });
  },

  setRoomSortMethod: (method: 'newest' | 'alphabetical') => {
    set({ roomSortMethod: method });
  },

  fetchServerUsers: async () => {
    // Implementation placeholder
    return [
      { jid: 'user1@localhost', name: 'User 1' },
      { jid: 'user2@localhost', name: 'User 2' }
    ];
  }
}));
