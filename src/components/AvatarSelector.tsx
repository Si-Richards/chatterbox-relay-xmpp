
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound, Upload, Camera } from 'lucide-react';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';

export const AvatarSelector = () => {
  const { userAvatar, setUserAvatar } = useXMPPStore();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const handleAvatarChange = () => {
    if (!avatarUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid avatar URL",
        variant: "destructive"
      });
      return;
    }
    
    setUserAvatar(avatarUrl);
    toast({
      title: "Avatar Updated",
      description: "Your avatar has been updated successfully"
    });
    setIsOpen(false);
  };

  const defaultAvatars = [
    'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9',
    'https://images.unsplash.com/photo-1582562124811-c09040d0a901',
    'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1',
    'https://images.unsplash.com/photo-1501286353178-1ec881214838'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer">
          <Avatar className="h-10 w-10">
            <AvatarImage src={userAvatar || undefined} alt="Avatar" />
            <AvatarFallback>
              <UserRound className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Your Avatar</DialogTitle>
          <DialogDescription>
            Choose one of our preset avatars or enter a custom image URL
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-4 gap-4 py-4">
          {defaultAvatars.map((avatar, index) => (
            <div 
              key={index} 
              className={`cursor-pointer rounded-lg p-1 ${avatarUrl === avatar ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setAvatarUrl(avatar)}
            >
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatar} alt={`Avatar option ${index + 1}`} />
                <AvatarFallback>
                  <UserRound className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
            </div>
          ))}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Input
              type="text"
              placeholder="Or paste a custom image URL"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="h-10"
            />
          </div>
          <Button size="sm" variant="outline" className="px-3">
            <Camera className="h-4 w-4" />
          </Button>
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button 
            type="button" 
            onClick={handleAvatarChange}
            disabled={!avatarUrl.trim()}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Set Avatar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
