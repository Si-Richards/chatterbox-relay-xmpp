
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

  if (activeTyping.length === 0) {
    return null;
  }

  const getDisplayName = (userJid: string) => {
    if (chatType === 'groupchat') {
      // For group chats, extract nickname from full JID
      return userJid.split('/')[1] || userJid.split('@')[0];
    } else {
      // For direct chats, find contact name
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
