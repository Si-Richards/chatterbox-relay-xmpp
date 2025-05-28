
import React from 'react';
import { useXMPPStore } from '@/store/xmppStore';

interface TypingIndicatorProps {
  chatJid: string;
  chatType: 'chat' | 'groupchat';
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ chatJid, chatType }) => {
  const { typingStates, contacts, currentUser } = useXMPPStore();
  
  const currentTyping = typingStates[chatJid] || [];
  
  const activeTyping = currentTyping.filter(state => {
    // Filter out expired typing states (older than 10 seconds)
    const isRecent = Date.now() - state.timestamp.getTime() < 10000;
    
    // Filter out current user's typing
    const currentUserBareJid = currentUser.split('/')[0];
    const currentUserNickname = currentUser.split('@')[0];
    
    let isCurrentUser = false;
    
    if (chatType === 'groupchat') {
      // For group chats, state.user is the nickname
      isCurrentUser = state.user === currentUserNickname;
    } else {
      // For direct chats, state.user is the contact name
      // Find contact and compare with current user
      const contact = contacts.find(c => c.name === state.user);
      isCurrentUser = contact?.jid === currentUserBareJid;
    }
    
    console.log(`Typing filter: user=${state.user}, current=${currentUser}, isCurrentUser=${isCurrentUser}, isRecent=${isRecent}, state=${state.state}`);
    
    return state.state === 'composing' && isRecent && !isCurrentUser;
  });

  if (activeTyping.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (activeTyping.length === 1) {
      return `${activeTyping[0].user} is typing...`;
    } else if (activeTyping.length === 2) {
      return `${activeTyping[0].user} and ${activeTyping[1].user} are typing...`;
    } else {
      return `${activeTyping.length} people are typing...`;
    }
  };

  return (
    <div className="px-4 py-2 text-sm text-gray-500 italic animate-pulse">
      {getTypingText()}
    </div>
  );
};
