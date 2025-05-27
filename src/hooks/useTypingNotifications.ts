
import { useEffect, useRef } from 'react';
import { xml } from '@xmpp/client';
import { useXMPPStore } from '@/store/xmppStore';

export const useTypingNotifications = () => {
  const { client, activeChat, activeChatType } = useXMPPStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const sendChatState = (state: 'composing' | 'paused' | 'active' | 'inactive' | 'gone', to?: string) => {
    if (!client || (!to && !activeChat)) return;

    const targetJid = to || activeChat!;
    const messageType = activeChatType === 'groupchat' ? 'groupchat' : 'chat';

    const stanza = xml(
      'message',
      { to: targetJid, type: messageType, id: `chatstate-${Date.now()}` },
      xml(state, { xmlns: 'http://jabber.org/protocol/chatstates' })
    );

    client.send(stanza);
  };

  const startTyping = () => {
    if (!isTypingRef.current) {
      sendChatState('composing');
      isTypingRef.current = true;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to send 'paused' after 5 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        sendChatState('paused');
        isTypingRef.current = false;
      }
    }, 5000);
  };

  const stopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (isTypingRef.current) {
      sendChatState('active');
      isTypingRef.current = false;
    }
  };

  const setActive = () => {
    sendChatState('active');
  };

  const setInactive = () => {
    sendChatState('inactive');
  };

  const setGone = () => {
    sendChatState('gone');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    startTyping,
    stopTyping,
    setActive,
    setInactive,
    setGone
  };
};
