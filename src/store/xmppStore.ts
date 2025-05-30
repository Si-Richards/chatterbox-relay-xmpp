
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
import { createServerUsersModule } from './modules/serverUsersModule';
import { createContactManagementModule } from './modules/contactManagementModule';
import { createRoomManagementModule } from './modules/roomManagementModule';

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
      blockedContacts: [],
      mutedContacts: [],
      mutedRooms: [],
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
      ...createOMEMOModule(set, get),
      ...createServerUsersModule(set, get),
      ...createContactManagementModule(set, get),
      ...createRoomManagementModule(set, get),

      // Add method to mark messages as read
      markMessagesAsRead: (chatJid: string) => {
        const { client, currentUser } = get();
        
        set((state: any) => {
          const chatMessages = state.messages[chatJid] || [];
          const updatedMessages = chatMessages.map((msg: Message) => {
            // Only mark messages from others as read, and send read receipts
            if (msg.from !== currentUser && 
                !msg.from.includes(currentUser.split('@')[0]) && 
                msg.status !== 'read' && 
                msg.id) {
              
              // Send read receipt
              if (client && msg.type !== 'groupchat') {
                const readReceipt = {
                  type: 'message',
                  attrs: {
                    to: msg.from,
                    from: currentUser,
                    id: `read-${Date.now()}`
                  },
                  children: [
                    {
                      name: 'read',
                      attrs: { xmlns: 'urn:xmpp:receipts', id: msg.id },
                      children: []
                    }
                  ]
                };
                
                console.log('Sending read receipt for message:', msg.id);
                client.send(readReceipt);
              }
              
              return { ...msg, status: 'read' as const };
            }
            return msg;
          });

          return {
            messages: {
              ...state.messages,
              [chatJid]: updatedMessages
            }
          };
        });
      }
    }),
    {
      name: 'xmpp-store',
      partialize: (state) => ({
        // Only persist user preferences and read message status
        userAvatar: state.userAvatar,
        userStatus: state.userStatus,
        contactSortMethod: state.contactSortMethod,
        roomSortMethod: state.roomSortMethod,
        notificationSettings: state.notificationSettings,
        blockedContacts: state.blockedContacts,
        mutedContacts: state.mutedContacts,
        mutedRooms: state.mutedRooms,
        // Persist message read status
        messageReadStatus: Object.keys(state.messages).reduce((acc, chatJid) => {
          acc[chatJid] = (state.messages[chatJid] || []).reduce((msgAcc: any, msg: Message) => {
            if (msg.status === 'read') {
              msgAcc[msg.id] = 'read';
            }
            return msgAcc;
          }, {});
          return acc;
        }, {} as Record<string, Record<string, string>>)
      }),
      onRehydrateStorage: () => (state) => {
        // Clear dynamic data but preserve read status
        if (state) {
          const messageReadStatus = (state as any).messageReadStatus || {};
          
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
          
          // Store read status for later restoration
          (state as any).pendingReadStatus = messageReadStatus;
        }
      }
    }
  )
);
