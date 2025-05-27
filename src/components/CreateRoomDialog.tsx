
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';
import { Infinity, Lock, Globe } from 'lucide-react';

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateRoomDialog: React.FC<CreateRoomDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [roomType, setRoomType] = useState<'public' | 'private'>('public');
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
    
    // Set privacy options based on room type
    const privacyOptions = roomType === 'private' ? {
      members_only: true,
      members_by_default: false,
      public_list: false,
      public: false
    } : {
      members_only: false,
      members_by_default: true,
      public_list: true,
      public: true
    };

    createRoom(cleanRoomName, roomDescription.trim(), isPermanent, privacyOptions);
    setRoomName('');
    setRoomDescription('');
    setIsPermanent(false);
    setRoomType('public');
    onOpenChange(false);
    
    toast({
      title: "Room Created",
      description: `Created ${isPermanent ? 'permanent' : 'temporary'} ${roomType} room: ${cleanRoomName}`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
          <DialogDescription>
            Enter a name and description for your new group chat room and choose its privacy settings.
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
          
          <div className="space-y-2">
            <Label htmlFor="room-description">Description (optional)</Label>
            <Textarea
              id="room-description"
              placeholder="Describe what this room is about..."
              value={roomDescription}
              onChange={(e) => setRoomDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>Room Privacy</Label>
            <RadioGroup value={roomType} onValueChange={(value: 'public' | 'private') => setRoomType(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="font-medium">Public Room</div>
                    <div className="text-sm text-gray-500">Anyone can join and discover this room</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <Lock className="w-4 h-4 text-orange-500" />
                  <div>
                    <div className="font-medium">Private Room</div>
                    <div className="text-sm text-gray-500">Members only, invite required to join</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="permanent"
              checked={isPermanent}
              onCheckedChange={(checked) => setIsPermanent(checked as boolean)}
            />
            <Label htmlFor="permanent" className="flex items-center space-x-1">
              <Infinity className="w-4 h-4 text-blue-500" />
              <span>Make room permanent</span>
            </Label>
          </div>
          
          <div className="text-xs text-gray-500">
            {isPermanent 
              ? "Permanent rooms persist even when empty and can be discovered by other users."
              : "Temporary rooms are automatically destroyed when the last participant leaves."
            }
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
