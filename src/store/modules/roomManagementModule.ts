
import { xml } from '@xmpp/client';
import { Room } from '../types';

export const createRoomManagementModule = (set: any, get: any) => ({
  muteRoom: (jid: string) => {
    set((state: any) => ({
      mutedRooms: [...state.mutedRooms.filter((muted: string) => muted !== jid), jid],
      rooms: state.rooms.map((room: Room) => 
        room.jid === jid ? { ...room, isMuted: true } : room
      )
    }));
    console.log(`Room ${jid} has been muted`);
  },

  unmuteRoom: (jid: string) => {
    set((state: any) => ({
      mutedRooms: state.mutedRooms.filter((muted: string) => muted !== jid),
      rooms: state.rooms.map((room: Room) => 
        room.jid === jid ? { ...room, isMuted: false } : room
      )
    }));
    console.log(`Room ${jid} has been unmuted`);
  },

  leaveRoom: (jid: string) => {
    const { client, currentUser } = get();
    
    // Send leave presence to room
    if (client) {
      const nickname = currentUser.split('@')[0];
      const leavePresence = xml('presence', { 
        to: `${jid}/${nickname}`, 
        type: 'unavailable' 
      });
      client.send(leavePresence);
      console.log(`Sent leave presence for room ${jid}`);
    }

    // Remove from local state
    set((state: any) => ({
      rooms: state.rooms.filter((room: Room) => room.jid !== jid),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([chatJid]) => chatJid !== jid)
      ),
      // Also clear from muted list
      mutedRooms: state.mutedRooms.filter((muted: string) => muted !== jid)
    }));
    
    console.log(`Left room ${jid}`);
  }
});
