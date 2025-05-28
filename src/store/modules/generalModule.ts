
export const createGeneralModule = (set: any, get: any) => ({
  setActiveChat: (chatJid: string, type: 'chat' | 'groupchat') => {
    set({ 
      activeChat: chatJid, 
      activeChatType: type 
    });
  },

  setContactSortMethod: (method: 'newest' | 'alphabetical') => {
    set({ contactSortMethod: method });
  },

  setRoomSortMethod: (method: 'newest' | 'alphabetical') => {
    set({ roomSortMethod: method });
  }
});
