
import { Message, Contact, PollData } from '../../types';

export const handleRegularMessage = (stanza: any, set: any, get: any) => {
  const { 
    currentUser, 
    markMessageAsDelivered, 
    clearTypingState, 
    showMessageNotification, 
    handleOMEMOMessage 
  } = get();
  
  const from = stanza.attrs.from;
  const to = stanza.attrs.to;
  const type = stanza.attrs.type || 'chat';
  const id = stanza.attrs.id;
  const body = stanza.getChildText('body');

  if (!body || from === currentUser) {
    return false;
  }

  const fileElement = stanza.getChild('file', 'urn:xmpp:file-transfer');
  const pollElement = stanza.getChild('poll', 'urn:xmpp:poll');
  
  // Check for OMEMO encryption
  const omemoInfo = handleOMEMOMessage(stanza);
  
  let fileData = null;
  let pollData: PollData | null = null;
  
  if (fileElement) {
    fileData = {
      name: fileElement.attrs.name,
      type: fileElement.attrs.type,
      size: parseInt(fileElement.attrs.size),
      url: fileElement.attrs.url
    };
  }
  
  if (pollElement) {
    const options = pollElement.getChildren('option').map((opt: any, index: number) => ({
      id: opt.attrs.id || `opt-${index}`,
      text: opt.getText(),
      votes: []
    }));
    
    pollData = {
      id: pollElement.attrs.id,
      question: pollElement.attrs.question,
      options,
      createdBy: from,
      createdAt: new Date(),
      expiresAt: pollElement.attrs.expires ? new Date(pollElement.attrs.expires) : undefined,
      isAnonymous: pollElement.attrs.anonymous === 'true',
      allowMultipleChoice: pollElement.attrs.multiple === 'true',
      isClosed: pollElement.attrs.closed === 'true',
      totalVotes: 0
    };
  }

  const message: Message = {
    id: id || `msg-${Date.now()}`,
    from,
    to,
    body: omemoInfo.isEncrypted ? (omemoInfo.fallbackBody || body) : body,
    timestamp: new Date(),
    type: type as 'chat' | 'groupchat',
    fileData,
    pollData,
    isEncrypted: omemoInfo.isEncrypted,
    encryptionType: omemoInfo.isEncrypted ? 'omemo' : undefined
  };

  const chatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
  
  set((state: any) => {
    const existingMessages = state.messages[chatJid] || [];
    // Check for duplicates to avoid adding same message twice
    const messageExists = existingMessages.some((msg: Message) => 
      msg.id === message.id || 
      (msg.from === message.from && msg.body === message.body && 
       Math.abs(new Date(msg.timestamp).getTime() - message.timestamp.getTime()) < 1000)
    );
    
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

  // Show desktop notification for new message
  showMessageNotification(from, omemoInfo.isEncrypted ? '🔒 Encrypted message' : body, type as 'chat' | 'groupchat');

  // Send delivery receipt
  if (id && stanza.getChild('request', 'urn:xmpp:receipts')) {
    markMessageAsDelivered(from, id);
  }

  // Clear typing state for sender
  if (type === 'groupchat') {
    const nickname = from.split('/')[1];
    clearTypingState(chatJid, nickname || from.split('@')[0]);
  } else {
    const { contacts } = get();
    const contact = contacts.find((c: Contact) => c.jid === chatJid);
    const userName = contact?.name || from.split('@')[0];
    clearTypingState(chatJid, userName);
  }

  return true;
};
