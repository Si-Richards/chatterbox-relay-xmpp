import { client, xml } from '@xmpp/client';
import { XMPPState } from '../types';

export const createConnectionModule = (set: any, get: any) => ({
  connect: async (username: string, password: string) => {
    // Clear intentional disconnect flag when connecting
    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        intentionalDisconnect: false,
      }
    }));

    try {
      const xmppClient = client({
        service: 'wss://ejabberd.voicehost.io:443/websocket',
        domain: 'ejabberd.voicehost.io',
        username: username,
        password: password,
      });

      xmppClient.on('error', (err: any) => {
        console.error('XMPP Error:', err);
        const { handleConnectionUnhealthy } = get();
        handleConnectionUnhealthy();
      });

      xmppClient.on('offline', () => {
        set({ isConnected: false });
        const { stopConnectionHealthCheck } = get();
        stopConnectionHealthCheck();
      });

      xmppClient.on('online', (address: any) => {
        console.log('Connected as:', address.toString());
        set({ 
          isConnected: true, 
          currentUser: address.toString(),
          client: xmppClient 
        });
        
        // Start health monitoring
        const { startConnectionHealthCheck, startPeriodicRoomRefresh } = get();
        startConnectionHealthCheck();
        startPeriodicRoomRefresh();
        
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

        // Auto-accept presence subscriptions and send presence probes to roster contacts
        setTimeout(() => {
          const { contacts } = get();
          contacts.forEach((contact: any) => {
            // Send presence probe to get current status
            const presenceProbe = xml('presence', { to: contact.jid, type: 'probe' });
            xmppClient.send(presenceProbe);
          });
        }, 1000);
      });

      xmppClient.on('stanza', (stanza: any) => {
        // Handle ping responses
        if (stanza.is('iq') && stanza.attrs.type === 'result' && stanza.attrs.id?.startsWith('ping-')) {
          const { handlePingResponse } = get();
          handlePingResponse();
          return;
        }

        // Handle presence subscription requests
        if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
          // Auto-accept subscription requests
          const subscribed = xml('presence', { to: stanza.attrs.from, type: 'subscribed' });
          xmppClient.send(subscribed);
          
          // Send subscription request back
          const subscribe = xml('presence', { to: stanza.attrs.from, type: 'subscribe' });
          xmppClient.send(subscribe);
          
          console.log(`Auto-accepted subscription from ${stanza.attrs.from}`);
        }
        
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
    const { client, stopConnectionHealthCheck, stopPeriodicRoomRefresh } = get();
    
    // Set intentional disconnect flag to prevent auto-reconnection
    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        intentionalDisconnect: true,
      }
    }));
    
    stopConnectionHealthCheck();
    stopPeriodicRoomRefresh();
    
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

  fetchServerUsers: async (): Promise<{ jid: string; name: string; }[]> => {
    const { client } = get();
    if (!client) {
      throw new Error('Not connected to server');
    }

    return new Promise<{ jid: string; name: string; }[]>((resolve, reject) => {
      const queryId = `users-${Date.now()}`;
      
      // Try to get user list from the server's user directory
      const iq = xml(
        'iq',
        { type: 'get', to: 'ejabberd.voicehost.io', id: queryId },
        xml('query', { xmlns: 'http://jabber.org/protocol/disco#items', node: 'users' })
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
                // Filter to only include actual user accounts, not system modules
                if (jid && jid.includes('@ejabberd.voicehost.io') && 
                    !jid.includes('conference') && 
                    !jid.includes('proxy') && 
                    !jid.includes('pubsub') && 
                    !jid.includes('upload') &&
                    !jid.includes('muc') &&
                    !jid.includes('irc') &&
                    !jid.includes('vjud') &&
                    !jid.includes('api') &&
                    !jid.includes('admin') &&
                    !jid.includes('mod_') &&
                    !jid.includes('system') &&
                    // Only include if it looks like a real username (no dots, underscores in system names)
                    !jid.split('@')[0].includes('.') &&
                    jid.split('@')[0].length > 1) {
                  users.push({
                    jid: jid,
                    name: jid.split('@')[0]
                  });
                }
              });
            }
            
            if (users.length > 0) {
              const currentUser = get().currentUser;
              const filteredUsers = users.filter(user => user.jid !== currentUser);
              resolve(filteredUsers);
            } else {
              // Fallback to common usernames if server doesn't return user list
              const commonUsers: { jid: string; name: string; }[] = [
                { jid: 'demo@ejabberd.voicehost.io', name: 'demo' },
                { jid: 'test@ejabberd.voicehost.io', name: 'test' },
                { jid: 'user@ejabberd.voicehost.io', name: 'user' },
                { jid: 'guest@ejabberd.voicehost.io', name: 'guest' },
                { jid: 'support@ejabberd.voicehost.io', name: 'support' }
              ];
              
              const currentUser = get().currentUser;
              const filteredUsers = commonUsers.filter(user => user.jid !== currentUser);
              resolve(filteredUsers);
            }
          } else {
            // Server doesn't support user listing, use fallback
            const commonUsers: { jid: string; name: string; }[] = [
              { jid: 'demo@ejabberd.voicehost.io', name: 'demo' },
              { jid: 'test@ejabberd.voicehost.io', name: 'test' },
              { jid: 'user@ejabberd.voicehost.io', name: 'user' },
              { jid: 'guest@ejabberd.voicehost.io', name: 'guest' },
              { jid: 'support@ejabberd.voicehost.io', name: 'support' }
            ];
            
            const currentUser = get().currentUser;
            const filteredUsers = commonUsers.filter(user => user.jid !== currentUser);
            resolve(filteredUsers);
          }
        }
      };

      client.on('stanza', handleResponse);
      client.send(iq);
      
      // Timeout fallback
      setTimeout(() => {
        client.off('stanza', handleResponse);
        const commonUsers: { jid: string; name: string; }[] = [
          { jid: 'demo@ejabberd.voicehost.io', name: 'demo' },
          { jid: 'test@ejabberd.voicehost.io', name: 'test' },
          { jid: 'user@ejabberd.voicehost.io', name: 'user' },
          { jid: 'guest@ejabberd.voicehost.io', name: 'guest' },
          { jid: 'support@ejabberd.voicehost.io', name: 'support' }
        ];
        
        const currentUser = get().currentUser;
        const filteredUsers = commonUsers.filter(user => user.jid !== currentUser);
        resolve(filteredUsers);
      }, 5000);
    });
  }
});
