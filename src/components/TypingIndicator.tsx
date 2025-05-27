
import React from 'react';
import { useXMPPStore } from '@/store/xmppStore';

interface TypingIndicatorProps {
  chatJid: string;
  chatType: 'chat' | 'groupchat';
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ chatJid, chatType }) => {
  const { typingStates, contacts, currentUser } = useXMPPStore();
  
  const currentTyping = typingStates[chatJid] || [];
  const activeTyping = currentTyping.filter(state => 
    state.state === 'composing' &&
    Date.now() - state.timestamp.getTime() < 10000 // Only show if less than 10 seconds old
  );

  console.log('TypingIndicator render:', { 
    chatJid, 
    chatType, 
    currentTyping, 
    activeTyping, 
    currentUser,
    allTypingStates: typingStates 
  });

  if (activeTyping.length === 0) {
    return null;
  }

  const getDisplayName = (userJid: string) => {
    console.log('Getting display name for:', { userJid, chatType });
    
    if (chatType === 'groupchat') {
      // For group chats, extract nickname from full JID (room@domain/nickname)
      const parts = userJid.split('/');
      if (parts.length > 1) {
        const nickname = parts[1];
        console.log('Extracted nickname:', nickname);
        return nickname;
      }
      // Fallback to username if no nickname
      const username = userJid.split('@')[0];
      console.log('Using username fallback:', username);
      return username;
    } else {
      // For direct chats, find contact name or use username
      const contactJid = userJid.split('/')[0]; // Remove resource if present
      const contact = contacts.find(c => c.jid === contactJid);
      const displayName = contact?.name || contactJid.split('@')[0];
      console.log('Direct chat display name:', { contactJid, contact, displayName });
      return displayName;
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

  const typingText = getTypingText();
  console.log('Typing text:', typingText);

  return (
    <div className="px-4 py-2 text-sm text-gray-500 italic animate-pulse">
      {typingText}
    </div>
  );
};
