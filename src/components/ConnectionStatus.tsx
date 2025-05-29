
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';

export const ConnectionStatus = () => {
  const { 
    isConnected, 
    connectionHealth, 
    manualReconnect,
    refreshRooms
  } = useXMPPStore();

  const handleReconnect = () => {
    manualReconnect();
    toast({
      title: "Reconnecting",
      description: "Please log in again to reconnect",
    });
  };

  const handleRefreshRooms = () => {
    refreshRooms();
    toast({
      title: "Refreshing",
      description: "Updating room list from server",
    });
  };

  if (!isConnected) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-red-50 border-b border-red-200">
        <WifiOff className="h-4 w-4 text-red-600" />
        <Badge variant="destructive" className="text-xs">
          Disconnected
        </Badge>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleReconnect}
          className="ml-auto"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Reconnect
        </Button>
      </div>
    );
  }

  if (!connectionHealth?.isHealthy) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-50 border-b border-yellow-200">
        <Wifi className="h-4 w-4 text-yellow-600" />
        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
          Connection Issues
        </Badge>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleRefreshRooms}
          className="ml-auto"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 border-b border-green-200">
      <Wifi className="h-4 w-4 text-green-600" />
      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
        Connected
      </Badge>
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={handleRefreshRooms}
        className="ml-auto text-green-600 hover:bg-green-100"
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Refresh
      </Button>
    </div>
  );
};
