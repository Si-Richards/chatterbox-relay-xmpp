
import { xml } from '@xmpp/client';
import { Room } from '../../types';

export const createRoomAffiliationsModule = (set: any, get: any) => ({
  fetchRoomAffiliations: async (roomJid: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const { client, currentUser } = get();
      if (!client) {
        reject(new Error('No client connection'));
        return;
      }

      console.log('Fetching affiliations for room:', roomJid);
      const requestId = `affiliations-${Date.now()}`;
      let resolved = false;

      const handleResponse = (stanza: any) => {
        if (stanza.is('iq') && stanza.attrs.id === requestId && !resolved) {
          resolved = true;
          client.off('stanza', handleResponse);
          
          if (stanza.attrs.type === 'result') {
            console.log(`Successfully fetched affiliations for room: ${roomJid}`);
            
            // Process the affiliations response and check for ownership
            const query = stanza.getChild('query', 'http://jabber.org/protocol/muc#admin');
            if (query) {
              const items = query.getChildren('item');
              const currentUserBareJid = currentUser.split('/')[0];
              let foundOwnership = false;
              
              items.forEach((item: any) => {
                if (item.attrs.affiliation === 'owner') {
                  const ownerJid = item.attrs.jid;
                  const ownerBareJid = ownerJid?.split('/')[0];
                  
                  if (ownerBareJid === currentUserBareJid) {
                    foundOwnership = true;
                    console.log(`Found ownership for current user in room ${roomJid}`);
                    
                    // Store ownership in localStorage
                    const roomOwnership = JSON.parse(localStorage.getItem('roomOwnership') || '{}');
                    roomOwnership[roomJid] = currentUserBareJid;
                    localStorage.setItem('roomOwnership', JSON.stringify(roomOwnership));
                    
                    // Update room state
                    set((state: any) => ({
                      rooms: state.rooms.map((room: Room) =>
                        room.jid === roomJid ? { ...room, isOwner: true } : room
                      )
                    }));
                  }
                }
              });
              
              if (!foundOwnership) {
                console.log(`No ownership found for current user in room ${roomJid}`);
              }
            }
            
            resolve();
          } else if (stanza.attrs.type === 'error') {
            console.error(`Failed to fetch affiliations for room ${roomJid}:`, stanza);
            reject(new Error(`Affiliation query failed for ${roomJid}`));
          }
        }
      };

      client.on('stanza', handleResponse);

      // Query for all affiliation types
      const affiliationQuery = xml(
        'iq',
        { type: 'get', to: roomJid, id: requestId },
        xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
          xml('item', { affiliation: 'owner' }),
          xml('item', { affiliation: 'admin' }),
          xml('item', { affiliation: 'member' }),
          xml('item', { affiliation: 'none' })
        )
      );

      client.send(affiliationQuery);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          client.off('stanza', handleResponse);
          console.warn(`Affiliation query timeout for room: ${roomJid}`);
          resolve(); // Don't fail on timeout, just resolve
        }
      }, 10000);
    });
  },

  setRoomAffiliation: (roomJid: string, userJid: string, affiliation: string, role: string) => {
    const { client } = get();
    if (!client) return;

    const affiliationIq = xml(
      'iq',
      { type: 'set', to: roomJid, id: `set-affiliation-${Date.now()}` },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
        xml('item', { jid: userJid, affiliation, role })
      )
    );

    client.send(affiliationIq);
  },

  // Enhanced method to restore room ownership from localStorage
  restoreRoomOwnership: () => {
    const { currentUser } = get();
    if (!currentUser) {
      console.warn('No current user for ownership restoration');
      return;
    }

    console.log('Restoring room ownership from localStorage...');
    const roomOwnership = JSON.parse(localStorage.getItem('roomOwnership') || '{}');
    const currentUserBareJid = currentUser.split('/')[0]; // Remove resource
    
    console.log('Current user bare JID:', currentUserBareJid);
    console.log('Stored room ownership:', roomOwnership);
    
    set((state: any) => ({
      rooms: state.rooms.map((room: Room) => {
        const storedOwner = roomOwnership[room.jid];
        const isOwner = storedOwner === currentUserBareJid;
        
        console.log(`Room ${room.name} (${room.jid}):`);
        console.log(`  Stored owner: ${storedOwner}`);
        console.log(`  Current user: ${currentUserBareJid}`);
        console.log(`  Is owner: ${isOwner}`);
        
        return {
          ...room,
          isOwner
        };
      })
    }));
    
    console.log('Room ownership restoration completed');
  }
});
