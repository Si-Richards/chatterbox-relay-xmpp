
import { Message } from '../../types';
import { detectMessageOwnership } from './messageOwnership';

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
  
  // Use improved ownership detection
  const { isSentByCurrentUser, chatJid } = detectMessageOwnership(mamFrom, mamTo, currentUser, mamType as 'chat' | 'groupchat');
  
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

  // Enhanced file detection for better media handling
  const fileElement = originalMessage.getChild('file', 'urn:xmpp:file-transfer');
  if (fileElement) {
    message.fileData = {
      name: fileElement.attrs.name || 'Unknown file',
      type: fileElement.attrs.type || 'application/octet-stream',
      size: parseInt(fileElement.attrs.size || '0'),
      url: fileElement.attrs.url || ''
    };
  }
  
  set((state: any) => {
    const existingMessages = state.messages[chatJid] || [];
    
    // Enhanced deduplication - check by ID and timestamp
    const messageExists = existingMessages.some((msg: Message) => 
      msg.id === mamId || 
      (msg.from === mamFrom && msg.timestamp.getTime() === timestamp.getTime() && msg.body === mamBody)
    );
    
    if (!messageExists) {
      const updatedMessages = [...existingMessages, message].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      console.log(`Added MAM message: ${chatJid} - ${isSentByCurrentUser ? 'sent' : 'received'} - ${mamBody.substring(0, 50)}`);
      
      return {
        messages: {
          ...state.messages,
          [chatJid]: updatedMessages
        }
      };
    } else {
      console.log(`Duplicate MAM message ignored: ${mamId}`);
    }
    return state;
  });

  return true;
};
