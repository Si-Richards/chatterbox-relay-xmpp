
import { Contact, Room, Message } from '../../../types';

export const updateContactsAndRooms = (
  state: any,
  parsedData: { from: string; chatJid: string; type: 'chat' | 'groupchat' }
) => {
  let updatedContacts = state.contacts;
  let updatedRooms = state.rooms;

  if (parsedData.type === 'chat') {
    // Update contact info if it exists
    updatedContacts = state.contacts.map((contact: Contact) => {
      if (contact.jid === parsedData.chatJid) {
        return { ...contact, lastSeen: new Date() };
      }
      return contact;
    });
  } else if (parsedData.type === 'groupchat') {
    // Update room participant list if needed
    updatedRooms = state.rooms.map((room: Room) => {
      if (room.jid === parsedData.chatJid) {
        const nickname = parsedData.from.split('/')[1];
        if (nickname && !room.participants.includes(nickname)) {
          return { ...room, participants: [...room.participants, nickname] };
        }
      }
      return room;
    });
  }

  return { updatedContacts, updatedRooms };
};

export const updateMessagesState = (
  state: any,
  chatJid: string,
  message: Message
) => {
  const existingMessages = state.messages[chatJid] || [];
  
  return {
    messages: {
      ...state.messages,
      [chatJid]: [...existingMessages, message]
    }
  };
};
