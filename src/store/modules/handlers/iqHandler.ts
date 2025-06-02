
import { Contact, Room, RoomAffiliation } from '../../types';

export const handleIqStanza = (stanza: any, set: any, get: any) => {
  const type = stanza.attrs.type;
  const id = stanza.attrs.id;
  const from = stanza.attrs.from;
  
  // Handle vCard4 responses (mod_vcard2)
  if (stanza.getChild('vcard', 'urn:ietf:params:xml:ns:vcard-4.0') && type === 'result') {
    const vcard = stanza.getChild('vcard', 'urn:ietf:params:xml:ns:vcard-4.0');
    const photo = vcard.getChild('photo');
    
    if (photo && from) {
      const uri = photo.getChildText('uri');
      if (uri) {
        // Update contact avatar
        set((state: any) => ({
          contacts: state.contacts.map((contact: Contact) =>
            contact.jid === from ? { ...contact, avatar: uri } : contact
          )
        }));
        console.log(`Updated avatar for ${from}:`, uri);
      }
    }
  }
  
  // Handle roster (contact list)
  if (stanza.getChild('query', 'jabber:iq:roster') && type === 'result') {
    const query = stanza.getChild('query', 'jabber:iq:roster');
    const items = query.getChildren('item');
    
    const contacts: Contact[] = items.map((item: any) => ({
      jid: item.attrs.jid,
      name: item.attrs.name || item.attrs.jid.split('@')[0],
      presence: 'offline' as Contact['presence']
    }));
    
    set({ contacts });
    
    // Fetch avatars for all contacts using vCard4
    const { fetchContactAvatar } = get();
    contacts.forEach(contact => {
      setTimeout(() => {
        fetchContactAvatar(contact.jid);
      }, Math.random() * 2000); // Stagger requests
    });
  }
  
  // Handle room discovery - only include actual conference rooms
  if (stanza.getChild('query', 'http://jabber.org/protocol/disco#items') && type === 'result') {
    const query = stanza.getChild('query', 'http://jabber.org/protocol/disco#items');
    const items = query.getChildren('item');
    
    // Filter to only include conference rooms, not system modules
    const rooms: Room[] = items
      .filter((item: any) => {
        const jid = item.attrs.jid;
        // Only include JIDs that are actual conference rooms
        return jid && 
               jid.includes('@conference.ejabberd.voicehost.io') &&
               !jid.includes('announcements') &&
               !jid.includes('operations') &&
               !jid.includes('configuration') &&
               !jid.includes('management') &&
               !jid.includes('outgoing') &&
               !jid.includes('proxy') &&
               !jid.includes('pubsub') &&
               !jid.includes('upload') &&
               !jid.includes('api') &&
               !jid.includes('mod_') &&
               !jid.includes('system') &&
               // Ensure it's not a system component
               !jid.split('@')[0].includes('.') &&
               jid.split('@')[0].length > 1;
      })
      .map((item: any) => ({
        jid: item.attrs.jid,
        name: item.attrs.name || item.attrs.jid.split('@')[0],
        participants: [],
        isOwner: false
      }));
    
    if (rooms.length > 0) {
      set((state: any) => ({
        rooms: [...state.rooms, ...rooms.filter(room => 
          !state.rooms.find((r: Room) => r.jid === room.jid)
        )]
      }));
    }
  }

  // Handle room affiliations response
  if (stanza.getChild('query', 'http://jabber.org/protocol/muc#admin') && type === 'result') {
    const query = stanza.getChild('query', 'http://jabber.org/protocol/muc#admin');
    const items = query.getChildren('item');
    const roomJid = stanza.attrs.from;
    
    const affiliations: RoomAffiliation[] = items.map((item: any) => ({
      jid: item.attrs.jid,
      name: item.attrs.jid?.split('@')[0] || 'Unknown',
      affiliation: item.attrs.affiliation,
      role: item.attrs.role
    }));
    
    set((state: any) => ({
      rooms: state.rooms.map((room: Room) => 
        room.jid === roomJid ? { ...room, affiliations } : room
      )
    }));
  }
};
