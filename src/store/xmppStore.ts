
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { XMPPState, Message, Contact } from './types';
import { createConnectionModule } from './modules/connectionModule';
import { createMessageModule } from './modules/messageModule';
import { createPresenceModule } from './modules/presenceModule';
import { createRoomModule } from './modules/roomModule';
import { createTypingModule } from './modules/typingModule';
import { createGeneralModule } from './modules/generalModule';
import { createStanzaHandler } from './modules/stanzaHandler';

export * from './types';

export const useXMPPStore = create<XMPPState>()(
  persist(
    (set, get) => ({
      client: null,
      isConnected: false,
      currentUser: '',
      contacts: [],
      rooms: [],
      messages: {},
      activeChat: null,
      activeChatType: null,
      userStatus: 'online',
      userAvatar: null,
      contactSortMethod: 'newest',
      roomSortMethod: 'newest',
      typingStates: {},
      currentUserTyping: {},
      
      ...createConnectionModule(set, get),
      ...createMessageModule(set, get),
      ...createPresenceModule(set, get),
      ...createRoomModule(set, get),
      ...createTypingModule(set, get),
      ...createGeneralModule(set, get),
      ...createStanzaHandler(set, get)
    }),
    {
      name: 'xmpp-store',
      partialize: (state) => ({
        messages: state.messages,
        contacts: state.contacts,
        rooms: state.rooms,
        userAvatar: state.userAvatar,
        userStatus: state.userStatus,
        contactSortMethod: state.contactSortMethod,
        roomSortMethod: state.roomSortMethod
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.messages) {
          const messagesWithDates = Object.fromEntries(
            Object.entries(state.messages).map(([chatJid, messages]) => [
              chatJid,
              messages.map(msg => ({
                ...msg,
                timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
              }))
            ])
          );
          state.messages = messagesWithDates;
        }
        
        if (state?.contacts) {
          state.contacts = state.contacts.map(contact => ({
            ...contact,
            lastSeen: contact.lastSeen 
              ? (typeof contact.lastSeen === 'string' ? new Date(contact.lastSeen) : contact.lastSeen)
              : undefined
          }));
        }
      }
    }
  )
);
