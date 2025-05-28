import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RoomAvatarSelector } from './RoomAvatarSelector';
interface Room {
  jid: string;
  name: string;
  description?: string;
  isPermanent?: boolean;
  avatar?: string;
}
interface RoomInfoCardProps {
  room: Room;
  isOwner: boolean;
}
export const RoomInfoCard: React.FC<RoomInfoCardProps> = ({
  room,
  isOwner
}) => {
  return <Card>
      <CardHeader>
        <CardTitle className="text-lg">Room Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Room Avatar */}
        {isOwner && <div className="flex items-center space-x-4">
            <div>
              <Label className="text-sm font-medium">Room Avatar</Label>
              <p className="text-xs text-gray-500 mb-2">Click to change the room avatar</p>
            </div>
            <RoomAvatarSelector roomJid={room.jid} currentAvatar={room.avatar} roomName={room.name} />
          </div>}

        <div>
          <Label className="text-sm font-medium">Name</Label>
          <p className="text-sm text-gray-600">{room.name}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">ID</Label>
          <p className="text-sm text-gray-600">{room.jid}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Description</Label>
          <p className="text-sm text-gray-600">{room.description || 'No description'}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Type</Label>
          <p className="text-sm text-gray-600">
            {room.isPermanent ? 'Permanent Room' : 'Temporary Room'}
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium">Your Role</Label>
          <p className="text-sm text-gray-600">
            {isOwner ? 'Owner' : 'Member'}
          </p>
        </div>
      </CardContent>
    </Card>;
};