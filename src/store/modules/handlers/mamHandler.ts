
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
  
  // Improved message ownership detection with exact matching
  let isSentByCurrentUser = false;
  let chatJid = '';
  
  const currentUserBareJid = currentUser.split('/')[0]; // Remove resource
  const currentUserNickname = currentUser.split('@')[0]; // Username part only
  
  if (mamType === 'groupchat') {
    // For group chats - extract room and nickname
    const roomJid = mamFrom.split('/')[0];
    const fromNickname = mamFrom.split('/')[1];
    
    // Exact nickname matching for group messages
    isSentByCurrentUser = fromNickname === currentUserNickname;
    chatJid = roomJid;
    
    console.log('MAM Groupchat Ownership Check:', {
      fromNickname,
      currentUserNickname,
      mamFrom,
      isSentByCurrentUser
    });
  } else {
    // For direct chats - exact JID matching
    const fromBareJid = mamFrom.split('/')[0];
    const toBareJid = mamTo.split('/')[0];
    
    isSentByCurrentUser = fromBareJid === currentUserBareJid;
    chatJid = isSentByCurrentUser ? toBareJid : fromBareJid;
    
    console.log('MAM Direct Chat Ownership Check:', {
      fromBareJid,
      currentUserBareJid,
      mamFrom,
      mamTo,
      isSentByCurrentUser
    });
  }
  
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
