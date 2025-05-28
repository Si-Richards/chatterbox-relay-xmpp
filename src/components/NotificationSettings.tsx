
import React from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useXMPPStore } from '@/store/xmppStore';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from '@/hooks/use-toast';

export const NotificationSettings: React.FC = () => {
  const { notificationSettings, updateNotificationSettings } = useXMPPStore();
  const { permission, isSupported, isGranted, requestPermission, showNotification } = useNotifications();

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      updateNotificationSettings({ enabled: true });
      toast({
        title: "Notifications enabled",
        description: "You'll now receive desktop notifications for new messages.",
      });
    } else {
      toast({
        title: "Notifications denied",
        description: "Please enable notifications in your browser settings to receive alerts.",
        variant: "destructive",
      });
    }
  };

  const handleTestNotification = async () => {
    await showNotification({
      title: "Test Notification",
      body: "This is a test notification from your XMPP chat app!",
    });
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support desktop notifications.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Desktop Notifications
        </CardTitle>
        <CardDescription>
          Get notified when you receive new messages while the app is in the background.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isGranted ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Permission status: <span className="capitalize">{permission}</span>
            </p>
            <Button onClick={handleRequestPermission} className="w-full">
              Enable Notifications
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Enable notifications</label>
                <p className="text-xs text-muted-foreground">Show desktop notifications for new messages</p>
              </div>
              <Switch
                checked={notificationSettings.enabled}
                onCheckedChange={(enabled) => updateNotificationSettings({ enabled })}
              />
            </div>

            {notificationSettings.enabled && (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Direct messages</label>
                    <p className="text-xs text-muted-foreground">Notify for direct messages</p>
                  </div>
                  <Switch
                    checked={notificationSettings.showForDirectMessages}
                    onCheckedChange={(showForDirectMessages) => 
                      updateNotificationSettings({ showForDirectMessages })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Group messages</label>
                    <p className="text-xs text-muted-foreground">Notify for group chat messages</p>
                  </div>
                  <Switch
                    checked={notificationSettings.showForGroupMessages}
                    onCheckedChange={(showForGroupMessages) => 
                      updateNotificationSettings({ showForGroupMessages })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Do not disturb</label>
                    <p className="text-xs text-muted-foreground">Temporarily disable all notifications</p>
                  </div>
                  <Switch
                    checked={notificationSettings.doNotDisturb}
                    onCheckedChange={(doNotDisturb) => 
                      updateNotificationSettings({ doNotDisturb })
                    }
                  />
                </div>

                <Button 
                  variant="outline" 
                  onClick={handleTestNotification}
                  className="w-full"
                >
                  Test Notification
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
