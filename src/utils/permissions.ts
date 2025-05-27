
import { Room, RoomAffiliation } from '@/store/xmppStore';

export const canManageRoom = (room: Room, currentUser: string): boolean => {
  if (!room || !currentUser) return false;
  
  // Check if user is the room owner
  if (room.isOwner) return true;
  
  // Check affiliations for admin or owner roles
  if (room.affiliations) {
    const userAffiliation = room.affiliations.find(
      aff => aff.jid === currentUser || aff.jid.startsWith(currentUser.split('@')[0])
    );
    
    return userAffiliation?.affiliation === 'owner' || userAffiliation?.affiliation === 'admin';
  }
  
  return false;
};

export const canSetAffiliation = (
  room: Room, 
  currentUser: string, 
  targetAffiliation: string
): boolean => {
  if (!canManageRoom(room, currentUser)) return false;
  
  // Only owners can set other owners
  if (targetAffiliation === 'owner') {
    return room.isOwner;
  }
  
  return true;
};

export const canDeleteRoom = (room: Room, currentUser: string): boolean => {
  if (!room || !currentUser) return false;
  
  // Only room owners can delete rooms
  return room.isOwner;
};
