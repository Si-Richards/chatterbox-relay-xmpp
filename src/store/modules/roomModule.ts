import { xml } from '@xmpp/client';
import { Room } from '../types';

export const createRoomModule = (set: any, get: any) => ({
  createRoom: (roomName: string, description: string = '', isPermanent: boolean = false, privacyOptions: any = {}) => {
    const { client, currentUser } = get();
    if (!client) return;

    const roomJid = `${roomName}@conference.ejabberd.voicehost.io`;
    const currentUserBareJid = currentUser.split('/')[0];
    const nickname = currentUser.split('@')[0];
    
    console.log(`Creating room: ${roomJid} with owner: ${currentUserBareJid}`);
    
    // Store ownership in localStorage BEFORE joining
    const roomOwnership = JSON.parse(localStorage.getItem('roomOwnership') || '{}');
    roomOwnership[roomJid] = currentUserBareJid;
    localStorage.setItem('roomOwnership', JSON.stringify(roomOwnership));
    console.log(`Pre-stored room ownership: ${roomJid} -> ${currentUserBareJid}`);
    
    // Join the room first
    const presence = xml(
      'presence',
      { to: `${roomJid}/${nickname}` },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc' })
    );
    
    client.send(presence);

    // Configure the room
    setTimeout(() => {
      const configForm = xml(
        'iq',
        { type: 'set', to: roomJid, id: `config-${Date.now()}` },
        xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
          xml('x', { xmlns: 'jabber:x:data', type: 'submit' },
            xml('field', { var: 'FORM_TYPE' },
              xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig')
            ),
            xml('field', { var: 'muc#roomconfig_roomname' },
              xml('value', {}, roomName)
            ),
            xml('field', { var: 'muc#roomconfig_roomdesc' },
              xml('value', {}, description)
            ),
            xml('field', { var: 'muc#roomconfig_persistentroom' },
              xml('value', {}, isPermanent ? '1' : '0')
            ),
            xml('field', { var: 'muc#roomconfig_publicroom' },
              xml('value', {}, privacyOptions.public ? '1' : '0')
            ),
            xml('field', { var: 'muc#roomconfig_membersonly' },
              xml('value', {}, privacyOptions.members_only ? '1' : '0')
            )
          )
        )
      );
      
      client.send(configForm);
    }, 1000);

    // Add to local state with ownership
    const newRoom: Room = {
      jid: roomJid,
      name: roomName,
      description,
      participants: [`${roomJid}/${nickname}`], // Add user as participant
      isOwner: true, // Set as owner immediately
      isPermanent
    };

    set((state: any) => ({
      rooms: [...state.rooms, newRoom]
    }));
    
    console.log(`Room created in local state: ${roomJid} with isOwner=true`);
  },

  joinRoom: (roomJid: string) => {
    const { client, currentUser } = get();
    if (!client) return;

    const nickname = currentUser.split('@')[0];
    console.log(`Joining room: ${roomJid} as ${nickname}`);

    const presence = xml(
      'presence',
      { to: `${roomJid}/${nickname}` },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc' })
    );

    client.send(presence);
    
    // Fetch affiliations after joining to determine ownership
    setTimeout(() => {
      const module = get();
      if (module.fetchRoomAffiliations) {
        console.log(`Fetching affiliations for joined room: ${roomJid}`);
        module.fetchRoomAffiliations(roomJid);
      }
    }, 2000);
  },

  inviteUserToRoom: (roomJid: string, userJid: string, reason: string = '') => {
    const { client } = get();
    if (!client) return;

    console.log(`Inviting ${userJid} to room ${roomJid}`);

    const inviteMessage = xml(
      'message',
      { to: roomJid },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc#user' },
        xml('invite', { to: userJid },
          reason ? xml('reason', {}, reason) : null
        )
      )
    );

    client.send(inviteMessage);
  },

  kickUserFromRoom: (roomJid: string, userNickname: string, reason: string = '') => {
    const { client } = get();
    if (!client) return;

    console.log(`Kicking ${userNickname} from room ${roomJid}`);

    const kickIq = xml(
      'iq',
      { type: 'set', to: roomJid, id: `kick-${Date.now()}` },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
        xml('item', { nick: userNickname, role: 'none' },
          reason ? xml('reason', {}, reason) : null
        )
      )
    );

    client.send(kickIq);
  },

  deleteRoom: (roomJid: string) => {
    const { client, removeDeletedRoomFromList } = get();
    if (!client) return;

    const destroyIq = xml(
      'iq',
      { type: 'set', to: roomJid, id: `destroy-${Date.now()}` },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
        xml('destroy', { jid: roomJid })
      )
    );

    client.send(destroyIq);

    // Immediately remove from local state
    removeDeletedRoomFromList(roomJid);
    
    // Remove from ownership storage
    const roomOwnership = JSON.parse(localStorage.getItem('roomOwnership') || '{}');
    delete roomOwnership[roomJid];
    localStorage.setItem('roomOwnership', JSON.stringify(roomOwnership));
    
    // Refresh room list after a short delay to ensure server sync
    setTimeout(() => {
      const { refreshRooms } = get();
      refreshRooms();
    }, 2000);
  },

  updateRoomDescription: (roomJid: string, description: string) => {
    const { client } = get();
    if (!client) return;

    const configForm = xml(
      'iq',
      { type: 'set', to: roomJid, id: `update-desc-${Date.now()}` },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
        xml('x', { xmlns: 'jabber:x:data', type: 'submit' },
          xml('field', { var: 'FORM_TYPE' },
            xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig')
          ),
          xml('field', { var: 'muc#roomconfig_roomdesc' },
            xml('value', {}, description)
          )
        )
      )
    );

    client.send(configForm);

    set((state: any) => ({
      rooms: state.rooms.map((room: Room) =>
        room.jid === roomJid ? { ...room, description } : room
      )
    }));
  },

  setRoomAvatar: (roomJid: string, avatarUrl: string) => {
    set((state: any) => ({
      rooms: state.rooms.map((room: Room) =>
        room.jid === roomJid ? { ...room, avatar: avatarUrl } : room
      )
    }));
  },

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
