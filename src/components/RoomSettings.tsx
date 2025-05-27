
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
import { Card, CardContent } from '@/components/ui/card';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';
import { RoomInfoCard } from './RoomInfoCard';
import { RoomPermissionsCard } from './RoomPermissionsCard';
import { DangerZoneCard } from './DangerZoneCard';

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
  const [isLoadingAffiliations, setIsLoadingAffiliations] = useState(false);
  
  const { 
    rooms, 
    deleteRoom, 
    fetchRoomAffiliations,
  } = useXMPPStore();

  const room = rooms.find(r => r.jid === roomJid);
  const isOwner = room?.isOwner || false;

  React.useEffect(() => {
    if (open && roomJid && isOwner) {
      console.log('RoomSettings: Loading affiliations for room:', roomJid);
      handleRefreshAffiliations();
    }
  }, [open, roomJid, isOwner]);

  const handleRefreshAffiliations = async () => {
    if (!roomJid || !isOwner) return;
    
    setIsLoadingAffiliations(true);
    try {
      console.log('RoomSettings: Fetching affiliations for room:', roomJid);
      await fetchRoomAffiliations(roomJid);
      console.log('RoomSettings: Affiliations fetched successfully');
    } catch (error) {
      console.error('RoomSettings: Failed to fetch affiliations:', error);
      toast({
        title: "Error",
        description: "Failed to load room permissions",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAffiliations(false);
    }
  };

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

  if (!room) {
    console.warn('RoomSettings: Room not found for JID:', roomJid);
    return null;
  }

  console.log('RoomSettings: Rendering for room:', room.name, 'Affiliations:', room.affiliations);

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
            <RoomInfoCard room={room} isOwner={isOwner} />

            {/* Room Permissions - Only show for room owners */}
            {isOwner && (
              <RoomPermissionsCard
                room={room}
                isLoadingAffiliations={isLoadingAffiliations}
                onRefreshAffiliations={handleRefreshAffiliations}
              />
            )}

            {/* Danger Zone - Only show for room owners */}
            {isOwner && (
              <DangerZoneCard onDeleteClick={() => setDeleteDialogOpen(true)} />
            )}

            {!isOwner && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500 text-center">
                    You must be a room owner to access advanced settings and permissions.
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
