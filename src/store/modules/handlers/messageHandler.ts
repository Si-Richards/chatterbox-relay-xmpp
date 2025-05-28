
import { xml } from '@xmpp/client';
import { Message, Contact, Room } from '../../types';

export const handleMessageStanza = (stanza: any, set: any, get: any) => {
  const { currentUser, markMessageAsDelivered, setChatState, clearTypingState, showMessageNotification } = get();
  const from = stanza.attrs.from;
  const to = stanza.attrs.to;
  const type = stanza.attrs.type || 'chat';
  const id = stanza.attrs.id;
  const body = stanza.getChildText('body');

  // Handle chat state notifications
  const chatStates = ['active', 'composing', 'paused', 'inactive', 'gone'];
  for (const state of chatStates) {
    if (stanza.getChild(state, 'http://jabber.org/protocol/chatstates')) {
      let chatJid: string;
      let userJid: string;
      
      // Don't process typing states from current user
      const currentUserBareJid = currentUser.split('/')[0];
      const currentUserNickname = currentUser.split('@')[0];
      const senderBareJid = from.split('/')[0];
      
      if (type === 'groupchat') {
        // For group chats: chatJid is room@domain, userJid is nickname
        chatJid = from.split('/')[0];
        const nickname = from.split('/')[1];
        userJid = nickname || from.split('@')[0];
        
        // Skip if it's from current user (check both by nickname and bare JID)
        if (senderBareJid === currentUserBareJid || nickname === currentUserNickname) {
          return;
        }
      } else {
        // For direct chats: chatJid is sender's bare JID, userJid is sender's name
        chatJid = from.split('/')[0];
        const { contacts } = get();
        const contact = contacts.find((c: Contact) => c.jid === chatJid);
        userJid = contact?.name || from.split('@')[0];
        
        // Skip if it's from current user
        if (senderBareJid === currentUserBareJid) {
          return;
        }
      }
      
      console.log(`Processing chat state: ${state} from ${userJid} in ${chatJid} (type: ${type})`);
      
      if (state === 'composing') {
        setChatState(chatJid, userJid, 'composing');
      } else if (state === 'paused') {
        setChatState(chatJid, userJid, 'paused');
      } else {
        clearTypingState(chatJid, userJid);
      }
      
      if (!body) return; // Pure chat state, no message content
    }
  }

  // Handle message receipts
  if (stanza.getChild('received', 'urn:xmpp:receipts')) {
    const messageId = stanza.getChild('received', 'urn:xmpp:receipts').attrs.id;
    const fromJid = from.split('/')[0];
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [fromJid]: (state.messages[fromJid] || []).map((msg: Message) => 
          msg.id === messageId ? { ...msg, status: 'delivered' } : msg
        )
      }
    }));
    return;
  }

  if (stanza.getChild('read', 'urn:xmpp:receipts')) {
    const messageId = stanza.getChild('read', 'urn:xmpp:receipts').attrs.id;
    const fromJid = from.split('/')[0];
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [fromJid]: (state.messages[fromJid] || []).map((msg: Message) => 
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        )
      }
    }));
    return;
  }

  // Handle regular messages
  if (body && from !== currentUser) {
    const fileElement = stanza.getChild('file', 'urn:xmpp:file-transfer');
    let fileData = null;
    
    if (fileElement) {
      fileData = {
        name: fileElement.attrs.name,
        type: fileElement.attrs.type,
        size: parseInt(fileElement.attrs.size),
        url: fileElement.attrs.url
      };
    }

    const message: Message = {
      id: id || `msg-${Date.now()}`,
      from,
      to,
      body,
      timestamp: new Date(),
      type: type as 'chat' | 'groupchat',
      fileData
    };

    const chatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [chatJid]: [...(state.messages[chatJid] || []), message]
      }
    }));

    // Show desktop notification for new message
    showMessageNotification(from, body, type as 'chat' | 'groupchat');

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
  }
};
