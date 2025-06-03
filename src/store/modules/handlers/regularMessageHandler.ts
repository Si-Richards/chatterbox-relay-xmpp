
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
  
  // Improved message ownership detection
  let isSentByCurrentUser = false;
  let chatJid = '';
  
  const currentUserJid = currentUser.split('/')[0];
  const currentUserNick = currentUser.split('@')[0];
  
  if (type === 'groupchat') {
    // For group chats, check nickname and full JID matching
    const fromNick = from.split('/')[1];
    const roomJid = from.split('/')[0];
    
    // More robust ownership detection
    isSentByCurrentUser = fromNick === currentUserNick || 
                         from === `${roomJid}/${currentUserNick}` ||
                         from.includes(`/${currentUserNick}`);
    chatJid = roomJid;
  } else {
    // For direct chats, check JID matching
    const fromJid = from.split('/')[0];
    isSentByCurrentUser = fromJid === currentUserJid || from === currentUser;
    chatJid = isSentByCurrentUser ? to.split('/')[0] : fromJid;
  }

  console.log('Regular Message Ownership Detection:', {
    from,
    to,
    currentUser,
    currentUserJid,
    currentUserNick,
    type,
    isSentByCurrentUser,
    chatJid
  });

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
