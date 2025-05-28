
import { xml } from '@xmpp/client';
import { Contact } from '../types';

export const createPresenceModule = (set: any, get: any) => ({
  addContact: (jid: string) => {
    const { client, contacts } = get();
    if (!client || contacts.find((c: Contact) => c.jid === jid)) return;

    const presence = xml('presence', { to: jid, type: 'subscribe' });
    client.send(presence);

    set((state: any) => ({
      contacts: [...state.contacts, { 
        jid, 
        name: jid.split('@')[0], 
        presence: 'offline', 
        avatar: null, 
        lastSeen: new Date() 
      }]
    }));
  }
});
