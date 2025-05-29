
import { xml } from '@xmpp/client';

export const createServerUsersModule = (set: any, get: any) => ({
  fetchServerUsers: async (): Promise<{ jid: string; name: string; }[]> => {
    const { client } = get();
    if (!client) {
      throw new Error('Not connected to server');
    }

    return new Promise<{ jid: string; name: string; }[]>((resolve, reject) => {
      const queryId = `users-${Date.now()}`;
      let resolved = false;
      
      const handleResponse = (stanza: any) => {
        if (stanza.is('iq') && stanza.attrs.id === queryId && !resolved) {
          resolved = true;
          client.off('stanza', handleResponse);
          
          if (stanza.attrs.type === 'result') {
            const query = stanza.getChild('query');
            const users: { jid: string; name: string; }[] = [];
            
            if (query) {
              const items = query.getChildren('item');
              items.forEach((item: any) => {
                const jid = item.attrs.jid;
                // Filter to only include actual user accounts
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
                    !jid.split('@')[0].includes('.') &&
                    jid.split('@')[0].length > 1) {
                  users.push({
                    jid: jid,
                    name: jid.split('@')[0]
                  });
                }
              });
            }
            
            const currentUser = get().currentUser;
            const filteredUsers = users.filter(user => user.jid !== currentUser);
            
            console.log(`Found ${filteredUsers.length} real users from server`);
            resolve(filteredUsers);
          } else {
            console.log('Server user discovery failed, trying alternative methods');
            // Try alternative discovery methods
            tryAlternativeDiscovery();
          }
        }
      };

      const tryAlternativeDiscovery = async () => {
        // Try VJUD (User Directory) service
        const vjudQuery = xml(
          'iq',
          { type: 'get', to: 'vjud.ejabberd.voicehost.io', id: `vjud-${Date.now()}` },
          xml('query', { xmlns: 'jabber:iq:search' },
            xml('x', { xmlns: 'jabber:x:data', type: 'submit' },
              xml('field', { var: 'FORM_TYPE' },
                xml('value', {}, 'jabber:iq:search')
              ),
              xml('field', { var: 'search' },
                xml('value', {}, '*')
              )
            )
          )
        );

        const vjudHandler = (stanza: any) => {
          if (stanza.is('iq') && stanza.attrs.id?.startsWith('vjud-') && !resolved) {
            resolved = true;
            client.off('stanza', vjudHandler);
            
            const users: { jid: string; name: string; }[] = [];
            if (stanza.attrs.type === 'result') {
              const query = stanza.getChild('query');
              if (query) {
                const x = query.getChild('x', 'jabber:x:data');
                if (x) {
                  const items = x.getChildren('item');
                  items.forEach((item: any) => {
                    const fields = item.getChildren('field');
                    let jid = '';
                    fields.forEach((field: any) => {
                      if (field.attrs.var === 'jid') {
                        jid = field.getChildText('value');
                      }
                    });
                    
                    if (jid && jid.includes('@ejabberd.voicehost.io') && 
                        !jid.includes('conference') && jid.split('@')[0].length > 1) {
                      users.push({
                        jid: jid,
                        name: jid.split('@')[0]
                      });
                    }
                  });
                }
              }
            }
            
            const currentUser = get().currentUser;
            const filteredUsers = users.filter(user => user.jid !== currentUser);
            console.log(`VJUD discovery found ${filteredUsers.length} users`);
            
            if (filteredUsers.length > 0) {
              resolve(filteredUsers);
            } else {
              // Final fallback - return empty array instead of hardcoded users
              console.log('No users found through any discovery method');
              resolve([]);
            }
          }
        };

        client.on('stanza', vjudHandler);
        client.send(vjudQuery);
        
        // Timeout for VJUD
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            client.off('stanza', vjudHandler);
            console.log('All discovery methods failed');
            resolve([]);
          }
        }, 10000);
      };

      // Try primary discovery first
      const iq = xml(
        'iq',
        { type: 'get', to: 'ejabberd.voicehost.io', id: queryId },
        xml('query', { xmlns: 'http://jabber.org/protocol/disco#items', node: 'users' })
      );

      client.on('stanza', handleResponse);
      client.send(iq);
      
      // Primary timeout
      setTimeout(() => {
        if (!resolved) {
          client.off('stanza', handleResponse);
          tryAlternativeDiscovery();
        }
      }, 5000);
    });
  },

  searchUserByJid: async (searchJid: string): Promise<{ jid: string; name: string; } | null> => {
    const { client } = get();
    if (!client) return null;

    // Simple JID validation and search
    const fullJid = searchJid.includes('@') ? searchJid : `${searchJid}@ejabberd.voicehost.io`;
    
    return new Promise((resolve) => {
      const queryId = `search-${Date.now()}`;
      
      const handleResponse = (stanza: any) => {
        if (stanza.is('presence') && stanza.attrs.from?.split('/')[0] === fullJid) {
          client.off('stanza', handleResponse);
          resolve({
            jid: fullJid,
            name: fullJid.split('@')[0]
          });
        }
      };

      // Send presence probe to check if user exists
      const probe = xml('presence', { to: fullJid, type: 'probe', id: queryId });
      
      client.on('stanza', handleResponse);
      client.send(probe);
      
      // Timeout
      setTimeout(() => {
        client.off('stanza', handleResponse);
        resolve(null);
      }, 3000);
    });
  }
});
