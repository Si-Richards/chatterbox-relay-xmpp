
import { useState, useEffect } from 'react';
import { notificationManager, NotificationOptions } from '@/utils/notifications';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(notificationManager.isSupported());
    setPermission(notificationManager.getPermissionStatus());
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    const newPermission = await notificationManager.requestPermission();
    setPermission(newPermission);
    return newPermission;
  };

  const showNotification = async (options: NotificationOptions) => {
    await notificationManager.showNotification(options);
  };

  const isGranted = permission === 'granted';

  return {
    permission,
    isSupported,
    isGranted,
    requestPermission,
    showNotification,
  };
};
