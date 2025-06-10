
import { xml } from '@xmpp/client';

interface PingAttempt {
  id: string;
  timestamp: Date;
  retryCount: number;
}

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
    consecutiveFailures: 0,
    maxConsecutiveFailures: 3,
    pingHistory: [] as PingAttempt[],
    connectionQuality: 'good' as 'excellent' | 'good' | 'poor' | 'unstable',
    lastLatency: null as number | null,
  },

  startConnectionHealthCheck: () => {
    const { client } = get();
    if (!client) return;

    // Clear existing interval
    const { connectionHealth } = get();
    if (connectionHealth.pingInterval) {
      clearInterval(connectionHealth.pingInterval);
    }

    // Send ping every 120 seconds (reduced frequency)
    const pingInterval = setInterval(() => {
      const { client, sendPing, connectionHealth } = get();
      if (client && client.status === 'online' && !connectionHealth.intentionalDisconnect) {
        console.log('Sending periodic ping...');
        sendPing();
      }
    }, 120000); // Increased from 60s to 120s

    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        pingInterval,
        isHealthy: true,
        intentionalDisconnect: false,
        consecutiveFailures: 0,
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
    const pingTime = new Date();
    const ping = xml('iq', { type: 'get', id: pingId }, xml('ping', { xmlns: 'urn:xmpp:ping' }));
    
    console.log('Sending ping with ID:', pingId);
    client.send(ping);
    
    // Add to ping history
    const pingAttempt: PingAttempt = {
      id: pingId,
      timestamp: pingTime,
      retryCount: 0
    };

    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        lastPing: pingTime,
        currentPingId: pingId,
        pingHistory: [...state.connectionHealth.pingHistory.slice(-9), pingAttempt] // Keep last 10
      }
    }));

    // Set timeout for ping response (30 seconds)
    setTimeout(() => {
      const { connectionHealth, handlePingTimeout } = get();
      
      if (connectionHealth.currentPingId === pingId && 
          (!connectionHealth.lastPingResponse || 
           connectionHealth.lastPingResponse < connectionHealth.lastPing) &&
          !connectionHealth.intentionalDisconnect) {
        console.warn('Ping timeout - no response received for ping:', pingId);
        handlePingTimeout(pingId);
      }
    }, 30000);
  },

  handlePingResponse: (pingId?: string) => {
    console.log('Received ping response for ID:', pingId);
    const responseTime = new Date();
    const { connectionHealth } = get();
    
    // Calculate latency if we have the ping time
    let latency = null;
    if (connectionHealth.lastPing && pingId === connectionHealth.currentPingId) {
      latency = responseTime.getTime() - connectionHealth.lastPing.getTime();
    }

    // Determine connection quality based on latency
    let quality: 'excellent' | 'good' | 'poor' | 'unstable' = 'good';
    if (latency !== null) {
      if (latency < 200) quality = 'excellent';
      else if (latency < 1000) quality = 'good';
      else if (latency < 3000) quality = 'poor';
      else quality = 'unstable';
    }

    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        isHealthy: true,
        consecutiveFailures: 0,
        lastPingResponse: responseTime,
        currentPingId: null,
        lastLatency: latency,
        connectionQuality: quality,
      }
    }));
  },

  handlePingTimeout: (pingId: string) => {
    const { connectionHealth } = get();
    const newFailureCount = connectionHealth.consecutiveFailures + 1;
    
    console.warn(`Ping timeout #${newFailureCount} for ping:`, pingId);
    
    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        consecutiveFailures: newFailureCount,
        connectionQuality: 'unstable',
      }
    }));

    // Only mark as unhealthy after max consecutive failures
    if (newFailureCount >= connectionHealth.maxConsecutiveFailures) {
      console.error('Connection marked as unhealthy after', newFailureCount, 'consecutive failures');
      get().handleConnectionUnhealthy();
    } else {
      console.log(`${newFailureCount}/${connectionHealth.maxConsecutiveFailures} consecutive failures - retrying...`);
      // Retry ping with exponential backoff
      setTimeout(() => {
        if (!get().connectionHealth.intentionalDisconnect) {
          get().sendPing();
        }
      }, Math.min(1000 * Math.pow(2, newFailureCount - 1), 10000));
    }
  },

  handleConnectionUnhealthy: () => {
    const { connectionHealth } = get();
    
    if (connectionHealth.intentionalDisconnect) {
      console.log('Ignoring connection health issue - disconnect was intentional');
      return;
    }
    
    console.warn('Connection marked as unhealthy');
    set((state: any) => ({
      connectionHealth: {
        ...state.connectionHealth,
        isHealthy: false,
        connectionQuality: 'unstable',
      }
    }));
  },

  attemptReconnect: () => {
    const { connectionHealth } = get();
    
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
        consecutiveFailures: 0,
        maxConsecutiveFailures: 3,
        pingHistory: [],
        connectionQuality: 'good',
        lastLatency: null,
      }
    }));
  },

  getConnectionQuality: () => {
    const { connectionHealth } = get();
    return connectionHealth.connectionQuality;
  },

  shouldReduceActivity: () => {
    const { connectionHealth } = get();
    return connectionHealth.connectionQuality === 'poor' || connectionHealth.connectionQuality === 'unstable';
  },
});
