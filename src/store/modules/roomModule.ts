
import { xml } from '@xmpp/client';
import { Room } from '../types';

export const createRoomModule = (set: any, get: any) => ({
  createRoom: (roomName: string, description: string = '', isPermanent: boolean = false, privacyOptions: any = {}) => {
    const { client, currentUser } = get();
    if (!client) return;

    const roomJid = `${roomName}@conference.ejabberd.voicehost.io`;
    
    // Join the room first
    const presence = xml(
      'presence',
      { to: `${roomJid}/${currentUser.split('@')[0]}` },
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

    // Add to local state - only include current user, not room name duplicates
    const newRoom: Room = {
      jid: roomJid,
      name: roomName,
      description,
      participants: [currentUser], // Only current user initially
      isOwner: true,
      isPermanent
    };

    set((state: any) => ({
      rooms: [...state.rooms, newRoom]
    }));

    // Store room ownership persistently
    const roomOwnership = JSON.parse(localStorage.getItem('roomOwnership') || '{}');
    roomOwnership[roomJid] = currentUser;
    localStorage.setItem('roomOwnership', JSON.stringify(roomOwnership));
  },

  joinRoom: (roomJid: string) => {
    const { client, currentUser } = get();
    if (!client) return;

    const presence = xml(
      'presence',
      { to: `${roomJid}/${currentUser.split('@')[0]}` },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc' })
    );

    client.send(presence);
    
    // Fetch affiliations after joining to determine ownership
    setTimeout(() => {
      const module = get();
      if (module.fetchRoomAffiliations) {
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

  fetchRoomAffiliations: async (roomJid: string) => {
    const { client, currentUser } = get();
    if (!client) return;

    console.log('Fetching affiliations for room:', roomJid);

    // Query for all affiliation types
    const affiliationQuery = xml(
      'iq',
      { type: 'get', to: roomJid, id: `affiliations-${Date.now()}` },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
        xml('item', { affiliation: 'owner' }),
        xml('item', { affiliation: 'admin' }),
        xml('item', { affiliation: 'member' }),
        xml('item', { affiliation: 'none' })
      )
    );

    client.send(affiliationQuery);
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

  // Add method to restore room ownership from localStorage
  restoreRoomOwnership: () => {
    const { currentUser } = get();
    if (!currentUser) return;

    const roomOwnership = JSON.parse(localStorage.getItem('roomOwnership') || '{}');
    
    set((state: any) => ({
      rooms: state.rooms.map((room: Room) => ({
        ...room,
        isOwner: roomOwnership[room.jid] === currentUser
      }))
    }));
  }
});
