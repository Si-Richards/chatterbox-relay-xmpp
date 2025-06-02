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

  deleteContact: async (jid: string) => {
    console.log(`Starting contact deletion process for: ${jid}`);
    
    const { client, isConnected, contacts } = get();
    
    // Check if contact exists in the current list
    const contactExists = contacts.find((contact: Contact) => contact.jid === jid);
    if (!contactExists) {
      console.log(`Contact ${jid} not found in contacts list`);
      return;
    }
    
    // Check if client is connected
    if (!client || !isConnected) {
      console.error(`Cannot delete contact ${jid}: XMPP client not connected`);
      throw new Error('Not connected to XMPP server. Please reconnect and try again.');
    }

    try {
      console.log(`Updating local state for contact deletion: ${jid}`);
      
      // Remove from local state immediately for better UX
      set((state: any) => {
        console.log(`Removing ${jid} from contacts array (${state.contacts.length} contacts before)`);
        const updatedContacts = state.contacts.filter((contact: Contact) => contact.jid !== jid);
        console.log(`Contacts after removal: ${updatedContacts.length}`);
        
        // Clear messages for this contact
        const updatedMessages = Object.fromEntries(
          Object.entries(state.messages).filter(([chatJid]) => chatJid !== jid)
        );
        console.log(`Cleared messages for ${jid}`);
        
        return {
          contacts: updatedContacts,
          messages: updatedMessages,
          // Also clear from muted/blocked lists
          mutedContacts: state.mutedContacts.filter((muted: string) => muted !== jid),
          blockedContacts: state.blockedContacts.filter((blocked: string) => blocked !== jid)
        };
      });

      // Send roster removal stanza
      console.log(`Sending roster removal stanza for: ${jid}`);
      const rosterRemoveStanza = xml(
        'iq',
        { type: 'set', id: `roster-remove-${Date.now()}` },
        xml('query', { xmlns: 'jabber:iq:roster' },
          xml('item', { jid, subscription: 'remove' })
        )
      );
      
      await client.send(rosterRemoveStanza);
      console.log(`Roster removal stanza sent successfully for ${jid}`);

      // Send unsubscribe presence
      console.log(`Sending unsubscribe presence for: ${jid}`);
      const unsubscribeStanza = xml('presence', { to: jid, type: 'unsubscribe' });
      await client.send(unsubscribeStanza);
      console.log(`Unsubscribe stanza sent successfully for ${jid}`);

      // Send unsubscribed presence  
      console.log(`Sending unsubscribed presence for: ${jid}`);
      const unsubscribedStanza = xml('presence', { to: jid, type: 'unsubscribed' });
      await client.send(unsubscribedStanza);
      console.log(`Unsubscribed stanza sent successfully for ${jid}`);

      console.log(`✅ Contact ${jid} has been successfully deleted`);
      
    } catch (error) {
      console.error(`❌ Error deleting contact ${jid}:`, error);
      
      // If XMPP operations failed, we might want to revert the local state
      // But for now, we'll keep the local deletion and let the user know about the server error
      throw new Error(`Failed to delete contact from server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});
