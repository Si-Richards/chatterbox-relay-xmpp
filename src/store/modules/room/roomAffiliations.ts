
import { xml } from '@xmpp/client';
import { Room, RoomAffiliation } from '../../types';

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
            
            const query = stanza.getChild('query', 'http://jabber.org/protocol/muc#admin');
            if (query) {
              const items = query.getChildren('item');
              const affiliations: RoomAffiliation[] = [];
              const currentUserBareJid = currentUser.split('/')[0];
              let foundOwnership = false;
              
              items.forEach((item: any) => {
                const jid = item.attrs.jid;
                const affiliation = item.attrs.affiliation;
                const role = item.attrs.role || 'none';
                
                if (jid && affiliation) {
                  const name = jid.split('@')[0];
                  
                  affiliations.push({
                    jid: jid,
                    name: name,
                    affiliation: affiliation as 'owner' | 'admin' | 'member' | 'none',
                    role: role as 'moderator' | 'participant' | 'visitor' | 'none'
                  });
                  
                  // Check for current user ownership
                  if (affiliation === 'owner') {
                    const ownerBareJid = jid.split('/')[0];
                    if (ownerBareJid === currentUserBareJid) {
                      foundOwnership = true;
                      console.log(`Found ownership for current user in room ${roomJid}`);
                    }
                  }
                }
              });
              
              console.log(`Found ${affiliations.length} affiliations for room ${roomJid}`);
              
              // Update room state with affiliations and ownership
              set((state: any) => ({
                rooms: state.rooms.map((room: Room) =>
                  room.jid === roomJid ? { 
                    ...room, 
                    affiliations,
                    isOwner: foundOwnership 
                  } : room
                )
              }));
            }
            
            resolve();
          } else if (stanza.attrs.type === 'error') {
            console.error(`Failed to fetch affiliations for room ${roomJid}:`, stanza);
            resolve(); // Don't reject, just resolve to continue
          }
        }
      };

      client.on('stanza', handleResponse);

      // Query for all affiliation types to get complete member list
      const affiliationQuery = xml(
        'iq',
        { type: 'get', to: roomJid, id: requestId },
        xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
          xml('item', { affiliation: 'owner' }),
          xml('item', { affiliation: 'admin' }),
          xml('item', { affiliation: 'member' })
        )
      );

      client.send(affiliationQuery);

      // Timeout after 8 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          client.off('stanza', handleResponse);
          console.warn(`Affiliation query timeout for room: ${roomJid}`);
          resolve(); // Don't fail on timeout
        }
      }, 8000);
    });
  },

  setRoomAffiliation: (roomJid: string, userJid: string, affiliation: string, role: string) => {
    const { client } = get();
    if (!client) return;

    console.log(`Setting affiliation for ${userJid} in room ${roomJid}: ${affiliation}/${role}`);

    const affiliationIq = xml(
      'iq',
      { type: 'set', to: roomJid, id: `set-affiliation-${Date.now()}` },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
        xml('item', { jid: userJid, affiliation, role })
      )
    );

    client.send(affiliationIq);
  },

  // Enhanced method to restore room ownership from affiliations
  restoreRoomOwnership: () => {
    const { currentUser, rooms } = get();
    if (!currentUser || !rooms.length) {
      console.warn('No current user or rooms for ownership restoration');
      return;
    }

    console.log('Restoring room ownership from affiliations...');
    const currentUserBareJid = currentUser.split('/')[0];
    
    set((state: any) => ({
      rooms: state.rooms.map((room: Room) => {
        // Check if current user has owner affiliation
        const hasOwnerAffiliation = room.affiliations?.some(aff => 
          aff.jid.split('/')[0] === currentUserBareJid && aff.affiliation === 'owner'
        );
        
        console.log(`Room ${room.name}: hasOwnerAffiliation=${hasOwnerAffiliation}`);
        
        return {
          ...room,
          isOwner: hasOwnerAffiliation || false
        };
      })
    }));
    
    console.log('Room ownership restoration completed');
  }
});
