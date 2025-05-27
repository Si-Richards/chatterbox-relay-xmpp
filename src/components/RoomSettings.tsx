import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Crown, Shield, User, UserMinus, Lock, Eye, EyeOff, Settings } from 'lucide-react';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';
import { RoomAvatarSelector } from './RoomAvatarSelector';

interface RoomSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomJid: string;
}

export const RoomSettings: React.FC<RoomSettingsProps> = ({
  open,
  onOpenChange,
  roomJid,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAffiliation, setSelectedAffiliation] = useState<'owner' | 'admin' | 'member' | 'none'>('member');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { 
    rooms, 
    deleteRoom, 
    fetchRoomAffiliations, 
    setRoomAffiliation,
    updateRoomSettings
  } = useXMPPStore();

  const room = rooms.find(r => r.jid === roomJid);
  const isOwner = room?.isOwner || false;

  React.useEffect(() => {
    if (open && roomJid && isOwner) {
      fetchRoomAffiliations(roomJid);
    }
  }, [open, roomJid, isOwner, fetchRoomAffiliations]);

  const handleDeleteRoom = () => {
    deleteRoom(roomJid);
    setDeleteDialogOpen(false);
    onOpenChange(false);
    
    toast({
      title: "Room Deleted",
      description: "The room has been permanently deleted",
      variant: "destructive"
    });
  };

  const handleSetAffiliation = () => {
    if (!selectedUser || !selectedAffiliation) return;
    
    setRoomAffiliation(roomJid, selectedUser, selectedAffiliation);
    setSelectedUser('');
    setSelectedAffiliation('member');
    
    toast({
      title: "Affiliation Updated",
      description: `User affiliation has been set to ${selectedAffiliation}`
    });
  };

  const handlePrivacyToggle = (isPrivate: boolean) => {
    const settings = {
      members_only: isPrivate,
      members_by_default: false,
      public_list: !isPrivate,
      public: !isPrivate
    };
    
    updateRoomSettings(roomJid, settings);
    
    toast({
      title: "Privacy Updated",
      description: `Room is now ${isPrivate ? 'private' : 'public'}`
    });
  };

  const handlePasswordUpdate = () => {
    if (!newPassword.trim()) {
      toast({
        title: "Error",
        description: "Please enter a password",
        variant: "destructive"
      });
      return;
    }

    const settings = {
      password_protected: true,
      password: newPassword.trim()
    };
    
    updateRoomSettings(roomJid, settings);
    setNewPassword('');
    
    toast({
      title: "Password Updated",
      description: "Room password has been updated"
    });
  };

  const handleRemovePassword = () => {
    const settings = {
      password_protected: false,
      password: undefined
    };
    
    updateRoomSettings(roomJid, settings);
    
    toast({
      title: "Password Removed",
      description: "Room password protection has been disabled"
    });
  };

  const getAffiliationIcon = (affiliation: string) => {
    switch (affiliation) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'member':
        return <User className="h-4 w-4 text-green-600" />;
      default:
        return <UserMinus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAffiliationBadgeVariant = (affiliation: string) => {
    switch (affiliation) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'member':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (!room) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Room Settings</DialogTitle>
            <DialogDescription>
              Manage settings and permissions for {room.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Room Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Room Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Room Avatar */}
                {isOwner && (
                  <div className="flex items-center space-x-4">
                    <div>
                      <Label className="text-sm font-medium">Room Avatar</Label>
                      <p className="text-xs text-gray-500 mb-2">Click to change the room avatar</p>
                    </div>
                    <RoomAvatarSelector 
                      roomJid={room.jid}
                      currentAvatar={room.avatar}
                      roomName={room.name}
                    />
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-gray-600">{room.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">JID</Label>
                  <p className="text-sm text-gray-600">{room.jid}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-gray-600">{room.description || 'No description'}</p>
                </div>
                <div className="flex space-x-4">
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <p className="text-sm text-gray-600">
                      {room.isPermanent ? 'Permanent Room' : 'Temporary Room'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Privacy</Label>
                    <div className="flex items-center space-x-2">
                      <Badge variant={room.isPrivate ? "destructive" : "secondary"}>
                        {room.isPrivate ? 'Private' : 'Public'}
                      </Badge>
                      {room.hasPassword && (
                        <Badge variant="outline">
                          <Lock className="w-3 h-3 mr-1" />
                          Password Protected
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Privacy & Access</span>
                  </CardTitle>
                  <CardDescription>
                    Control who can access this room and how
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Privacy Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Private Room</Label>
                      <p className="text-xs text-gray-500">
                        Only members can join and the room won't appear in public listings
                      </p>
                    </div>
                    <Checkbox
                      checked={room.isPrivate || false}
                      onCheckedChange={handlePrivacyToggle}
                    />
                  </div>

                  {/* Password Protection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Password Protection</Label>
                        <p className="text-xs text-gray-500">
                          Require a password to join this room
                        </p>
                      </div>
                      {room.hasPassword && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemovePassword}
                        >
                          Remove Password
                        </Button>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder={room.hasPassword ? "Update password" : "Set room password"}
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
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
                      <Button
                        onClick={handlePasswordUpdate}
                        disabled={!newPassword.trim()}
                      >
                        {room.hasPassword ? 'Update' : 'Set Password'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Room Affiliations */}
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Room Affiliations</CardTitle>
                  <CardDescription>
                    Manage user permissions and roles in this room
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add New Affiliation */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Add User Affiliation</Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="user@domain.com"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={selectedAffiliation} onValueChange={(value: any) => setSelectedAffiliation(value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleSetAffiliation} disabled={!selectedUser}>
                        Set
                      </Button>
                    </div>
                  </div>

                  {/* Current Affiliations */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Current Affiliations</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {room.affiliations && room.affiliations.length > 0 ? (
                        room.affiliations.map((affiliation) => (
                          <div
                            key={affiliation.jid}
                            className="flex items-center justify-between p-2 border rounded-md"
                          >
                            <div className="flex items-center space-x-2">
                              {getAffiliationIcon(affiliation.affiliation)}
                              <span className="text-sm font-medium">{affiliation.name}</span>
                              <span className="text-xs text-gray-500">{affiliation.jid}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={getAffiliationBadgeVariant(affiliation.affiliation)}>
                                {affiliation.affiliation}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {affiliation.role}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No affiliations found. Click "Refresh" to load current affiliations.
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fetchRoomAffiliations(roomJid)}
                      className="w-full"
                    >
                      Refresh Affiliations
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone */}
            {isOwner && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-lg text-red-700">Danger Zone</CardTitle>
                  <CardDescription className="text-red-600">
                    Irreversible actions that will permanently affect this room
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Room</span>
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isOwner && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500 text-center">
                    You must be a room owner to access advanced settings.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the room
              "{room.name}" and remove all messages and participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
