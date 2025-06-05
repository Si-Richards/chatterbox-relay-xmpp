
import { xml } from '@xmpp/client';
import { Room } from '../../types';

export const createRoomManagementModule = (set: any, get: any) => ({
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
  }
});
