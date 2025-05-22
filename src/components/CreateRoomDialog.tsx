
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateRoomDialog: React.FC<CreateRoomDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [roomName, setRoomName] = useState('');
  const { createRoom } = useXMPPStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room name",
        variant: "destructive"
      });
      return;
    }

    const cleanRoomName = roomName.trim().toLowerCase().replace(/\s+/g, '-');
    createRoom(cleanRoomName);
    setRoomName('');
    onOpenChange(false);
    
    toast({
      title: "Room Created",
      description: `Created and joined room: ${cleanRoomName}`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
          <DialogDescription>
            Enter a name for your new group chat room.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">Room Name</Label>
            <Input
              id="room-name"
              placeholder="my-awesome-room"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Room</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
