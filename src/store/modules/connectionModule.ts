
import { client, xml } from '@xmpp/client';
import { XMPPState } from '../types';
import { createUserStatusModule } from './userStatusModule';
import { createServerUsersModule } from './serverUsersModule';

export const createConnectionModule = (set: any, get: any) => ({
  ...createUserStatusModule(set, get),
  ...createServerUsersModule(set, get),
  
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
});
