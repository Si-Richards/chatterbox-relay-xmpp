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
    const { client, setRefreshState, getConnectionQuality } = get();
    if (!client) return;

    console.log('Starting adaptive data refresh...');
    const connectionQuality = getConnectionQuality();
    
    setRefreshState({ 
      isRefreshing: true, 
      contactsLoaded: false, 
      messagesLoaded: false, 
      roomsLoaded: false 
    });

    toast({
      title: "Refreshing Data",
      description: `Loading data (${connectionQuality} connection)...`,
      duration: 3000
    });

    try {
      // Phase 1: Critical data first
      await get().refreshCriticalData();
      
      // Phase 2: Adaptive loading based on connection quality
      if (connectionQuality === 'excellent' || connectionQuality === 'good') {
        await get().refreshAllDataFull();
      } else {
        await get().refreshDataLimited();
      }
      
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

  refreshCriticalData: async () => {
    console.log('Loading critical data...');
    
    // Load contacts first (needed for message attribution)
    await get().refreshContacts();
    
    // Load rooms list
    await get().refreshRooms();
    
    // Verify ownership for active room only
    const { activeChat, activeChatType } = get();
    if (activeChatType === 'room' && activeChat) {
      await get().verifyRoomOwnership(activeChat);
    }
  },

  refreshAllDataFull: async () => {
    console.log('Loading full data set (good connection)...');
    
    // Load all room ownership
    await get().verifyAllRoomOwnership();
    
    // Load recent messages
    await get().refreshDirectMessages();
    await get().refreshAllRoomMessages();
    
    // Load affiliations for owned rooms only
    await get().refreshOwnedRoomAffiliations();
    
    // Send presence probes
    setTimeout(() => {
      get().sendPresenceProbes();
    }, 1000);
  },

  refreshDataLimited: async () => {
    console.log('Loading limited data set (poor connection)...');
    
    // Only load messages for active chat
    const { activeChat, activeChatType } = get();
    if (activeChat) {
      if (activeChatType === 'room') {
        await get().refreshRoomMessages(activeChat);
        await get().fetchRoomAffiliations(activeChat);
      } else {
        await get().refreshDirectMessages();
      }
    }
    
    // Defer other operations
    setTimeout(() => {
      if (get().getConnectionQuality() !== 'unstable') {
        get().refreshRemainingData();
      }
    }, 5000);
  },

  refreshRemainingData: async () => {
    console.log('Loading remaining data...');
    
    try {
      await get().verifyAllRoomOwnership();
      await get().refreshOwnedRoomAffiliations();
      get().sendPresenceProbes();
    } catch (error) {
      console.error('Failed to load remaining data:', error);
    }
  },

  refreshOwnedRoomAffiliations: async () => {
    const { rooms, fetchRoomAffiliations } = get();
    const ownedRooms = rooms.filter((room: any) => room.isOwner);
    
    if (!ownedRooms.length) {
      console.log('No owned rooms to refresh affiliations for');
      return;
    }

    console.log(`Refreshing affiliations for ${ownedRooms.length} owned rooms...`);
    
    for (const room of ownedRooms) {
      try {
        await fetchRoomAffiliations(room.jid);
        // Small delay to avoid overwhelming server
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Failed to fetch affiliations for room ${room.jid}:`, error);
      }
    }
    
    console.log('Finished refreshing owned room affiliations');
  },

  refreshAllRoomAffiliations: async () => {
    const { getConnectionQuality } = get();
    
    // Only refresh all affiliations on good connections
    if (getConnectionQuality() === 'poor' || getConnectionQuality() === 'unstable') {
      console.log('Skipping full affiliation refresh due to poor connection');
      return get().refreshOwnedRoomAffiliations();
    }

    const { rooms, fetchRoomAffiliations } = get();
    if (!rooms.length) {
      console.log('No rooms to refresh affiliations for');
      return;
    }

    console.log(`Refreshing affiliations for ${rooms.length} rooms...`);
    
    // Process rooms in smaller batches for better performance
    const batchSize = 2;
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
      
      // Longer delay between batches
      if (i + batchSize < rooms.length) {
        await new Promise(resolve => setTimeout(resolve, 800));
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
      const { client, getConnectionQuality } = get();
      if (!client) {
        reject(new Error('No client connection'));
        return;
      }

      console.log('Refreshing direct messages...');
      const requestId = `mam-direct-${Date.now()}`;
      let resolved = false;

      // Adjust timeframe based on connection quality
      const connectionQuality = getConnectionQuality();
      const daysBack = connectionQuality === 'excellent' ? 30 : 
                      connectionQuality === 'good' ? 14 : 7;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const mamQuery = xml(
        'iq',
        { type: 'set', id: requestId },
        xml('query', { xmlns: 'urn:xmpp:mam:2' },
          xml('x', { xmlns: 'jabber:x:data', type: 'submit' },
            xml('field', { var: 'FORM_TYPE' },
              xml('value', {}, 'urn:xmpp:mam:2')
            ),
            xml('field', { var: 'start' },
              xml('value', {}, startDate.toISOString())
            ),
            xml('field', { var: 'with' },
              xml('value', {}, '')
            )
          )
        )
      );
      
      client.send(mamQuery);
      
      const timeout = connectionQuality === 'excellent' ? 4000 : 
                     connectionQuality === 'good' ? 3000 : 2000;
      
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log('Direct messages refresh completed');
          resolve();
        }
      }, timeout);
    });
  },

  refreshAllRoomMessages: async () => {
    const { rooms, getConnectionQuality } = get();
    const connectionQuality = getConnectionQuality();
    
    console.log('Refreshing messages for all rooms...');
    
    // Limit rooms based on connection quality
    const maxRooms = connectionQuality === 'excellent' ? rooms.length :
                     connectionQuality === 'good' ? Math.min(rooms.length, 10) : 
                     Math.min(rooms.length, 5);
    
    const roomsToProcess = rooms.slice(0, maxRooms);
    const batchSize = connectionQuality === 'excellent' ? 3 : 2;
    
    for (let i = 0; i < roomsToProcess.length; i += batchSize) {
      const batch = roomsToProcess.slice(i, i + batchSize);
      
      const promises = batch.map(async (room: any) => {
        try {
          console.log(`Fetching messages for room: ${room.jid}`);
          await get().refreshRoomMessages(room.jid);
        } catch (error) {
          console.error(`Failed to fetch messages for room ${room.jid}:`, error);
        }
      });
      
      await Promise.allSettled(promises);
      
      if (i + batchSize < roomsToProcess.length) {
        const delay = connectionQuality === 'excellent' ? 300 : 600;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log('Finished refreshing room messages');
  },

  refreshRoomMessages: (roomJid: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const { client, getConnectionQuality } = get();
      if (!client) {
        reject(new Error('No client connection'));
        return;
      }

      console.log(`Refreshing messages for room: ${roomJid}`);
      const requestId = `mam-room-${Date.now()}`;
      let resolved = false;

      const connectionQuality = getConnectionQuality();
      const daysBack = connectionQuality === 'excellent' ? 30 : 
                      connectionQuality === 'good' ? 14 : 7;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const mamQuery = xml(
        'iq',
        { type: 'set', to: roomJid, id: requestId },
        xml('query', { xmlns: 'urn:xmpp:mam:2' },
          xml('x', { xmlns: 'jabber:x:data', type: 'submit' },
            xml('field', { var: 'FORM_TYPE' },
              xml('value', {}, 'urn:xmpp:mam:2')
            ),
            xml('field', { var: 'start' },
              xml('value', {}, startDate.toISOString())
            )
          )
        )
      );
      
      client.send(mamQuery);
      
      const timeout = connectionQuality === 'excellent' ? 3000 : 
                     connectionQuality === 'good' ? 2500 : 2000;
      
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log(`Room messages refresh completed for: ${roomJid}`);
          resolve();
        }
      }, timeout);
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
            resolve();
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

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          client.off('stanza', handleResponse);
          setRefreshState({ roomsLoaded: true });
          resolve();
        }
      }, 8000);
    });
  },

  sendPresenceProbes: () => {
    const { client, contacts, getConnectionQuality } = get();
    if (!client || !contacts.length) return;

    const connectionQuality = getConnectionQuality();
    console.log(`Sending presence probes to ${contacts.length} contacts...`);
    
    // Adjust batch size and delay based on connection quality
    const batchSize = connectionQuality === 'excellent' ? 10 : 
                     connectionQuality === 'good' ? 5 : 3;
    const delay = connectionQuality === 'excellent' ? 100 : 
                 connectionQuality === 'good' ? 200 : 500;
    
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
        
        const waitTime = delay * Math.pow(2, attempt - 1);
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError!;
  }
});
