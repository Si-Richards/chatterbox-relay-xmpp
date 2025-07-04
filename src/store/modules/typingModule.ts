
import { xml } from '@xmpp/client';
import { TypingState } from '../types';

export const createTypingModule = (set: any, get: any) => ({
  sendChatState: (to: string, state: 'composing' | 'active' | 'paused' | 'inactive' | 'gone', type: 'chat' | 'groupchat') => {
    const { client } = get();
    if (!client) return;

    console.log(`Sending chat state ${state} to ${to} (type: ${type})`);

    const stateMessage = xml(
      'message',
      { to, type, id: `state-${Date.now()}` },
      xml(state, { xmlns: 'http://jabber.org/protocol/chatstates' })
    );

    client.send(stateMessage);
  },

  setChatState: (chatJid: string, userIdentifier: string, state: 'composing' | 'paused') => {
    console.log(`Setting typing state: ${userIdentifier} in ${chatJid} is ${state}`);
    
    set((prevState: any) => {
      const currentStates = prevState.typingStates[chatJid] || [];
      const filteredStates = currentStates.filter((s: TypingState) => s.user !== userIdentifier);
      
      const newState: TypingState = {
        user: userIdentifier,
        chatJid,
        timestamp: new Date(),
        state
      };

      return {
        typingStates: {
          ...prevState.typingStates,
          [chatJid]: [...filteredStates, newState]
        }
      };
    });

    // Auto-clear typing state after 10 seconds
    setTimeout(() => {
      get().clearTypingState(chatJid, userIdentifier);
    }, 10000);
  },

  clearTypingState: (chatJid: string, userIdentifier?: string) => {
    console.log(`Clearing typing state: ${userIdentifier || 'all'} in ${chatJid}`);
    
    set((state: any) => {
      const currentStates = state.typingStates[chatJid] || [];
      const filteredStates = userIdentifier 
        ? currentStates.filter((s: TypingState) => s.user !== userIdentifier)
        : [];

      return {
        typingStates: {
          ...state.typingStates,
          [chatJid]: filteredStates
        }
      };
    });
  },

  setCurrentUserTyping: (chatJid: string, isTyping: boolean) => {
    console.log(`Setting current user typing state: ${chatJid} = ${isTyping}`);
    set((state: any) => ({
      currentUserTyping: {
        ...state.currentUserTyping,
        [chatJid]: isTyping
      }
    }));
  }
});
