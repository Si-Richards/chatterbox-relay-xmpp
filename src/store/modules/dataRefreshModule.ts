import { xml } from '@xmpp/client';
import { toast } from '@/hooks/use-toast';
import { RefreshState } from '../types';

export const createDataRefreshModule = (set: any, get: any) => ({
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
      description: "Loading contacts, rooms, and messages...",
      duration: 3000
    });

    try {
      // Phase 1: Load contacts first
      await get().refreshContacts();
      
      // Phase 2: Load rooms
      await get().refreshRooms();
      
      // Phase 3: Verify room ownership using server affiliations (NEW APPROACH)
      await get().verifyAllRoomOwnership();
      
      // Phase 4: Load direct messages
      await get().refreshDirectMessages();
      
      // Phase 5: Load room messages for each room
      await get().refreshAllRoomMessages();
      
      // Phase 6: Refresh all room affiliations
      await get().refreshAllRoomAffiliations();
      
      setRefreshState({ 
        isRefreshing: false, 
        lastRefresh: new Date(),
        messagesLoaded: true
      });

      toast({
        title: "Data Refreshed",
        description: "All data has been updated successfully",
        duration: 2000
      });

      // Phase 7: Send presence probes to contacts
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

  refreshAllRoomAffiliations: async () => {
    const { rooms, fetchRoomAffiliations } = get();
    if (!rooms.length) {
      console.log('No rooms to refresh affiliations for');
      return;
    }

    console.log(`Refreshing affiliations for ${rooms.length} rooms...`);
    
    // Process rooms in batches to avoid overwhelming the server
    const batchSize = 3;
    for (let i = 0; i < rooms.length; i += batchSize) {
      const batch = rooms.slice(i, i + batchSize);
      
      const promises = batch.map(async (room: any) => {
        try {
          console.log(`Fetching affiliations for room: ${room.jid}`);
          await fetchRoomAffiliations(room.jid);
        } catch (error) {
          console.error(`Failed to fetch affiliations for room ${room.jid}:`, error);
        }
      });
      
      await Promise.allSettled(promises);
      
      // Small delay between batches
      if (i + batchSize < rooms.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('Finished refreshing all room affiliations');
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

  refreshDirectMessages: (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const { client } = get();
      if (!client) {
        reject(new Error('No client connection'));
        return;
      }

      console.log('Refreshing direct messages...');
      const requestId = `mam-direct-${Date.now()}`;
      let resolved = false;

      // Request direct messages from the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const mamQuery = xml(
        'iq',
        { type: 'set', id: requestId },
        xml('query', { xmlns: 'urn:xmpp:mam:2' },
          xml('x', { xmlns: 'jabber:x:data', type: 'submit' },
            xml('field', { var: 'FORM_TYPE' },
              xml('value', {}, 'urn:xmpp:mam:2')
            ),
            xml('field', { var: 'start' },
              xml('value', {}, thirtyDaysAgo.toISOString())
            ),
            xml('field', { var: 'with' },
              xml('value', {}, '') // Empty for direct messages only
            )
          )
        )
      );
      
      client.send(mamQuery);
      
      // Give MAM time to send all direct messages
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log('Direct messages refresh completed');
          resolve();
        }
      }, 4000);
    });
  },

  refreshAllRoomMessages: async () => {
    const { rooms } = get();
    
    console.log('Refreshing messages for all rooms...');
    
    // Process rooms in batches to avoid overwhelming the server
    const batchSize = 3;
    for (let i = 0; i < rooms.length; i += batchSize) {
      const batch = rooms.slice(i, i + batchSize);
      
      const promises = batch.map(async (room: any) => {
        try {
          console.log(`Fetching messages for room: ${room.jid}`);
          await get().refreshRoomMessages(room.jid);
        } catch (error) {
          console.error(`Failed to fetch messages for room ${room.jid}:`, error);
        }
      });
      
      await Promise.allSettled(promises);
      
      // Small delay between batches
      if (i + batchSize < rooms.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('Finished refreshing all room messages');
  },

  refreshRoomMessages: (roomJid: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const { client } = get();
      if (!client) {
        reject(new Error('No client connection'));
        return;
      }

      console.log(`Refreshing messages for room: ${roomJid}`);
      const requestId = `mam-room-${Date.now()}`;
      let resolved = false;

      // Request room messages from the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const mamQuery = xml(
        'iq',
        { type: 'set', to: roomJid, id: requestId },
        xml('query', { xmlns: 'urn:xmpp:mam:2' },
          xml('x', { xmlns: 'jabber:x:data', type: 'submit' },
            xml('field', { var: 'FORM_TYPE' },
              xml('value', {}, 'urn:xmpp:mam:2')
            ),
            xml('field', { var: 'start' },
              xml('value', {}, thirtyDaysAgo.toISOString())
            )
          )
        )
      );
      
      client.send(mamQuery);
      
      // Give MAM time to send room messages
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log(`Room messages refresh completed for: ${roomJid}`);
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
