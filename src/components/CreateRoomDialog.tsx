
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
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';
import { Infinity, Lock, Eye, EyeOff } from 'lucide-react';

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
  const [isPrivate, setIsPrivate] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    if (hasPassword && !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter a password for the room",
        variant: "destructive"
      });
      return;
    }

    const cleanRoomName = roomName.trim().toLowerCase().replace(/\s+/g, '-');
    const roomOptions = {
      isPermanent,
      isPrivate,
      hasPassword,
      password: hasPassword ? password.trim() : undefined
    };
    
    createRoom(cleanRoomName, roomDescription.trim(), roomOptions);
    
    // Reset form
    setRoomName('');
    setRoomDescription('');
    setIsPermanent(false);
    setIsPrivate(false);
    setHasPassword(false);
    setPassword('');
    setShowPassword(false);
    onOpenChange(false);
    
    const privacyText = isPrivate ? 'private' : 'public';
    const permanentText = isPermanent ? 'permanent' : 'temporary';
    const passwordText = hasPassword ? 'password-protected' : '';
    
    toast({
      title: "Room Created",
      description: `Created ${permanentText} ${privacyText} ${passwordText} room: ${cleanRoomName}`.trim()
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
          <DialogDescription>
            Configure your new group chat room with privacy and access settings.
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
            <Label className="text-sm font-medium">Room Settings</Label>
            
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
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="private"
                checked={isPrivate}
                onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
              />
              <Label htmlFor="private" className="flex items-center space-x-1">
                <Lock className="w-4 h-4 text-red-500" />
                <span>Private room (members only)</span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="password"
                checked={hasPassword}
                onCheckedChange={(checked) => setHasPassword(checked as boolean)}
              />
              <Label htmlFor="password" className="flex items-center space-x-1">
                <Lock className="w-4 h-4 text-orange-500" />
                <span>Password protected</span>
              </Label>
            </div>
          </div>

          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="room-password">Room Password</Label>
              <div className="relative">
                <Input
                  id="room-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter room password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500 space-y-1">
            {isPermanent 
              ? <p>• Permanent rooms persist even when empty and can be discovered by other users.</p>
              : <p>• Temporary rooms are automatically destroyed when the last participant leaves.</p>
            }
            {isPrivate && (
              <p>• Private rooms are only accessible to members and won't appear in public listings.</p>
            )}
            {hasPassword && (
              <p>• Password protection requires users to enter the correct password to join.</p>
            )}
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
