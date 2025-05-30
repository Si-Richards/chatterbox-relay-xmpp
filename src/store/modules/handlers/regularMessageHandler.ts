
import { parseMessageStanza, createMessageObject } from './utils/messageParser';
import { isMessageBlocked, isDuplicateMessage } from './utils/messageValidator';
import { updateContactsAndRooms, updateMessagesState } from './utils/stateUpdater';
import { validateMessageStanza, rateLimitCheck } from './utils/secureMessageValidator';

export const handleRegularMessage = (stanza: any, set: any, get: any) => {
  const { currentUser, blockedContacts, showMessageNotification } = get();

  // Security validation first
  const validationResult = validateMessageStanza(stanza);
  if (!validationResult.isValid) {
    console.error('Message validation failed:', validationResult.errors);
    return;
  }

  // Rate limiting check
  const senderJid = validationResult.sanitizedData!.from.split('/')[0];
  if (!rateLimitCheck(senderJid, 'send-message')) {
    console.warn(`Rate limit exceeded for user: ${senderJid}`);
    return;
  }

  // Parse the message stanza with validated data
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
