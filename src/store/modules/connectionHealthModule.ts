
import { xml } from '@xmpp/client';

export const createConnectionHealthModule = (set: any, get: any) => ({
  connectionHealth: {
    isHealthy: true,
    lastPing: null as Date | null,
    lastPingResponse: null as Date | null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    pingInterval: null as NodeJS.Timeout | null,
    reconnectTimeout: null as NodeJS.Timeout | null,
    intentionalDisconnect: false,
    currentPingId: null as string | null,
  },

  startConnectionHealthCheck: () => {
    const { client } = get();
    if (!client) return;

    // Clear existing interval
    const { connectionHealth } = get();
    if (connectionHealth.pingInterval) {
      clearInterval(connectionHealth.pingInterval);
    }

    // Send ping every 60 seconds (increased from 30)
    const pingInterval = setInterval(() => {
      const { client, sendPing, connectionHealth } = get();
      if (client && client.status === 'online' && !connectionHealth.intentionalDisconnect) {
        console.log('Sending periodic ping...');
        sendPing();
      }
    }, 60000);

    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        pingInterval,
        isHealthy: true,
        intentionalDisconnect: false,
      }
    }));
  },

  stopConnectionHealthCheck: () => {
    const { connectionHealth } = get();
    if (connectionHealth.pingInterval) {
      clearInterval(connectionHealth.pingInterval);
    }
    if (connectionHealth.reconnectTimeout) {
      clearTimeout(connectionHealth.reconnectTimeout);
    }

    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        pingInterval: null,
        reconnectTimeout: null,
      }
    }));
  },

  sendPing: () => {
    const { client, connectionHealth } = get();
    if (!client || connectionHealth.intentionalDisconnect) return;

    const pingId = `ping-${Date.now()}`;
    const ping = xml('iq', { type: 'get', id: pingId }, xml('ping', { xmlns: 'urn:xmpp:ping' }));
    
    console.log('Sending ping with ID:', pingId);
    client.send(ping);
    
    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        lastPing: new Date(),
        currentPingId: pingId,
      }
    }));

    // Set timeout for ping response (increased to 30 seconds)
    setTimeout(() => {
      const { connectionHealth, handleConnectionUnhealthy } = get();
      
      // Only mark as unhealthy if we haven't received a response for this specific ping
      if (connectionHealth.currentPingId === pingId && 
          (!connectionHealth.lastPingResponse || 
           connectionHealth.lastPingResponse < connectionHealth.lastPing) &&
          !connectionHealth.intentionalDisconnect) {
        console.warn('Ping timeout - no response received for ping:', pingId);
        handleConnectionUnhealthy();
      }
    }, 30000);
  },

  handlePingResponse: (pingId?: string) => {
    console.log('Received ping response for ID:', pingId);
    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        isHealthy: true,
        reconnectAttempts: 0,
        lastPingResponse: new Date(),
        currentPingId: null,
      }
    }));
  },

  handleConnectionUnhealthy: () => {
    const { connectionHealth } = get();
    
    // Don't mark as unhealthy if disconnect was intentional
    if (connectionHealth.intentionalDisconnect) {
      console.log('Ignoring connection health issue - disconnect was intentional');
      return;
    }
    
    console.warn('Connection marked as unhealthy');
    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        isHealthy: false,
      }
    }));

    // Don't automatically disconnect - just show connection issues
    // This prevents unexpected logouts
  },

  attemptReconnect: () => {
    const { connectionHealth } = get();
    
    // Don't attempt reconnect if disconnect was intentional
    if (connectionHealth.intentionalDisconnect) {
      return;
    }
    
    const backoffDelay = Math.min(1000 * Math.pow(2, connectionHealth.reconnectAttempts), 30000);

    console.log('Scheduling reconnect attempt in', backoffDelay, 'ms');
    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        reconnectAttempts: state.connectionHealth.reconnectAttempts + 1,
      }
    }));

    const reconnectTimeout = setTimeout(async () => {
      try {
        const currentUser = get().currentUser;
        if (currentUser && !get().connectionHealth.intentionalDisconnect) {
          console.log('Attempting automatic reconnection...');
          // In a real implementation, you'd store credentials and reconnect
          // For now, we'll just mark as needing manual reconnection
          set((state: any) => ({
            connectionHealth: {
              ...state.connectionHealth,
              isHealthy: false,
            }
          }));
        }
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, backoffDelay);

    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        reconnectTimeout,
      }
    }));
  },

  manualReconnect: () => {
    const { disconnect } = get();
    console.log('Manual reconnect requested');
    disconnect();
    
    set((state: any) => ({
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
      }
    }));
  },
});
