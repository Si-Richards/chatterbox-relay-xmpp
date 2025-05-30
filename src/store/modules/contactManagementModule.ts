
import { xml } from '@xmpp/client';
import { Contact } from '../types';

export const createContactManagementModule = (set: any, get: any) => ({
  muteContact: (jid: string) => {
    set((state: any) => ({
      mutedContacts: [...state.mutedContacts.filter((muted: string) => muted !== jid), jid],
      contacts: state.contacts.map((contact: Contact) => 
        contact.jid === jid ? { ...contact, isMuted: true } : contact
      )
    }));
    console.log(`Contact ${jid} has been muted`);
  },

  unmuteContact: (jid: string) => {
    set((state: any) => ({
      mutedContacts: state.mutedContacts.filter((muted: string) => muted !== jid),
      contacts: state.contacts.map((contact: Contact) => 
        contact.jid === jid ? { ...contact, isMuted: false } : contact
      )
    }));
    console.log(`Contact ${jid} has been unmuted`);
  },

  blockContact: (jid: string) => {
    const { client } = get();
    
    set((state: any) => ({
      blockedContacts: [...state.blockedContacts.filter((blocked: string) => blocked !== jid), jid],
      contacts: state.contacts.map((contact: Contact) => 
        contact.jid === jid ? { ...contact, isBlocked: true } : contact
      )
    }));

    // Send XEP-0191 blocking stanza
    if (client) {
      const blockStanza = xml(
        'iq',
        { type: 'set', id: `block-${Date.now()}` },
        xml('block', { xmlns: 'urn:xmpp:blocking' },
          xml('item', { jid })
        )
      );
      client.send(blockStanza);
      console.log(`Sent block stanza for ${jid}`);
    }
    
    console.log(`Contact ${jid} has been blocked`);
  },

  unblockContact: (jid: string) => {
    const { client } = get();
    
    set((state: any) => ({
      blockedContacts: state.blockedContacts.filter((blocked: string) => blocked !== jid),
      contacts: state.contacts.map((contact: Contact) => 
        contact.jid === jid ? { ...contact, isBlocked: false } : contact
      )
    }));

    // Send XEP-0191 unblocking stanza
    if (client) {
      const unblockStanza = xml(
        'iq',
        { type: 'set', id: `unblock-${Date.now()}` },
        xml('unblock', { xmlns: 'urn:xmpp:blocking' },
          xml('item', { jid })
        )
      );
      client.send(unblockStanza);
      console.log(`Sent unblock stanza for ${jid}`);
    }
    
    console.log(`Contact ${jid} has been unblocked`);
  },

  deleteContact: (jid: string) => {
    const { client } = get();
    
    // Remove from local state
    set((state: any) => ({
      contacts: state.contacts.filter((contact: Contact) => contact.jid !== jid),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([chatJid]) => chatJid !== jid)
      ),
      // Also clear from muted/blocked lists
      mutedContacts: state.mutedContacts.filter((muted: string) => muted !== jid),
      blockedContacts: state.blockedContacts.filter((blocked: string) => blocked !== jid)
    }));

    // Send roster removal and presence unsubscription
    if (client) {
      // Remove from roster
      const rosterRemoveStanza = xml(
        'iq',
        { type: 'set', id: `roster-remove-${Date.now()}` },
        xml('query', { xmlns: 'jabber:iq:roster' },
          xml('item', { jid, subscription: 'remove' })
        )
      );
      client.send(rosterRemoveStanza);

      // Send unsubscribe presence
      const unsubscribeStanza = xml('presence', { to: jid, type: 'unsubscribe' });
      client.send(unsubscribeStanza);

      // Send unsubscribed presence  
      const unsubscribedStanza = xml('presence', { to: jid, type: 'unsubscribed' });
      client.send(unsubscribedStanza);

      console.log(`Sent roster removal and unsubscribe stanzas for ${jid}`);
    }
    
    console.log(`Contact ${jid} has been deleted`);
  }
});
