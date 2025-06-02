
import { xml } from '@xmpp/client';
import { toast } from '@/hooks/use-toast';

export interface RefreshState {
  isRefreshing: boolean;
  contactsLoaded: boolean;
  messagesLoaded: boolean;
  roomsLoaded: boolean;
  lastRefresh: Date | null;
}

export const createDataRefreshModule = (set: any, get: any) => ({
  refreshState: {
    isRefreshing: false,
    contactsLoaded: false,
    messagesLoaded: false,
    roomsLoaded: false,
    lastRefresh: null,
  } as RefreshState,

  setRefreshState: (updates: Partial<RefreshState>) => {
    set((state: any) => ({
      refreshState: { ...state.refreshState, ...updates }
    }));
  },

  refreshAllData: async () => {
    const { client, setRefreshState } = get();
    if (!client) return;

    console.log('Starting complete data refresh...');
    setRefreshState({ 
      isRefreshing: true, 
      contactsLoaded: false, 
      messagesLoaded: false, 
      roomsLoaded: false 
    });

    toast({
      title: "Refreshing Data",
      description: "Loading contacts and messages...",
      duration: 3000
    });

    try {
      // Phase 1: Load contacts first
      await get().refreshContacts();
      
      // Phase 2: Load messages after contacts are loaded
      await get().refreshMessages();
      
      // Phase 3: Load rooms last
      await get().refreshRooms();
      
      setRefreshState({ 
        isRefreshing: false, 
        lastRefresh: new Date() 
      });

      toast({
        title: "Data Refreshed",
        description: "All contacts and messages have been updated",
        duration: 2000
      });

      // Phase 4: Send presence probes to contacts in batches
      setTimeout(() => {
        get().sendPresenceProbes();
      }, 1000);

    } catch (error) {
      console.error('Data refresh failed:', error);
      setRefreshState({ isRefreshing: false });
      
      toast({
        title: "Refresh Failed",
        description: "Some data could not be loaded. Please try again.",
        variant: "destructive",
        duration: 4000
      });
    }
  },

  refreshContacts: (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const { client, setRefreshState } = get();
      if (!client) {
        reject(new Error('No client connection'));
        return;
      }

      console.log('Refreshing contacts...');
      const requestId = `roster-refresh-${Date.now()}`;
      let resolved = false;

      const handleResponse = (stanza: any) => {
        if (stanza.is('iq') && stanza.attrs.id === requestId && !resolved) {
          resolved = true;
          client.off('stanza', handleResponse);
          
          if (stanza.attrs.type === 'result') {
            console.log('Contacts refreshed successfully');
            setRefreshState({ contactsLoaded: true });
            resolve();
          } else {
            console.error('Failed to refresh contacts');
            reject(new Error('Contact refresh failed'));
          }
        }
      };

      client.on('stanza', handleResponse);
      
      const rosterIq = xml(
        'iq',
        { type: 'get', id: requestId },
        xml('query', { xmlns: 'jabber:iq:roster' })
      );
      
      client.send(rosterIq);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          client.off('stanza', handleResponse);
          reject(new Error('Contact refresh timeout'));
        }
      }, 10000);
    });
  },

  refreshMessages: (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const { client, setRefreshState } = get();
      if (!client) {
        reject(new Error('No client connection'));
        return;
      }

      console.log('Refreshing messages...');
      const requestId = `mam-refresh-${Date.now()}`;
      let resolved = false;

      // MAM doesn't send a direct response, so we'll wait for messages to start coming in
      const mamQuery = xml(
        'iq',
        { type: 'set', id: requestId },
        xml('query', { xmlns: 'urn:xmpp:mam:2' })
      );
      
      client.send(mamQuery);
      
      // Give MAM some time to send messages, then consider it done
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log('Messages refresh completed');
          setRefreshState({ messagesLoaded: true });
          resolve();
        }
      }, 3000);
    });
  },

  refreshRooms: (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const { client, setRefreshState } = get();
      if (!client) {
        reject(new Error('No client connection'));
        return;
      }

      console.log('Refreshing rooms...');
      const requestId = `rooms-refresh-${Date.now()}`;
      let resolved = false;

      const handleResponse = (stanza: any) => {
        if (stanza.is('iq') && stanza.attrs.id === requestId && !resolved) {
          resolved = true;
          client.off('stanza', handleResponse);
          
          if (stanza.attrs.type === 'result') {
            console.log('Rooms refreshed successfully');
            setRefreshState({ roomsLoaded: true });
            resolve();
          } else {
            console.log('Room refresh completed (no rooms or error)');
            setRefreshState({ roomsLoaded: true });
            resolve(); // Don't fail if no rooms exist
          }
        }
      };

      client.on('stanza', handleResponse);
      
      const discoIq = xml(
        'iq',
        { type: 'get', to: 'conference.ejabberd.voicehost.io', id: requestId },
        xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' })
      );
      
      client.send(discoIq);

      // Timeout after 8 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          client.off('stanza', handleResponse);
          setRefreshState({ roomsLoaded: true });
          resolve(); // Don't fail on timeout for rooms
        }
      }, 8000);
    });
  },

  sendPresenceProbes: () => {
    const { client, contacts } = get();
    if (!client || !contacts.length) return;

    console.log(`Sending presence probes to ${contacts.length} contacts...`);
    
    // Send presence probes in batches of 5 with 200ms delay between batches
    const batchSize = 5;
    const delay = 200;
    
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      setTimeout(() => {
        batch.forEach((contact: any) => {
          const presenceProbe = xml('presence', { to: contact.jid, type: 'probe' });
          client.send(presenceProbe);
        });
      }, (i / batchSize) * delay);
    }
  },

  retryOperation: async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.log(`Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1);
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError!;
  }
});
