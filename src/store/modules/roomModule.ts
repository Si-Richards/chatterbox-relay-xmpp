
import { xml } from '@xmpp/client';
import { Room, RoomAffiliation, Message } from '../types';

export const createRoomModule = (set: any, get: any) => ({
  createRoom: (roomName: string, description?: string, isPermanent: boolean = false, privacyOptions?: any) => {
    const { client, currentUser } = get();
    if (!client) return;

    const roomJid = `${roomName}@conference.ejabberd.voicehost.io`;
    const nickname = currentUser.split('@')[0];
    
    const presence = xml('presence', { to: `${roomJid}/${nickname}` });
    client.send(presence);

    if (isPermanent || privacyOptions) {
      setTimeout(() => {
        const configFields = [
          xml('field', { var: 'FORM_TYPE' },
            xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig')
          )
        ];

        if (isPermanent) {
          configFields.push(
            xml('field', { var: 'muc#roomconfig_persistentroom' },
              xml('value', {}, '1')
            )
          );
        }

        if (privacyOptions) {
          if (privacyOptions.members_only !== undefined) {
            configFields.push(
              xml('field', { var: 'muc#roomconfig_membersonly' },
                xml('value', {}, privacyOptions.members_only ? '1' : '0')
              )
            );
          }
          if (privacyOptions.public_list !== undefined) {
            configFields.push(
              xml('field', { var: 'muc#roomconfig_publicroom' },
                xml('value', {}, privacyOptions.public_list ? '1' : '0')
              )
            );
          }
          if (privacyOptions.public !== undefined) {
            configFields.push(
              xml('field', { var: 'muc#roomconfig_publicroom' },
                xml('value', {}, privacyOptions.public ? '1' : '0')
              )
            );
          }
        }

        const configForm = xml(
          'iq',
          { type: 'set', to: roomJid, id: `config-${Date.now()}` },
          xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
            xml('x', { xmlns: 'jabber:x:data', type: 'submit' }, ...configFields)
          )
        );
        client.send(configForm);
      }, 1000);
    }

    set((state: any) => ({
      rooms: [...state.rooms, { 
        jid: roomJid, 
        name: roomName,
        description: description || '',
        participants: [],
        isOwner: true,
        isPermanent,
        affiliations: [],
        avatar: null
      }]
    }));

    setTimeout(() => {
      get().fetchRoomVCard(roomJid);
    }, 2000);
  },
  
  updateRoomDescription: (roomJid: string, description: string) => {
    set((state: any) => ({
      rooms: state.rooms.map((room: Room) => 
        room.jid === roomJid 
          ? { ...room, description }
          : room
      )
    }));
  },
  
  deleteRoom: (roomJid: string) => {
    const { client, rooms } = get();
    if (!client) return;

    const room = rooms.find((r: Room) => r.jid === roomJid);
    if (!room || !room.isOwner) {
      console.log('Only room owners can delete rooms');
      return;
    }

    const destroyIq = xml(
      'iq',
      { type: 'set', to: roomJid, id: `destroy-${Date.now()}` },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
        xml('destroy', { jid: roomJid },
          xml('reason', {}, 'Room deleted by owner')
        )
      )
    );
    
    client.send(destroyIq);

    set((state: any) => ({
      rooms: state.rooms.filter((r: Room) => r.jid !== roomJid),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([key]) => key !== roomJid)
      ),
      activeChat: state.activeChat === roomJid ? null : state.activeChat,
      activeChatType: state.activeChat === roomJid ? null : state.activeChatType
    }));
  },
  
  joinRoom: (roomJid: string) => {
    const { client, currentUser, rooms } = get();
    if (!client || rooms.find((r: Room) => r.jid === roomJid)) return;

    const nickname = currentUser.split('@')[0];
    const presence = xml('presence', { to: `${roomJid}/${nickname}` });
    client.send(presence);

    set((state: any) => ({
      rooms: [...state.rooms, { 
        jid: roomJid, 
        name: roomJid.split('@')[0], 
        participants: [], 
        affiliations: [], 
        avatar: null 
      }]
    }));

    setTimeout(() => {
      get().fetchRoomVCard(roomJid);
    }, 1000);
  },
  
  inviteToRoom: (roomJid: string, userJid: string) => {
    const { client, currentUser } = get();
    if (!client) return;
    
    const message = xml(
      'message',
      { to: userJid },
      xml('x', { xmlns: 'jabber:x:conference', jid: roomJid })
    );
    
    client.send(message);
    
    const systemMessage: Message = {
      id: `invite-${Date.now()}`,
      from: currentUser,
      to: roomJid,
      body: `Invited ${userJid.split('@')[0]} to the room`,
      timestamp: new Date(),
      type: 'groupchat',
      status: 'sent'
    };
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [roomJid]: [...(state.messages[roomJid] || []), systemMessage]
      }
    }));
  },
  
  kickFromRoom: (roomJid: string, userJid: string) => {
    const { client, currentUser, rooms } = get();
    if (!client) return;
    
    const room = rooms.find((r: Room) => r.jid === roomJid);
    if (!room || !room.isOwner) {
      console.log('You need to be room owner to kick users');
      return;
    }
    
    const nickname = userJid.split('@')[0];
    
    const iq = xml(
      'iq',
      { to: roomJid, type: 'set', id: `kick-${Date.now()}` },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
        xml('item', { nick: nickname, role: 'none' },
          xml('reason', {}, 'Kicked by room admin')
        )
      )
    );
    
    client.send(iq);
    
    const systemMessage: Message = {
      id: `kick-${Date.now()}`,
      from: currentUser,
      to: roomJid,
      body: `Kicked ${nickname} from the room`,
      timestamp: new Date(),
      type: 'groupchat',
      status: 'sent'
    };
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [roomJid]: [...(state.messages[roomJid] || []), systemMessage]
      },
      rooms: state.rooms.map((r: Room) => 
        r.jid === roomJid 
          ? { ...r, participants: r.participants.filter(p => !p.includes(nickname)) }
          : r
      )
    }));
  },

  setRoomAvatar: (roomJid: string, avatarUrl: string) => {
    const { client } = get();
    if (!client) return;

    let base64Data = '';
    let mimeType = 'image/jpeg';
    
    if (avatarUrl.startsWith('data:')) {
      const parts = avatarUrl.split(',');
      if (parts.length === 2) {
        const header = parts[0];
        base64Data = parts[1];
        const mimeMatch = header.match(/data:([^;]+)/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }
    } else {
      base64Data = avatarUrl;
    }

    const vcardIq = xml(
      'iq',
      { type: 'set', to: roomJid, id: `vcard-${Date.now()}` },
      xml('vCard', { xmlns: 'vcard-temp' },
        xml('PHOTO',
          xml('TYPE', {}, mimeType),
          xml('BINVAL', {}, base64Data)
        )
      )
    );

    client.send(vcardIq);

    set((state: any) => ({
      rooms: state.rooms.map((room: Room) => 
        room.jid === roomJid 
          ? { ...room, avatar: avatarUrl }
          : room
      )
    }));
  },

  fetchRoomVCard: (roomJid: string) => {
    const { client } = get();
    if (!client) return;

    const vcardIq = xml(
      'iq',
      { type: 'get', to: roomJid, id: `vcard-get-${Date.now()}` },
      xml('vCard', { xmlns: 'vcard-temp' })
    );

    client.send(vcardIq);
  },

  fetchRoomAffiliations: (roomJid: string) => {
    const { client } = get();
    if (!client) return;

    const iq = xml(
      'iq',
      { type: 'get', to: roomJid, id: `affiliations-${Date.now()}` },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
        xml('item', { affiliation: 'owner' }),
        xml('item', { affiliation: 'admin' }),
        xml('item', { affiliation: 'member' })
      )
    );

    client.send(iq);
  },

  setRoomAffiliation: (roomJid: string, userJid: string, affiliation: 'owner' | 'admin' | 'member' | 'none') => {
    const { client, currentUser } = get();
    if (!client) return;

    const iq = xml(
      'iq',
      { type: 'set', to: roomJid, id: `set-affiliation-${Date.now()}` },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
        xml('item', { jid: userJid, affiliation })
      )
    );

    client.send(iq);

    set((state: any) => ({
      rooms: state.rooms.map((room: Room) => {
        if (room.jid === roomJid && room.affiliations) {
          const updatedAffiliations = room.affiliations.map((aff: RoomAffiliation) => 
            aff.jid === userJid ? { ...aff, affiliation } : aff
          );
          
          if (!room.affiliations.find((aff: RoomAffiliation) => aff.jid === userJid)) {
            updatedAffiliations.push({
              jid: userJid,
              name: userJid.split('@')[0],
              affiliation,
              role: 'participant'
            });
          }
          
          return { ...room, affiliations: updatedAffiliations };
        }
        return room;
      })
    }));

    const systemMessage: Message = {
      id: `affiliation-${Date.now()}`,
      from: currentUser,
      to: roomJid,
      body: `Set ${userJid.split('@')[0]}'s affiliation to ${affiliation}`,
      timestamp: new Date(),
      type: 'groupchat',
      status: 'sent'
    };
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [roomJid]: [...(state.messages[roomJid] || []), systemMessage]
      }
    }));
  }
});
