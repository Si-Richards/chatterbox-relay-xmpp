
import { xml } from '@xmpp/client';

export const createServerUsersModule = (set: any, get: any) => ({
  fetchServerUsers: async (): Promise<{ jid: string; name: string; }[]> => {
    const { client } = get();
    if (!client) {
      throw new Error('Not connected to server');
    }

    return new Promise<{ jid: string; name: string; }[]>((resolve, reject) => {
      const queryId = `users-${Date.now()}`;
      
      // Try to get user list from the server's user directory
      const iq = xml(
        'iq',
        { type: 'get', to: 'ejabberd.voicehost.io', id: queryId },
        xml('query', { xmlns: 'http://jabber.org/protocol/disco#items', node: 'users' })
      );

      const handleResponse = (stanza: any) => {
        if (stanza.is('iq') && stanza.attrs.id === queryId) {
          client.off('stanza', handleResponse);
          
          if (stanza.attrs.type === 'result') {
            const query = stanza.getChild('query');
            const users: { jid: string; name: string; }[] = [];
            
            if (query) {
              const items = query.getChildren('item');
              items.forEach((item: any) => {
                const jid = item.attrs.jid;
                // Filter to only include actual user accounts, not system modules
                if (jid && jid.includes('@ejabberd.voicehost.io') && 
                    !jid.includes('conference') && 
                    !jid.includes('proxy') && 
                    !jid.includes('pubsub') && 
                    !jid.includes('upload') &&
                    !jid.includes('muc') &&
                    !jid.includes('irc') &&
                    !jid.includes('vjud') &&
                    !jid.includes('api') &&
                    !jid.includes('admin') &&
                    !jid.includes('mod_') &&
                    !jid.includes('system') &&
                    // Only include if it looks like a real username (no dots, underscores in system names)
                    !jid.split('@')[0].includes('.') &&
                    jid.split('@')[0].length > 1) {
                  users.push({
                    jid: jid,
                    name: jid.split('@')[0]
                  });
                }
              });
            }
            
            if (users.length > 0) {
              const currentUser = get().currentUser;
              const filteredUsers = users.filter(user => user.jid !== currentUser);
              resolve(filteredUsers);
            } else {
              // Fallback to common usernames if server doesn't return user list
              const commonUsers: { jid: string; name: string; }[] = [
                { jid: 'demo@ejabberd.voicehost.io', name: 'demo' },
                { jid: 'test@ejabberd.voicehost.io', name: 'test' },
                { jid: 'user@ejabberd.voicehost.io', name: 'user' },
                { jid: 'guest@ejabberd.voicehost.io', name: 'guest' },
                { jid: 'support@ejabberd.voicehost.io', name: 'support' }
              ];
              
              const currentUser = get().currentUser;
              const filteredUsers = commonUsers.filter(user => user.jid !== currentUser);
              resolve(filteredUsers);
            }
          } else {
            // Server doesn't support user listing, use fallback
            const commonUsers: { jid: string; name: string; }[] = [
              { jid: 'demo@ejabberd.voicehost.io', name: 'demo' },
              { jid: 'test@ejabberd.voicehost.io', name: 'test' },
              { jid: 'user@ejabberd.voicehost.io', name: 'user' },
              { jid: 'guest@ejabberd.voicehost.io', name: 'guest' },
              { jid: 'support@ejabberd.voicehost.io', name: 'support' }
            ];
            
            const currentUser = get().currentUser;
            const filteredUsers = commonUsers.filter(user => user.jid !== currentUser);
            resolve(filteredUsers);
          }
        }
      };

      client.on('stanza', handleResponse);
      client.send(iq);
      
      // Timeout fallback
      setTimeout(() => {
        client.off('stanza', handleResponse);
        const commonUsers: { jid: string; name: string; }[] = [
          { jid: 'demo@ejabberd.voicehost.io', name: 'demo' },
          { jid: 'test@ejabberd.voicehost.io', name: 'test' },
          { jid: 'user@ejabberd.voicehost.io', name: 'user' },
          { jid: 'guest@ejabberd.voicehost.io', name: 'guest' },
          { jid: 'support@ejabberd.voicehost.io', name: 'support' }
        ];
        
        const currentUser = get().currentUser;
        const filteredUsers = commonUsers.filter(user => user.jid !== currentUser);
        resolve(filteredUsers);
      }, 5000);
    });
  }
});
