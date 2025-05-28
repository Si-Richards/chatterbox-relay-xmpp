
export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

export class NotificationManager {
  private static instance: NotificationManager;
  private permission: NotificationPermission = 'default';

  private constructor() {
    this.permission = Notification.permission;
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission;
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }

  isGranted(): boolean {
    return this.permission === 'granted';
  }

  async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Notifications not supported');
      return;
    }

    if (!this.isGranted()) {
      console.warn('Notification permission not granted');
      return;
    }

    // Don't show notification if page is visible
    if (!document.hidden) {
      return;
    }

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      tag: options.tag,
      requireInteraction: false,
    });

    if (options.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }
}

export const notificationManager = NotificationManager.getInstance();
