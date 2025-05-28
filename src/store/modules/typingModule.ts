
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

  setChatState: (chatJid: string, userJid: string, state: 'composing' | 'paused') => {
    console.log(`Setting typing state: ${userJid} in ${chatJid} is ${state}`);
    
    set((prevState: any) => {
      const currentStates = prevState.typingStates[chatJid] || [];
      const filteredStates = currentStates.filter((s: TypingState) => s.user !== userJid);
      
      const newState: TypingState = {
        user: userJid,
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

    setTimeout(() => {
      get().clearTypingState(chatJid, userJid);
    }, 10000);
  },

  clearTypingState: (chatJid: string, userJid?: string) => {
    console.log(`Clearing typing state: ${userJid || 'all'} in ${chatJid}`);
    
    set((state: any) => {
      const currentStates = state.typingStates[chatJid] || [];
      const filteredStates = userJid 
        ? currentStates.filter((s: TypingState) => s.user !== userJid)
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
    set((state: any) => ({
      currentUserTyping: {
        ...state.currentUserTyping,
        [chatJid]: isTyping
      }
    }));
  }
});
