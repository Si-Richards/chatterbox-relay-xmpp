
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Camera, Hash, Upload } from 'lucide-react';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';

interface RoomAvatarSelectorProps {
  roomJid: string;
  currentAvatar?: string;
  roomName: string;
}

export const RoomAvatarSelector: React.FC<RoomAvatarSelectorProps> = ({
  roomJid,
  currentAvatar,
  roomName
}) => {
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const { setRoomAvatar } = useXMPPStore();

  const predefinedAvatars = [
    'https://api.dicebear.com/7.x/initials/svg?seed=Room1&backgroundColor=3b82f6',
    'https://api.dicebear.com/7.x/initials/svg?seed=Room2&backgroundColor=ef4444',
    'https://api.dicebear.com/7.x/initials/svg?seed=Room3&backgroundColor=10b981',
    'https://api.dicebear.com/7.x/initials/svg?seed=Room4&backgroundColor=f59e0b',
    'https://api.dicebear.com/7.x/initials/svg?seed=Room5&backgroundColor=8b5cf6',
    'https://api.dicebear.com/7.x/initials/svg?seed=Room6&backgroundColor=ec4899'
  ];

  const handleSetAvatar = (url: string) => {
    setRoomAvatar(roomJid, url);
    setOpen(false);
    toast({
      title: "Room Avatar Updated",
      description: "The room avatar has been successfully updated."
    });
  };

  const handleCustomAvatar = () => {
    if (avatarUrl.trim()) {
      handleSetAvatar(avatarUrl.trim());
      setAvatarUrl('');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          handleSetAvatar(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="relative p-0 h-auto">
          <Avatar className="h-12 w-12">
            <AvatarImage src={currentAvatar} alt={roomName} />
            <AvatarFallback className="bg-blue-100 text-blue-600">
              <Hash className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
            <Camera className="h-3 w-3 text-gray-600" />
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Room Avatar</DialogTitle>
          <DialogDescription>
            Select a new avatar for {roomName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Avatar */}
          <div className="flex justify-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={currentAvatar} alt={roomName} />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                <Hash className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Predefined Avatars */}
          <div>
            <Label className="text-sm font-medium">Choose from preset avatars</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {predefinedAvatars.map((avatar, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="p-2 h-auto"
                  onClick={() => handleSetAvatar(avatar)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={avatar} alt={`Preset ${index + 1}`} />
                    <AvatarFallback>
                      <Hash className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom URL */}
          <div className="space-y-2">
            <Label htmlFor="avatar-url" className="text-sm font-medium">
              Or enter a custom URL
            </Label>
            <div className="flex space-x-2">
              <Input
                id="avatar-url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
              <Button onClick={handleCustomAvatar} disabled={!avatarUrl.trim()}>
                Set
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Upload an image</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="avatar-file"
              />
              <Button asChild variant="outline" className="w-full">
                <label htmlFor="avatar-file" className="cursor-pointer flex items-center justify-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>Choose File</span>
                </label>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
