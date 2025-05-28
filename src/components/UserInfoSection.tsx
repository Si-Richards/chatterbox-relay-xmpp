
import React from 'react';
import { useXMPPStore } from '@/store/xmppStore';
import { AvatarSelector } from './AvatarSelector';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export const UserInfoSection = () => {
  const { currentUser, userStatus, setUserStatus, disconnect } = useXMPPStore();

  return (
    <div className="flex items-center p-4 border-b">
      <AvatarSelector />
      <div className="ml-3">
        <p className="text-sm font-medium">{currentUser.split('@')[0]}</p>
        <select 
          value={userStatus} 
          onChange={(e) => setUserStatus(e.target.value as any)}
          className="text-xs text-gray-500 bg-transparent"
        >
          <option value="online">Online</option>
          <option value="away">Away</option>
          <option value="dnd">Do Not Disturb</option>
          <option value="xa">Extended Away</option>
        </select>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={disconnect}
        className="ml-auto"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
};
