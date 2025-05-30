
import { parseMessageStanza, createMessageObject } from './utils/messageParser';
import { isMessageBlocked, isDuplicateMessage } from './utils/messageValidator';
import { updateContactsAndRooms, updateMessagesState } from './utils/stateUpdater';

export const handleRegularMessage = (stanza: any, set: any, get: any) => {
  const { currentUser, blockedContacts, showMessageNotification } = get();

  // Parse the message stanza
  const parsedData = parseMessageStanza(stanza, currentUser);
  if (!parsedData) return;

  console.log(`Processing message for chat: ${parsedData.chatJid}`, {
    from: parsedData.from,
    to: parsedData.to,
    currentUser,
    type: parsedData.type,
    chatJid: parsedData.chatJid,
    body: parsedData.body.substring(0, 50) + (parsedData.body.length > 50 ? '...' : '')
  });

  // Check if contact/room is blocked
  if (isMessageBlocked(parsedData.from, parsedData.chatJid, blockedContacts)) {
    console.log(`Blocked message from ${parsedData.from.split('/')[0]} in chat ${parsedData.chatJid}`);
    return;
  }

  // Create message object
  const message = createMessageObject(parsedData);

  set((state: any) => {
    const existingMessages = state.messages[parsedData.chatJid] || [];
    
    // Check for duplicate messages
    if (isDuplicateMessage(message, existingMessages)) {
      console.log('Duplicate message detected, skipping');
      return state;
    }

    // Update contact/room with latest activity
    const { updatedContacts, updatedRooms } = updateContactsAndRooms(state, parsedData);
    
    // Update messages state
    const messagesUpdate = updateMessagesState(state, parsedData.chatJid, message);

    return {
      ...messagesUpdate,
      contacts: updatedContacts,
      rooms: updatedRooms
    };
  });

  // Show notification for new messages
  showMessageNotification(parsedData.from, parsedData.body, parsedData.type);
};
