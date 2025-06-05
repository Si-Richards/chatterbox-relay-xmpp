
import { Message } from '../../types';

export const handleRegularMessage = (stanza: any, set: any, get: any) => {
  const from = stanza.attrs.from;
  const to = stanza.attrs.to;
  const body = stanza.getChildText('body');
  const type = stanza.attrs.type || 'chat';
  const id = stanza.attrs.id;
  const { currentUser, handleOMEMOMessage } = get();

  if (!body || !from) return;

  // Check if message is OMEMO encrypted
  const omemoInfo = handleOMEMOMessage(stanza);
  
  // Improved message ownership detection with exact matching
  let isSentByCurrentUser = false;
  let chatJid = '';
  
  const currentUserBareJid = currentUser.split('/')[0]; // Remove resource
  const currentUserNickname = currentUser.split('@')[0]; // Username part only
  
  if (type === 'groupchat') {
    // For group chats - extract room and nickname
    const roomJid = from.split('/')[0];
    const fromNickname = from.split('/')[1];
    
    // Exact nickname matching for group messages
    isSentByCurrentUser = fromNickname === currentUserNickname;
    chatJid = roomJid;
    
    console.log('Regular Groupchat Ownership Check:', {
      fromNickname,
      currentUserNickname,
      from,
      isSentByCurrentUser
    });
  } else {
    // For direct chats - exact JID matching
    const fromBareJid = from.split('/')[0];
    const toBareJid = to.split('/')[0];
    
    isSentByCurrentUser = fromBareJid === currentUserBareJid;
    chatJid = isSentByCurrentUser ? toBareJid : fromBareJid;
    
    console.log('Regular Direct Chat Ownership Check:', {
      fromBareJid,
      currentUserBareJid,
      from,
      to,
      isSentByCurrentUser
    });
  }

  // Don't process messages we sent ourselves (they're already in state from sendMessage)
  if (isSentByCurrentUser) {
    console.log('Ignoring message from self:', from);
    return;
  }

  const message: Message = {
    id: id || `msg-${Date.now()}`,
    from,
    to,
    body: omemoInfo.isEncrypted ? (omemoInfo.fallbackBody || body) : body,
    timestamp: new Date(),
    type: type as 'chat' | 'groupchat',
    status: 'delivered',
    isEncrypted: omemoInfo.isEncrypted,
    encryptionType: omemoInfo.isEncrypted ? 'omemo' : undefined
  };

  // Check for file attachment
  const fileElement = stanza.getChild('file', 'urn:xmpp:file-transfer');
  if (fileElement) {
    message.fileData = {
      name: fileElement.attrs.name || 'Unknown file',
      type: fileElement.attrs.type || 'application/octet-stream',
      size: parseInt(fileElement.attrs.size || '0'),
      url: fileElement.attrs.url || ''
    };
  }

  // Check for poll data
  const pollElement = stanza.getChild('poll', 'urn:xmpp:poll');
  if (pollElement) {
    const options = pollElement.getChildren('option').map((opt: any, index: number) => ({
      id: opt.attrs.id || `opt-${index}`,
      text: opt.getText() || opt.attrs.text || '',
      votes: []
    }));

    message.pollData = {
      id: pollElement.attrs.id || `poll-${Date.now()}`,
      question: pollElement.attrs.question || '',
      options,
      createdBy: from,
      createdAt: new Date(),
      isAnonymous: pollElement.attrs.anonymous === 'true',
      allowMultipleChoice: pollElement.attrs.multiple === 'true',
      expiresAt: pollElement.attrs.expires ? new Date(pollElement.attrs.expires) : undefined,
      isClosed: pollElement.attrs.closed === 'true',
      totalVotes: 0
    };
  }

  set((state: any) => {
    const existingMessages = state.messages[chatJid] || [];
    const messageExists = existingMessages.some((msg: Message) => msg.id === message.id);
    
    if (!messageExists) {
      return {
        messages: {
          ...state.messages,
          [chatJid]: [...existingMessages, message]
        }
      };
    }
    return state;
  });

  // Send delivery receipt for direct messages
  if (type === 'chat' && id) {
    const { markMessageAsDelivered } = get();
    markMessageAsDelivered(from, id);
  }
};
