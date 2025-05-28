
import { NotificationSettings } from '../types';
import { notificationManager } from '@/utils/notifications';

export const createNotificationModule = (set: any, get: any) => ({
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => {
    set((state: any) => ({
      notificationSettings: {
        ...state.notificationSettings,
        ...settings
      }
    }));
  },

  showMessageNotification: (from: string, body: string, type: 'chat' | 'groupchat') => {
    const { notificationSettings, activeChat, contacts, rooms, currentUser } = get();
    
    // Don't show notifications if disabled or in do not disturb mode
    if (!notificationSettings.enabled || notificationSettings.doNotDisturb) {
      return;
    }

    // Don't show notifications for own messages
    const currentUserBareJid = currentUser.split('/')[0];
    const senderBareJid = from.split('/')[0];
    if (senderBareJid === currentUserBareJid) {
      return;
    }

    // Check if notifications are enabled for this message type
    if (type === 'chat' && !notificationSettings.showForDirectMessages) {
      return;
    }
    if (type === 'groupchat' && !notificationSettings.showForGroupMessages) {
      return;
    }

    // Don't show notification if user is actively viewing this chat
    const chatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
    if (activeChat === chatJid && !document.hidden) {
      return;
    }

    // Get sender name
    let senderName = from.split('@')[0];
    if (type === 'groupchat') {
      // For group chats, extract nickname
      const nickname = from.split('/')[1];
      if (nickname) {
        senderName = nickname;
      }
      const room = rooms.find((r: any) => r.jid === from.split('/')[0]);
      if (room) {
        senderName = `${nickname} in ${room.name}`;
      }
    } else {
      // For direct chats, use contact name if available
      const contact = contacts.find((c: any) => c.jid === from.split('/')[0]);
      if (contact) {
        senderName = contact.name;
      }
    }

    // Truncate long messages
    const truncatedBody = body.length > 100 ? body.substring(0, 100) + '...' : body;

    notificationManager.showNotification({
      title: senderName,
      body: truncatedBody,
      tag: chatJid,
      onClick: () => {
        // Focus the specific chat when notification is clicked
        get().setActiveChat(chatJid, type);
      }
    });
  }
});
