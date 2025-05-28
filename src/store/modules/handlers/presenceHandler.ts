
import { Contact, Room } from '../../types';

export const handlePresenceStanza = (stanza: any, set: any, get: any) => {
  const from = stanza.attrs.from;
  const type = stanza.attrs.type;
  const { currentUser } = get();

  // Handle MUC presence
  if (from.includes('@conference.')) {
    const roomJid = from.split('/')[0];
    const nickname = from.split('/')[1];
    const currentUserNickname = currentUser.split('@')[0];

    // Handle MUC status codes and affiliations
    const xElement = stanza.getChild('x', 'http://jabber.org/protocol/muc#user');
    if (xElement) {
      const itemElement = xElement.getChild('item');
      const statusElements = xElement.getChildren('status');
      
      // Check if this is the current user joining
      const isCurrentUser = nickname === currentUserNickname;
      
      if (itemElement && isCurrentUser) {
        const affiliation = itemElement.attrs.affiliation;
        const role = itemElement.attrs.role;
        
        console.log(`MUC presence for current user: affiliation=${affiliation}, role=${role}`);
        
        // Update room with current user's affiliation info
        set((state: any) => ({
          rooms: state.rooms.map((room: Room) => {
            if (room.jid === roomJid) {
              const isOwner = affiliation === 'owner';
              console.log(`Setting room ${roomJid} owner status: ${isOwner}`);
              return {
                ...room,
                isOwner,
                affiliations: room.affiliations || []
              };
            }
            return room;
          })
        }));
      }

      // Check for room creation status (code 201 means room was created)
      const hasCode201 = statusElements.some((status: any) => status.attrs.code === '201');
      if (hasCode201 && isCurrentUser) {
        console.log(`User created room ${roomJid}, setting as owner`);
        set((state: any) => ({
          rooms: state.rooms.map((room: Room) => 
            room.jid === roomJid ? { ...room, isOwner: true } : room
          )
        }));
      }
    }

    // Handle room participants
    if (type === 'unavailable') {
      set((state: any) => ({
        rooms: state.rooms.map((room: Room) => 
          room.jid === roomJid 
            ? { ...room, participants: room.participants.filter(p => p !== from) }
            : room
        )
      }));
    } else {
      set((state: any) => ({
        rooms: state.rooms.map((room: Room) => {
          if (room.jid === roomJid) {
            const participants = room.participants.includes(from) 
              ? room.participants 
              : [...room.participants, from];
            return { ...room, participants };
          }
          return room;
        })
      }));
    }
  } else {
    // Handle regular contact presence
    const contactJid = from.split('/')[0];
    
    if (type === 'subscribe') {
      // Auto-accept subscription requests
      const { client } = get();
      if (client) {
        const subscribed = stanza.clone();
        subscribed.attrs.to = subscribed.attrs.from;
        subscribed.attrs.from = subscribed.attrs.to;
        subscribed.attrs.type = 'subscribed';
        client.send(subscribed);

        const subscribe = stanza.clone();
        subscribe.attrs.to = subscribe.attrs.from;
        subscribe.attrs.from = subscribe.attrs.to;
        subscribe.attrs.type = 'subscribe';
        client.send(subscribe);
      }
      return;
    }

    const show = stanza.getChildText('show') || 'available';
    const status = stanza.getChildText('status') || '';
    
    let presence: Contact['presence'] = 'offline';
    if (!type || type === 'available') {
      presence = show === 'away' ? 'away' : 
                 show === 'dnd' ? 'dnd' : 
                 show === 'xa' ? 'xa' : 'online';
    }

    set((state: any) => ({
      contacts: state.contacts.map((contact: Contact) =>
        contact.jid === contactJid
          ? { 
              ...contact, 
              presence, 
              status,
              lastSeen: presence === 'offline' ? new Date() : contact.lastSeen 
            }
          : contact
      )
    }));
  }
};
