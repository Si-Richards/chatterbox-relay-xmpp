
import { Contact, Room, RoomAffiliation } from '../../types';

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
      
      if (itemElement) {
        const affiliation = itemElement.attrs.affiliation || 'none';
        const role = itemElement.attrs.role || 'none';
        const jid = itemElement.attrs.jid || from;
        
        console.log(`MUC presence: user=${nickname}, affiliation=${affiliation}, role=${role}, isCurrentUser=${isCurrentUser}`);
        
        // Update room with affiliation info for any user
        set((state: any) => ({
          rooms: state.rooms.map((room: Room) => {
            if (room.jid === roomJid) {
              const affiliations = room.affiliations || [];
              
              // Find existing affiliation or create new one
              const existingIndex = affiliations.findIndex(aff => 
                aff.jid === jid || aff.jid === currentUser || aff.name === nickname
              );
              
              const newAffiliation: RoomAffiliation = {
                jid: jid,
                name: nickname,
                affiliation: affiliation as 'owner' | 'admin' | 'member' | 'none',
                role: role as 'moderator' | 'participant' | 'visitor' | 'none'
              };
              
              let updatedAffiliations;
              if (existingIndex >= 0) {
                updatedAffiliations = [...affiliations];
                updatedAffiliations[existingIndex] = newAffiliation;
              } else {
                updatedAffiliations = [...affiliations, newAffiliation];
              }
              
              // Check ownership from localStorage first, then from affiliation
              const roomOwnership = JSON.parse(localStorage.getItem('roomOwnership') || '{}');
              let isOwner = room.isOwner;
              
              if (isCurrentUser) {
                // Check localStorage first
                if (roomOwnership[roomJid] === currentUser) {
                  isOwner = true;
                } else if (affiliation === 'owner') {
                  isOwner = true;
                  // Store in localStorage for future sessions
                  roomOwnership[roomJid] = currentUser;
                  localStorage.setItem('roomOwnership', JSON.stringify(roomOwnership));
                }
              }
              
              console.log(`Updated room ${roomJid}: isOwner=${isOwner}, affiliations count=${updatedAffiliations.length}`);
              
              return {
                ...room,
                isOwner,
                affiliations: updatedAffiliations
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
        
        // Store ownership in localStorage
        const roomOwnership = JSON.parse(localStorage.getItem('roomOwnership') || '{}');
        roomOwnership[roomJid] = currentUser;
        localStorage.setItem('roomOwnership', JSON.stringify(roomOwnership));
        
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

    // Handle vCard update notifications in presence
    const vCardUpdate = stanza.getChild('x', 'vcard-temp:x:update');
    if (vCardUpdate) {
      const photo = vCardUpdate.getChildText('photo');
      if (photo === 'updated' || photo === '') {
        // Fetch the updated vCard using vCard4
        const { fetchContactAvatar } = get();
        setTimeout(() => {
          fetchContactAvatar(contactJid);
        }, 500); // Small delay to ensure vCard is updated
      }
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
