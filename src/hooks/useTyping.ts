
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
    if (!isComposingRef.current) {
      isComposingRef.current = true;
      setCurrentUserTyping(chatJid, true);
      sendChatState(chatJid, 'composing', chatType);
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
      if (isComposingRef.current) {
        isComposingRef.current = false;
        setCurrentUserTyping(chatJid, false);
        sendChatState(chatJid, 'paused', chatType);
      }
    }, 3000);
  }, [chatJid, chatType, sendChatState, setCurrentUserTyping]);

  const stopTyping = useCallback(() => {
    if (isComposingRef.current) {
      isComposingRef.current = false;
      setCurrentUserTyping(chatJid, false);
      sendChatState(chatJid, 'active', chatType);
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
