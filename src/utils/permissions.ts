
import { Room, RoomAffiliation } from '@/store/xmppStore';

export const canManageRoom = (room: Room, currentUser: string): boolean => {
  if (!room || !currentUser) return false;
  
  console.log('Checking permissions for user:', currentUser, 'in room:', room.name);
  console.log('Room isOwner:', room.isOwner);
  console.log('Room affiliations:', room.affiliations);
  
  // Check if user is the room owner
  if (room.isOwner) return true;
  
  // Check affiliations for admin or owner roles
  if (room.affiliations) {
    const currentUserNickname = currentUser.split('@')[0];
    const userAffiliation = room.affiliations.find(
      aff => aff.jid === currentUser || 
             aff.jid.includes(currentUser) || 
             aff.name === currentUserNickname ||
             aff.jid.startsWith(currentUserNickname)
    );
    
    console.log('Found user affiliation:', userAffiliation);
    
    if (userAffiliation) {
      const canManage = userAffiliation.affiliation === 'owner' || userAffiliation.affiliation === 'admin';
      console.log('Can manage based on affiliation:', canManage);
      return canManage;
    }
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
