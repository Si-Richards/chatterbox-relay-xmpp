
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
import { canManageRoom, canDeleteRoom } from '@/utils/permissions';
import { handleXMPPError, retryOperation } from '@/utils/errorHandling';

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
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  
  const { 
    rooms, 
    deleteRoom, 
    fetchRoomAffiliations,
    currentUser,
  } = useXMPPStore();

  const room = rooms.find(r => r.jid === roomJid);
  const isOwner = room?.isOwner || false;
  const canManage = room ? canManageRoom(room, currentUser) : false;
  const canDelete = room ? canDeleteRoom(room, currentUser) : false;

  React.useEffect(() => {
    if (open && roomJid && canManage) {
      console.log('RoomSettings: Loading affiliations for room:', roomJid);
      handleRefreshAffiliations();
    }
  }, [open, roomJid, canManage]);

  const handleRefreshAffiliations = async () => {
    if (!roomJid || !canManage) return;
    
    setIsLoadingAffiliations(true);
    try {
      console.log('RoomSettings: Fetching affiliations for room:', roomJid);
      await retryOperation(async () => {
        await fetchRoomAffiliations(roomJid);
      });
      console.log('RoomSettings: Affiliations fetched successfully');
    } catch (error) {
      handleXMPPError(error, 'Failed to load room permissions');
    } finally {
      setIsLoadingAffiliations(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!canDelete) {
      toast({
        title: "Permission Denied",
        description: "Only room owners can delete rooms",
        variant: "destructive"
      });
      return;
    }

    setIsDeletingRoom(true);
    try {
      await retryOperation(async () => {
        deleteRoom(roomJid);
      });
      
      setDeleteDialogOpen(false);
      onOpenChange(false);
      
      toast({
        title: "Room Deleted",
        description: "The room has been permanently deleted",
        variant: "destructive"
      });
    } catch (error) {
      handleXMPPError(error, 'Failed to delete room');
    } finally {
      setIsDeletingRoom(false);
    }
  };

  if (!room) {
    console.warn('RoomSettings: Room not found for JID:', roomJid);
    return null;
  }

  console.log('RoomSettings: Rendering for room:', room.name, 'Can manage:', canManage, 'Affiliations:', room.affiliations?.length || 0);

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

            {/* Room Permissions - Only show for users who can manage */}
            {canManage && (
              <RoomPermissionsCard
                room={room}
                isLoadingAffiliations={isLoadingAffiliations}
                onRefreshAffiliations={handleRefreshAffiliations}
              />
            )}

            {/* Danger Zone - Show for all users but with different permissions */}
            <DangerZoneCard 
              onDeleteClick={() => setDeleteDialogOpen(true)}
              roomName={room.name}
              canDelete={canDelete}
            />

            {!canManage && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500 text-center">
                    You must be a room owner or admin to access advanced settings and permissions.
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
            <AlertDialogCancel disabled={isDeletingRoom}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              disabled={isDeletingRoom}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingRoom ? "Deleting..." : "Delete Room"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
