
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
    const { client } = get();
    if (!client) return;
    
    // Store avatar URL in local state
    set({ userAvatar: avatarUrl });
    
    // Publish avatar update in presence
    const presence = xml(
      'presence',
      {},
      xml('x', { xmlns: 'vcard-temp:x:update' },
        xml('photo', {}, avatarUrl)
      )
    );
    
    client.send(presence);
  },
});
