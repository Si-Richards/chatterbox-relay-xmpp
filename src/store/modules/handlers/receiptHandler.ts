
import { Message } from '../../types';

export const handleMessageReceipt = (stanza: any, set: any, get: any) => {
  const from = stanza.attrs.from;
  
  // Handle delivery receipts
  const received = stanza.getChild('received', 'urn:xmpp:receipts');
  if (received) {
    const messageId = received.attrs.id;
    const fromJid = from.split('/')[0];
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [fromJid]: (state.messages[fromJid] || []).map((msg: Message) => 
          msg.id === messageId ? { ...msg, status: 'delivered' } : msg
        )
      }
    }));
    return true;
  }

  // Handle read receipts
  const read = stanza.getChild('read', 'urn:xmpp:receipts');
  if (read) {
    const messageId = read.attrs.id;
    const fromJid = from.split('/')[0];
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [fromJid]: (state.messages[fromJid] || []).map((msg: Message) => 
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        )
      }
    }));
    return true;
  }

  return false;
};
