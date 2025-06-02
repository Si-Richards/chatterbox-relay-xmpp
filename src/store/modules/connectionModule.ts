
import { client, xml } from '@xmpp/client';
import { XMPPState } from '../types';
import { createUserStatusModule } from './userStatusModule';
import { createServerUsersModule } from './serverUsersModule';

export const createConnectionModule = (set: any, get: any) => ({
  ...createUserStatusModule(set, get),
  ...createServerUsersModule(set, get),
  
  connect: async (username: string, password: string) => {
    // Clear all dynamic data before connecting to ensure fresh state
    set({
      contacts: [],
      rooms: [],
      messages: {},
      activeChat: null,
      activeChatType: null,
      typingStates: {},
      currentUserTyping: {},
      connectionHealth: {
        isHealthy: true,
        lastPing: null,
        lastPingResponse: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        pingInterval: null,
        reconnectTimeout: null,
        intentionalDisconnect: false,
        currentPingId: null,
      },
      refreshState: {
        isRefreshing: false,
        contactsLoaded: false,
        messagesLoaded: false,
        roomsLoaded: false,
        lastRefresh: null,
      }
    });

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
        console.log('XMPP client went offline');
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
        
        // Start comprehensive data refresh after initial connection
        setTimeout(() => {
          const { refreshAllData } = get();
          refreshAllData().catch(error => {
            console.error('Initial data refresh failed:', error);
          });
        }, 1000); // Give connection time to stabilize

        // Auto-accept presence subscriptions
        setTimeout(() => {
          console.log('Connection fully established, ready for subscriptions');
        }, 2000);
      });

      xmppClient.on('stanza', (stanza: any) => {
        // Handle ping responses with proper ID tracking
        if (stanza.is('iq') && stanza.attrs.type === 'result' && stanza.attrs.id?.startsWith('ping-')) {
          const { handlePingResponse } = get();
          console.log('Received ping response for ID:', stanza.attrs.id);
          handlePingResponse(stanza.attrs.id);
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
    
    console.log('Disconnecting - setting intentional disconnect flag');
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
    
    // Clear all dynamic data on disconnect to ensure fresh state on next connection
    set({ 
      isConnected: false, 
      client: null, 
      currentUser: '',
      contacts: [],
      rooms: [],
      messages: {},
      activeChat: null,
      activeChatType: null,
      typingStates: {},
      currentUserTyping: {},
      refreshState: {
        isRefreshing: false,
        contactsLoaded: false,
        messagesLoaded: false,
        roomsLoaded: false,
        lastRefresh: null,
      }
    });
  },
});
