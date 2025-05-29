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

    // Add to local state
    const newRoom: Room = {
      jid: roomJid,
      name: roomName,
      description,
      participants: [currentUser],
      isOwner: true,
      isPermanent
    };

    set((state: any) => ({
      rooms: [...state.rooms, newRoom]
    }));
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
    
    // Fetch affiliations after joining
    setTimeout(() => {
      const module = get();
      if (module.fetchRoomAffiliations) {
        module.fetchRoomAffiliations(roomJid);
      }
    }, 2000);
  },

  deleteRoom: (roomJid: string) => {
    const { client } = get();
    if (!client) return;

    const destroyIq = xml(
      'iq',
      { type: 'set', to: roomJid, id: `destroy-${Date.now()}` },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
        xml('destroy', { jid: roomJid })
      )
    );

    client.send(destroyIq);

    set((state: any) => ({
      rooms: state.rooms.filter((room: Room) => room.jid !== roomJid),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([key]) => key !== roomJid)
      ),
      activeChat: state.activeChat === roomJid ? null : state.activeChat,
      activeChatType: state.activeChat === roomJid ? null : state.activeChatType
    }));
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
    const { client } = get();
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
  }
});
