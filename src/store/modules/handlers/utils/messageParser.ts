
import { Message } from '../../../types';

export interface ParsedMessageData {
  from: string;
  to: string;
  body: string;
  type: 'chat' | 'groupchat';
  id: string;
  chatJid: string;
}

export const parseMessageStanza = (stanza: any, currentUser: string): ParsedMessageData | null => {
  const from = stanza.attrs.from;
  const to = stanza.attrs.to;
  const body = stanza.getChildText('body');
  const type = stanza.attrs.type || 'chat';
  const id = stanza.attrs.id || `msg-${Date.now()}`;

  if (!body || !from || !to) {
    return null;
  }

  // Determine the chat JID based on message type
  let chatJid: string;
  if (type === 'groupchat') {
    // For group chats, use the room JID (without resource)
    chatJid = from.split('/')[0];
  } else {
    // For direct chats, use the bare JID of the other participant
    const currentUserBareJid = currentUser.split('/')[0];
    const fromBareJid = from.split('/')[0];
    const toBareJid = to.split('/')[0];
    
    // If we sent the message, the chat JID is the recipient
    // If we received the message, the chat JID is the sender
    chatJid = (fromBareJid === currentUserBareJid) ? toBareJid : fromBareJid;
  }

  return {
    from,
    to,
    body,
    type: type as 'chat' | 'groupchat',
    id,
    chatJid
  };
};

export const createMessageObject = (parsedData: ParsedMessageData): Message => {
  return {
    id: parsedData.id,
    from: parsedData.from,
    to: parsedData.to,
    body: parsedData.body,
    timestamp: new Date(),
    type: parsedData.type,
    status: 'delivered'
  };
};
