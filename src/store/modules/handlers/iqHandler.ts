
import { Contact, Room, RoomAffiliation } from '../../types';

export const handleIqStanza = (stanza: any, set: any, get: any) => {
  const type = stanza.attrs.type;
  const id = stanza.attrs.id;
  
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
  }
  
  // Handle room discovery
  if (stanza.getChild('query', 'http://jabber.org/protocol/disco#items') && type === 'result') {
    const query = stanza.getChild('query', 'http://jabber.org/protocol/disco#items');
    const items = query.getChildren('item');
    
    const rooms: Room[] = items.map((item: any) => ({
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
