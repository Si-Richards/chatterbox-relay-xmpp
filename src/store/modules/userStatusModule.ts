
import { xml } from '@xmpp/client';

export const createUserStatusModule = (set: any, get: any) => ({
  setUserStatus: (status: 'online' | 'away' | 'dnd' | 'xa') => {
    const { client } = get();
    if (!client) return;
    
    let presenceStanza;
    
    if (status === 'online') {
      presenceStanza = xml('presence');
    } else {
      presenceStanza = xml(
        'presence',
        {},
        xml('show', {}, status)
      );
    }
    
    client.send(presenceStanza);
    
    set({ userStatus: status });
  },
  
  setUserAvatar: (avatarUrl: string) => {
    const { client, currentUser } = get();
    if (!client) return;
    
    // Store avatar URL in local state
    set({ userAvatar: avatarUrl });
    
    // Set vCard using vCard4 format (mod_vcard2)
    const vCardIq = xml(
      'iq',
      { type: 'set', id: `vcard-set-${Date.now()}` },
      xml('vcard', { xmlns: 'urn:ietf:params:xml:ns:vcard-4.0' },
        xml('photo', {},
          xml('uri', {}, avatarUrl)
        )
      )
    );
    
    client.send(vCardIq);
    
    // Also update presence with vCard update notification
    const presence = xml(
      'presence',
      {},
      xml('x', { xmlns: 'vcard-temp:x:update' },
        xml('photo', {}, avatarUrl ? 'updated' : '')
      )
    );
    
    client.send(presence);
    
    console.log('Avatar updated using vCard4 format:', avatarUrl);
  },

  fetchContactAvatar: (contactJid: string) => {
    const { client } = get();
    if (!client) return;

    // Request vCard using vCard4 format
    const vCardQuery = xml(
      'iq',
      { type: 'get', to: contactJid, id: `vcard-get-${Date.now()}` },
      xml('vcard', { xmlns: 'urn:ietf:params:xml:ns:vcard-4.0' })
    );
    
    client.send(vCardQuery);
    console.log('Fetching vCard4 for contact:', contactJid);
  }
});
