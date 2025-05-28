
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
    let isCurrentUser = false;
    
    if (chatType === 'groupchat') {
      // For group chats, state.user is the full JID (room@domain/nickname)
      const typingUserBareJid = state.user.split('/')[0];
      const typingUserNickname = state.user.split('/')[1];
      const currentUserNickname = currentUser.split('@')[0];
      
      // Check if this is the current user by comparing nickname or bare JID
      isCurrentUser = typingUserBareJid === currentUserBareJid || 
                      typingUserNickname === currentUserNickname;
    } else {
      // For direct chats, state.user is the bare JID
      isCurrentUser = state.user === currentUserBareJid;
    }
    
    console.log(`Typing filter: user=${state.user}, current=${currentUser}, isCurrentUser=${isCurrentUser}, isRecent=${isRecent}, state=${state.state}`);
    
    return state.state === 'composing' && isRecent && !isCurrentUser;
  });

  if (activeTyping.length === 0) {
    return null;
  }

  const getDisplayName = (userJid: string) => {
    if (chatType === 'groupchat') {
      // For group chats, extract nickname from full JID (room@domain/nickname)
      const parts = userJid.split('/');
      if (parts.length > 1) {
        return parts[1]; // This is the nickname
      }
      // Fallback to username if no nickname found
      return userJid.split('@')[0];
    } else {
      // For direct chats, find contact name or use username
      const contact = contacts.find(c => c.jid === userJid);
      return contact?.name || userJid.split('@')[0];
    }
  };

  const getTypingText = () => {
    if (activeTyping.length === 1) {
      return `${getDisplayName(activeTyping[0].user)} is typing...`;
    } else if (activeTyping.length === 2) {
      return `${getDisplayName(activeTyping[0].user)} and ${getDisplayName(activeTyping[1].user)} are typing...`;
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
