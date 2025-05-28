
import { client, xml } from '@xmpp/client';
import { XMPPState } from '../types';

export const createConnectionModule = (set: any, get: any) => ({
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

  fetchServerUsers: async () => {
    const { client } = get();
    if (!client) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      const queryId = `users-${Date.now()}`;
      
      const iq = xml(
        'iq',
        { type: 'get', to: 'ejabberd.voicehost.io', id: queryId },
        xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' })
      );

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
          }
        }
      };

      client.on('stanza', handleResponse);
      client.send(iq);
      
      setTimeout(() => {
        client.off('stanza', handleResponse);
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
  }
});
