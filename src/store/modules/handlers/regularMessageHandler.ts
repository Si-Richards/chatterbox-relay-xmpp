
import { Contact, Room, Message } from '../../types';

export const handleRegularMessage = (stanza: any, set: any, get: any) => {
  const from = stanza.attrs.from;
  const to = stanza.attrs.to;
  const body = stanza.getChildText('body');
  const type = stanza.attrs.type || 'chat';
  const id = stanza.attrs.id || `msg-${Date.now()}`;

  if (!body) return;

  const { currentUser, blockedContacts, showMessageNotification } = get();

  // Determine the chat JID based on message type
  let chatJid: string;
  if (type === 'groupchat') {
    // For group chats, use the room JID (without resource)
    chatJid = from.split('/')[0];
  } else {
    // For direct chats, use the bare JID of the other participant
    const currentUserBareJid = currentUser.split('/')[0];
    const fromBareJid = from.split('/')[0];
    const toBareJid = to.split('/')[0];
    
    // If we sent the message, the chat JID is the recipient
    // If we received the message, the chat JID is the sender
    chatJid = (fromBareJid === currentUserBareJid) ? toBareJid : fromBareJid;
  }

  // Check if contact/room is blocked
  const senderBareJid = from.split('/')[0];
  if (blockedContacts.includes(senderBareJid) || blockedContacts.includes(chatJid)) {
    console.log(`Blocked message from ${senderBareJid} in chat ${chatJid}`);
    return;
  }

  const message: Message = {
    id,
    from,
    to,
    body,
    timestamp: new Date(),
    type: type as 'chat' | 'groupchat',
    status: 'delivered'
  };

  console.log(`Processing message for chat: ${chatJid}`, {
    from,
    to,
    currentUser,
    type,
    chatJid,
    body: body.substring(0, 50) + (body.length > 50 ? '...' : '')
  });

  set((state: any) => {
    const existingMessages = state.messages[chatJid] || [];
    
    // Check for duplicate messages
    const isDuplicate = existingMessages.some((msg: Message) => 
      msg.id === id || (msg.body === body && msg.from === from && 
      Math.abs(new Date(msg.timestamp).getTime() - message.timestamp.getTime()) < 1000)
    );
    
    if (isDuplicate) {
      console.log('Duplicate message detected, skipping');
      return state;
    }

    // Update contact/room with latest activity
    let updatedContacts = state.contacts;
    let updatedRooms = state.rooms;

    if (type === 'chat') {
      // Update contact info if it exists
      updatedContacts = state.contacts.map((contact: Contact) => {
        if (contact.jid === chatJid) {
          return { ...contact, lastSeen: new Date() };
        }
        return contact;
      });
    } else if (type === 'groupchat') {
      // Update room participant list if needed
      updatedRooms = state.rooms.map((room: Room) => {
        if (room.jid === chatJid) {
          const nickname = from.split('/')[1];
          if (nickname && !room.participants.includes(nickname)) {
            return { ...room, participants: [...room.participants, nickname] };
          }
        }
        return room;
      });
    }

    return {
      messages: {
        ...state.messages,
        [chatJid]: [...existingMessages, message]
      },
      contacts: updatedContacts,
      rooms: updatedRooms
    };
  });

  // Show notification for new messages
  showMessageNotification(from, body, type);
};
