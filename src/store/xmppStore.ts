
import { create } from 'zustand';
import { client, xml } from '@xmpp/client';

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  type: 'chat' | 'groupchat';
}

interface Contact {
  jid: string;
  name: string;
  presence: 'online' | 'offline' | 'away';
}

interface Room {
  jid: string;
  name: string;
  participants: string[];
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
  
  // Actions
  connect: (username: string, password: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (to: string, body: string, type: 'chat' | 'groupchat') => void;
  addContact: (jid: string) => void;
  createRoom: (roomName: string) => void;
  joinRoom: (roomJid: string) => void;
  setActiveChat: (jid: string, type: 'chat' | 'groupchat') => void;
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
        } else {
          // Handle messages
          if (stanza.is('message')) {
            const from = stanza.attrs.from;
            const to = stanza.attrs.to;
            const type = stanza.attrs.type || 'chat';
            const body = stanza.getChildText('body');
            
            if (body) {
              const message: Message = {
                id: Date.now().toString(),
                from,
                to,
                body,
                timestamp: new Date(),
                type: type as 'chat' | 'groupchat'
              };
              
              const chatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
              
              set((state) => ({
                messages: {
                  ...state.messages,
                  [chatJid]: [...(state.messages[chatJid] || []), message]
                }
              }));
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

    const message = xml(
      'message',
      { to, type },
      xml('body', {}, body.trim())
    );

    client.send(message);

    // Add to local messages
    const newMessage: Message = {
      id: Date.now().toString(),
      from: currentUser,
      to,
      body: body.trim(),
      timestamp: new Date(),
      type
    };

    const chatJid = type === 'groupchat' ? to : to.split('/')[0];
    
    set((state) => ({
      messages: {
        ...state.messages,
        [chatJid]: [...(state.messages[chatJid] || []), newMessage]
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

  setActiveChat: (jid: string, type: 'chat' | 'groupchat') => {
    set({ activeChat: jid, activeChatType: type });
  }
}));
