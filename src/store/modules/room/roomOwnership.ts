
import { xml } from '@xmpp/client';
import { Room, RoomAffiliation } from '../../types';

export const createRoomOwnershipModule = (set: any, get: any) => ({
  // Verify ownership using server affiliations as single source of truth
  verifyRoomOwnership: async (roomJid: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const { client, currentUser } = get();
      if (!client) {
        resolve(false);
        return;
      }

      const currentUserBareJid = currentUser.split('/')[0];
      const requestId = `verify-ownership-${Date.now()}`;
      let resolved = false;

      const handleResponse = (stanza: any) => {
        if (stanza.is('iq') && stanza.attrs.id === requestId && !resolved) {
          resolved = true;
          client.off('stanza', handleResponse);
          
          if (stanza.attrs.type === 'result') {
            const query = stanza.getChild('query', 'http://jabber.org/protocol/muc#admin');
            if (query) {
              const items = query.getChildren('item');
              const isOwner = items.some((item: any) => {
                const ownerJid = item.attrs.jid?.split('/')[0];
                return item.attrs.affiliation === 'owner' && ownerJid === currentUserBareJid;
              });
              
              console.log(`Ownership verification for ${roomJid}: ${isOwner}`);
              
              // Update room state with verified ownership
              set((state: any) => ({
                rooms: state.rooms.map((room: Room) =>
                  room.jid === roomJid ? { ...room, isOwner } : room
                )
              }));
              
              resolve(isOwner);
            } else {
              resolve(false);
            }
          } else {
            console.error(`Ownership verification failed for ${roomJid}`);
            resolve(false);
          }
        }
      };

      client.on('stanza', handleResponse);

      const affiliationQuery = xml(
        'iq',
        { type: 'get', to: roomJid, id: requestId },
        xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
          xml('item', { affiliation: 'owner' })
        )
      );

      client.send(affiliationQuery);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          client.off('stanza', handleResponse);
          console.warn(`Ownership verification timeout for ${roomJid}`);
          resolve(false);
        }
      }, 5000);
    });
  },

  // Verify ownership for all rooms
  verifyAllRoomOwnership: async () => {
    const { rooms } = get();
    console.log('Verifying ownership for all rooms...');
    
    for (const room of rooms) {
      try {
        await get().verifyRoomOwnership(room.jid);
        // Small delay between requests to avoid overwhelming server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to verify ownership for ${room.jid}:`, error);
      }
    }
    
    console.log('Completed ownership verification for all rooms');
  },

  // Update room ownership based on server response
  updateRoomOwnership: (roomJid: string, isOwner: boolean) => {
    console.log(`Updating room ownership: ${roomJid} = ${isOwner}`);
    
    set((state: any) => ({
      rooms: state.rooms.map((room: Room) =>
        room.jid === roomJid ? { ...room, isOwner } : room
      )
    }));
  },

  // Clear all ownership state (for disconnection)
  clearOwnershipState: () => {
    set((state: any) => ({
      rooms: state.rooms.map((room: Room) => ({ ...room, isOwner: false }))
    }));
  }
});
