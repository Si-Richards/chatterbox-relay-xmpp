
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
import { createNotificationModule } from './modules/notificationModule';
import { createConnectionHealthModule } from './modules/connectionHealthModule';
import { createRoomRefreshModule } from './modules/roomRefreshModule';
import { createOMEMOModule } from './modules/omemoModule';

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
      roomRefreshInterval: null,
      notificationSettings: {
        enabled: false,
        soundEnabled: true,
        showForDirectMessages: true,
        showForGroupMessages: true,
        doNotDisturb: false,
      },
      connectionHealth: {
        isHealthy: true,
        lastPing: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        pingInterval: null,
        reconnectTimeout: null,
        intentionalDisconnect: false,
      },
      
      ...createConnectionModule(set, get),
      ...createConnectionHealthModule(set, get),
      ...createRoomRefreshModule(set, get),
      ...createMessageModule(set, get),
      ...createPresenceModule(set, get),
      ...createRoomModule(set, get),
      ...createTypingModule(set, get),
      ...createGeneralModule(set, get),
      ...createStanzaHandler(set, get),
      ...createNotificationModule(set, get),
      ...createOMEMOModule(set, get)
    }),
    {
      name: 'xmpp-store',
      partialize: (state) => ({
        // Only persist user preferences, not dynamic chat data
        userAvatar: state.userAvatar,
        userStatus: state.userStatus,
        contactSortMethod: state.contactSortMethod,
        roomSortMethod: state.roomSortMethod,
        notificationSettings: state.notificationSettings
      }),
      onRehydrateStorage: () => (state) => {
        // Clear any cached dynamic data on rehydration to ensure fresh server data
        if (state) {
          state.contacts = [];
          state.rooms = [];
          state.messages = {};
          state.activeChat = null;
          state.activeChatType = null;
          state.typingStates = {};
          state.currentUserTyping = {};
          state.isConnected = false;
          state.currentUser = '';
          state.client = null;
        }
      }
    }
  )
);
