
import { xml } from '@xmpp/client';

export const createConnectionHealthModule = (set: any, get: any) => ({
  connectionHealth: {
    isHealthy: true,
    lastPing: null as Date | null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    pingInterval: null as NodeJS.Timeout | null,
    reconnectTimeout: null as NodeJS.Timeout | null,
  },

  startConnectionHealthCheck: () => {
    const { client } = get();
    if (!client) return;

    // Clear existing interval
    const { connectionHealth } = get();
    if (connectionHealth.pingInterval) {
      clearInterval(connectionHealth.pingInterval);
    }

    // Send ping every 30 seconds
    const pingInterval = setInterval(() => {
      const { client, sendPing } = get();
      if (client && client.status === 'online') {
        sendPing();
      }
    }, 30000);

    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        pingInterval,
        isHealthy: true,
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
    const { client } = get();
    if (!client) return;

    const pingId = `ping-${Date.now()}`;
    const ping = xml('iq', { type: 'get', id: pingId }, xml('ping', { xmlns: 'urn:xmpp:ping' }));
    
    client.send(ping);
    
    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        lastPing: new Date(),
      }
    }));

    // Set timeout for ping response
    setTimeout(() => {
      const { connectionHealth, handleConnectionUnhealthy } = get();
      const timeSinceLastPing = Date.now() - (connectionHealth.lastPing?.getTime() || 0);
      
      if (timeSinceLastPing > 10000) { // No response for 10 seconds
        handleConnectionUnhealthy();
      }
    }, 10000);
  },

  handlePingResponse: () => {
    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        isHealthy: true,
        reconnectAttempts: 0,
      }
    }));
  },

  handleConnectionUnhealthy: () => {
    const { connectionHealth, attemptReconnect } = get();
    
    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        isHealthy: false,
      }
    }));

    if (connectionHealth.reconnectAttempts < connectionHealth.maxReconnectAttempts) {
      attemptReconnect();
    }
  },

  attemptReconnect: () => {
    const { connectionHealth, disconnect, connect } = get();
    const backoffDelay = Math.min(1000 * Math.pow(2, connectionHealth.reconnectAttempts), 30000);

    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        reconnectAttempts: state.connectionHealth.reconnectAttempts + 1,
      }
    }));

    const reconnectTimeout = setTimeout(async () => {
      try {
        // Store credentials from previous connection
        const currentUser = get().currentUser;
        if (currentUser) {
          disconnect();
          // Note: In a real implementation, you'd need to store username/password
          // For now, we'll just show the reconnect button
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
    disconnect();
    
    set((state: any) => ({
      connectionHealth: {
        isHealthy: true,
        lastPing: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        pingInterval: null,
        reconnectTimeout: null,
      }
    }));
  },
});
