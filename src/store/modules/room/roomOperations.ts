
import { xml } from '@xmpp/client';

export const createRoomOperationsModule = (set: any, get: any) => ({
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
  }
});
