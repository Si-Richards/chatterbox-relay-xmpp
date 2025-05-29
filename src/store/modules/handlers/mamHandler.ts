
import { Message } from '../../types';

export const handleMAMMessage = (stanza: any, set: any, get: any) => {
  const { currentUser, handleOMEMOMessage } = get();
  
  if (!stanza.is('message') || !stanza.getChild('result', 'urn:xmpp:mam:2')) {
    return false;
  }

  const result = stanza.getChild('result', 'urn:xmpp:mam:2');
  const forwarded = result?.getChild('forwarded', 'urn:xmpp:forward:0');
  const originalMessage = forwarded?.getChild('message');
  
  if (!originalMessage || !originalMessage.getChildText('body')) {
    return true;
  }

  const mamFrom = originalMessage.attrs.from;
  const mamTo = originalMessage.attrs.to;
  const mamBody = originalMessage.getChildText('body');
  const mamType = originalMessage.attrs.type || 'chat';
  const mamId = originalMessage.attrs.id || `mam-${Date.now()}`;
  
  // Extract timestamp from delay element
  const delay = forwarded?.getChild('delay', 'urn:xmpp:delay');
  const timestamp = delay ? new Date(delay.attrs.stamp) : new Date();

  // Check if MAM message is OMEMO encrypted
  const omemoInfo = handleOMEMOMessage(originalMessage);
  
  // Determine if this message was sent by the current user
  let isSentByCurrentUser = false;
  let chatJid = '';
  
  if (mamType === 'groupchat') {
    // For group chats, check if the nickname part matches current user
    const fromNick = mamFrom.split('/')[1];
    const currentUserNick = currentUser.split('@')[0];
    isSentByCurrentUser = fromNick === currentUserNick || mamFrom.includes(currentUserNick);
    chatJid = mamFrom.split('/')[0];
  } else {
    // For direct chats, check if from matches current user JID
    isSentByCurrentUser = mamFrom === currentUser || mamFrom.split('/')[0] === currentUser.split('/')[0];
    chatJid = isSentByCurrentUser ? mamTo.split('/')[0] : mamFrom.split('/')[0];
  }
  
  // Debug logging
  console.log('MAM Message Processing:', {
    mamFrom,
    mamTo,
    currentUser,
    mamType,
    isSentByCurrentUser,
    chatJid
  });
  
  // Get read status from persisted storage (only for received messages)
  const state = get();
  const pendingReadStatus = (state as any).pendingReadStatus || {};
  const isRead = !isSentByCurrentUser && pendingReadStatus[chatJid]?.[mamId] === 'read';
  
  // Set appropriate status based on message origin
  let messageStatus: 'sent' | 'delivered' | 'read';
  if (isSentByCurrentUser) {
    messageStatus = 'sent';
  } else {
    messageStatus = isRead ? 'read' : 'delivered';
  }
  
  const message: Message = {
    id: mamId,
    from: mamFrom,
    to: mamTo,
    body: omemoInfo.isEncrypted ? (omemoInfo.fallbackBody || mamBody) : mamBody,
    timestamp,
    type: mamType as 'chat' | 'groupchat',
    status: messageStatus,
    isEncrypted: omemoInfo.isEncrypted,
    encryptionType: omemoInfo.isEncrypted ? 'omemo' : undefined
  };
  
  set((state: any) => {
    const existingMessages = state.messages[chatJid] || [];
    const messageExists = existingMessages.some((msg: Message) => msg.id === mamId);
    
    if (!messageExists) {
      const updatedMessages = [...existingMessages, message].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      return {
        messages: {
          ...state.messages,
          [chatJid]: updatedMessages
        }
      };
    }
    return state;
  });

  return true;
};
