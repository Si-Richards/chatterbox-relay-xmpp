
import { useCallback, useRef, useEffect } from 'react';
import { useXMPPStore } from '@/store/xmppStore';

interface UseTypingOptions {
  chatJid: string;
  chatType: 'chat' | 'groupchat';
}

export const useTyping = ({ chatJid, chatType }: UseTypingOptions) => {
  const { sendChatState, setCurrentUserTyping } = useXMPPStore();
  const composingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pausedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isComposingRef = useRef(false);

  const startTyping = useCallback(() => {
    console.log('startTyping called:', { chatJid, chatType, isComposing: isComposingRef.current });
    
    if (!isComposingRef.current) {
      isComposingRef.current = true;
      setCurrentUserTyping(chatJid, true);
      sendChatState(chatJid, 'composing', chatType);
      console.log('Sent composing state');
    }

    // Clear existing timeouts
    if (composingTimeoutRef.current) {
      clearTimeout(composingTimeoutRef.current);
    }
    if (pausedTimeoutRef.current) {
      clearTimeout(pausedTimeoutRef.current);
    }

    // Set paused timeout for 3 seconds of inactivity
    pausedTimeoutRef.current = setTimeout(() => {
      console.log('Paused timeout triggered');
      if (isComposingRef.current) {
        isComposingRef.current = false;
        setCurrentUserTyping(chatJid, false);
        sendChatState(chatJid, 'paused', chatType);
      }
    }, 3000);
  }, [chatJid, chatType, sendChatState, setCurrentUserTyping]);

  const stopTyping = useCallback(() => {
    console.log('stopTyping called:', { chatJid, chatType, isComposing: isComposingRef.current });
    
    if (isComposingRef.current) {
      isComposingRef.current = false;
      setCurrentUserTyping(chatJid, false);
      sendChatState(chatJid, 'active', chatType);
      console.log('Sent active state');
    }

    // Clear timeouts
    if (composingTimeoutRef.current) {
      clearTimeout(composingTimeoutRef.current);
      composingTimeoutRef.current = null;
    }
    if (pausedTimeoutRef.current) {
      clearTimeout(pausedTimeoutRef.current);
      pausedTimeoutRef.current = null;
    }
  }, [chatJid, chatType, sendChatState, setCurrentUserTyping]);

  // Cleanup on unmount or chat change
  useEffect(() => {
    return () => {
      console.log('useTyping cleanup');
      if (composingTimeoutRef.current) {
        clearTimeout(composingTimeoutRef.current);
      }
      if (pausedTimeoutRef.current) {
        clearTimeout(pausedTimeoutRef.current);
      }
      if (isComposingRef.current) {
        isComposingRef.current = false;
        setCurrentUserTyping(chatJid, false);
        sendChatState(chatJid, 'active', chatType);
      }
    };
  }, [chatJid, chatType, sendChatState, setCurrentUserTyping]);

  return {
    startTyping,
    stopTyping
  };
};
