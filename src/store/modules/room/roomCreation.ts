
import { xml } from '@xmpp/client';
import { Room } from '../../types';

export const createRoomCreationModule = (set: any, get: any) => ({
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
  }
});
