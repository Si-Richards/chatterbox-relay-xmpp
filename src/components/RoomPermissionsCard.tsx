
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Room } from '@/store/xmppStore';
import { AffiliationForm } from './room-permissions/AffiliationForm';
import { AffiliationsList } from './room-permissions/AffiliationsList';

interface RoomPermissionsCardProps {
  room: Room;
  isLoadingAffiliations: boolean;
  onRefreshAffiliations: () => void;
}

export const RoomPermissionsCard: React.FC<RoomPermissionsCardProps> = ({
  room,
  isLoadingAffiliations,
  onRefreshAffiliations,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Room Permissions</CardTitle>
        <CardDescription>
          Manage user permissions and roles in this room
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AffiliationForm 
          room={room} 
          onRefreshAffiliations={onRefreshAffiliations} 
        />
        <AffiliationsList 
          room={room} 
          isLoadingAffiliations={isLoadingAffiliations} 
          onRefreshAffiliations={onRefreshAffiliations} 
        />
      </CardContent>
    </Card>
  );
};
