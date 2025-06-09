
import { xml } from '@xmpp/client';

export const createServerUsersModule = (set: any, get: any) => ({
  fetchServerUsers: async (): Promise<{ jid: string; name: string; }[]> => {
    const { client } = get();
    if (!client) {
      throw new Error('Not connected to server');
    }

    console.log('Starting server user discovery...');

    return new Promise<{ jid: string; name: string; }[]>((resolve, reject) => {
      // Try multiple discovery methods
      let resolved = false;
      const discoveredUsers: { jid: string; name: string; }[] = [];

      // Method 1: Try service discovery
      const tryServiceDiscovery = () => {
        const queryId = `users-${Date.now()}`;
        
        const handleServiceResponse = (stanza: any) => {
          if (stanza.is('iq') && stanza.attrs.id === queryId && !resolved) {
            client.off('stanza', handleServiceResponse);
            
            if (stanza.attrs.type === 'result') {
              const query = stanza.getChild('query');
              if (query) {
                const items = query.getChildren('item');
                items.forEach((item: any) => {
                  const jid = item.attrs.jid;
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
                    
                    const currentUser = get().currentUser;
                    if (jid !== currentUser) {
                      discoveredUsers.push({
                        jid: jid,
                        name: jid.split('@')[0]
                      });
                    }
                  }
                });
              }
            }
            
            console.log(`Service discovery found ${discoveredUsers.length} users`);
            if (discoveredUsers.length > 0 && !resolved) {
              resolved = true;
              resolve(discoveredUsers);
            } else {
              tryVJUDDiscovery();
            }
          }
        };

        client.on('stanza', handleServiceResponse);
        
        const iq = xml(
          'iq',
          { type: 'get', to: 'ejabberd.voicehost.io', id: queryId },
          xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' })
        );

        client.send(iq);
        
        // Timeout for service discovery
        setTimeout(() => {
          if (!resolved) {
            client.off('stanza', handleServiceResponse);
            tryVJUDDiscovery();
          }
        }, 5000);
      };

      // Method 2: Try VJUD discovery
      const tryVJUDDiscovery = () => {
        if (resolved) return;
        
        const vjudId = `vjud-${Date.now()}`;
        
        const handleVJUDResponse = (stanza: any) => {
          if (stanza.is('iq') && stanza.attrs.id === vjudId && !resolved) {
            client.off('stanza', handleVJUDResponse);
            
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
                      
                      const currentUser = get().currentUser;
                      if (jid !== currentUser) {
                        discoveredUsers.push({
                          jid: jid,
                          name: jid.split('@')[0]
                        });
                      }
                    }
                  });
                }
              }
            }
            
            console.log(`VJUD discovery found ${discoveredUsers.length} total users`);
            if (!resolved) {
              resolved = true;
              resolve(discoveredUsers);
            }
          }
        };

        client.on('stanza', handleVJUDResponse);
        
        const vjudQuery = xml(
          'iq',
          { type: 'get', to: 'vjud.ejabberd.voicehost.io', id: vjudId },
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

        client.send(vjudQuery);
        
        // Final timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            client.off('stanza', handleVJUDResponse);
            console.log('All discovery methods completed');
            resolve(discoveredUsers);
          }
        }, 8000);
      };

      // Start with service discovery
      tryServiceDiscovery();
    });
  },

  searchUserByJid: async (searchJid: string): Promise<{ jid: string; name: string; } | null> => {
    const { client } = get();
    if (!client) return null;

    console.log(`Searching for user: ${searchJid}`);
    
    // Simple JID validation and search
    const fullJid = searchJid.includes('@') ? searchJid : `${searchJid}@ejabberd.voicehost.io`;
    
    return new Promise((resolve) => {
      const queryId = `search-${Date.now()}`;
      let resolved = false;
      
      const handleResponse = (stanza: any) => {
        if (stanza.is('presence') && !resolved) {
          const from = stanza.attrs.from?.split('/')[0];
          if (from === fullJid) {
            resolved = true;
            client.off('stanza', handleResponse);
            console.log(`Found user: ${fullJid}`);
            resolve({
              jid: fullJid,
              name: fullJid.split('@')[0]
            });
          }
        }
      };

      // Send presence probe to check if user exists
      const probe = xml('presence', { to: fullJid, type: 'probe', id: queryId });
      
      client.on('stanza', handleResponse);
      client.send(probe);
      
      console.log(`Sent presence probe to: ${fullJid}`);
      
      // Timeout
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          client.off('stanza', handleResponse);
          console.log(`User search timeout for: ${fullJid}`);
          resolve(null);
        }
      }, 4000);
    });
  }
});
