
import { Message } from '../../types';
import { detectMessageOwnership } from './messageOwnership';

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
  
  // Use improved ownership detection
  const { isSentByCurrentUser, chatJid } = detectMessageOwnership(from, to, currentUser, type as 'chat' | 'groupchat');

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

  // Enhanced file attachment detection with better media type handling
  const fileElement = stanza.getChild('file', 'urn:xmpp:file-transfer');
  if (fileElement) {
    const fileName = fileElement.attrs.name || 'Unknown file';
    const fileType = fileElement.attrs.type || 'application/octet-stream';
    const fileUrl = fileElement.attrs.url || '';
    
    message.fileData = {
      name: fileName,
      type: fileType,
      size: parseInt(fileElement.attrs.size || '0'),
      url: fileUrl
    };
    
    console.log('File attachment detected:', {
      name: fileName,
      type: fileType,
      url: fileUrl,
      isGif: fileType.includes('gif') || fileName.toLowerCase().endsWith('.gif')
    });
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
      console.log(`Added regular message: ${chatJid} - received - ${body.substring(0, 50)}`);
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
