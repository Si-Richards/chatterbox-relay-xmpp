
import { Contact } from '../../types';

export const handleChatState = (stanza: any, set: any, get: any) => {
  const { currentUser, setChatState, clearTypingState } = get();
  const from = stanza.attrs.from;
  const type = stanza.attrs.type || 'chat';
  
  const chatStates = ['active', 'composing', 'paused', 'inactive', 'gone'];
  
  for (const state of chatStates) {
    if (!stanza.getChild(state, 'http://jabber.org/protocol/chatstates')) continue;
    
    let chatJid: string;
    let userIdentifier: string;
    
    const currentUserBareJid = currentUser.split('/')[0];
    const currentUserNickname = currentUser.split('@')[0];
    
    if (type === 'groupchat') {
      // For group chats: chatJid is room@domain, userIdentifier is nickname
      chatJid = from.split('/')[0];
      const nickname = from.split('/')[1];
      userIdentifier = nickname || from.split('@')[0];
      
      // Skip if it's from current user (check by nickname)
      if (nickname === currentUserNickname) {
        console.log(`Skipping typing state from current user: ${nickname}`);
        return true;
      }
      
      console.log(`Group chat typing: ${userIdentifier} in ${chatJid} is ${state}`);
    } else {
      // For direct chats: chatJid is sender's bare JID, userIdentifier is contact name
      chatJid = from.split('/')[0];
      
      // Skip if it's from current user
      if (chatJid === currentUserBareJid) {
        console.log(`Skipping typing state from current user in direct chat: ${chatJid}`);
        return true;
      }
      
      const { contacts } = get();
      const contact = contacts.find((c: Contact) => c.jid === chatJid);
      userIdentifier = contact?.name || from.split('@')[0];
      
      console.log(`Direct chat typing: ${userIdentifier} in ${chatJid} is ${state}`);
    }
    
    if (state === 'composing') {
      setChatState(chatJid, userIdentifier, 'composing');
    } else if (state === 'paused') {
      setChatState(chatJid, userIdentifier, 'paused');
    } else {
      clearTypingState(chatJid, userIdentifier);
    }
    
    return true; // Handled chat state
  }
  
  return false; // No chat state found
};
