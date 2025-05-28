
import { Contact, Room } from '../../types';

export const handlePresenceStanza = (stanza: any, set: any, get: any) => {
  const from = stanza.attrs.from;
  const type = stanza.attrs.type;
  
  if (from.includes('conference.')) {
    // Handle MUC presence
    const roomJid = from.split('/')[0];
    const nickname = from.split('/')[1];
    
    if (type === 'unavailable') {
      // User left the room
      set((state: any) => ({
        rooms: state.rooms.map((room: Room) => {
          if (room.jid === roomJid) {
            return {
              ...room,
              participants: room.participants.filter((p: string) => 
                !p.includes(nickname)
              )
            };
          }
          return room;
        })
      }));
    } else {
      // User joined or updated presence
      set((state: any) => ({
        rooms: state.rooms.map((room: Room) => {
          if (room.jid === roomJid) {
            const existingParticipant = room.participants.find((p: string) => 
              p.includes(nickname)
            );
            
            if (!existingParticipant) {
              return {
                ...room,
                participants: [...room.participants, from]
              };
            }
          }
          return room;
        })
      }));
    }
  } else {
    // Handle regular contact presence
    const jid = from.split('/')[0];
    const show = stanza.getChildText('show') || 'online';
    const presence = type === 'unavailable' ? 'offline' : show;
    
    set((state: any) => ({
      contacts: state.contacts.map((contact: Contact) => {
        if (contact.jid === jid) {
          return {
            ...contact,
            presence: presence as Contact['presence'],
            lastSeen: presence === 'offline' ? new Date() : contact.lastSeen
          };
        }
        return contact;
      })
    }));
  }
};
