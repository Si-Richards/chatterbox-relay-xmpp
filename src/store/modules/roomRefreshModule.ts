
import { xml } from '@xmpp/client';

export const createRoomRefreshModule = (set: any, get: any) => ({
  refreshRooms: async () => {
    const { client } = get();
    if (!client) return;

    try {
      // Discover rooms on the conference server
      const discoIq = xml(
        'iq',
        { type: 'get', to: 'conference.ejabberd.voicehost.io', id: `refresh-rooms-${Date.now()}` },
        xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' })
      );
      
      client.send(discoIq);
    } catch (error) {
      console.error('Failed to refresh rooms:', error);
    }
  },

  removeDeletedRoomFromList: (roomJid: string) => {
    set((state: any) => ({
      rooms: state.rooms.filter((room: any) => room.jid !== roomJid),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([key]) => key !== roomJid)
      ),
      activeChat: state.activeChat === roomJid ? null : state.activeChat,
      activeChatType: state.activeChat === roomJid ? null : state.activeChatType
    }));
  },

  syncRoomList: (serverRooms: any[]) => {
    const { rooms } = get();
    
    // Remove rooms that no longer exist on server
    const serverRoomJids = new Set(serverRooms.map(room => room.jid));
    const updatedRooms = rooms.filter((room: any) => serverRoomJids.has(room.jid));
    
    // Add new rooms from server
    const existingRoomJids = new Set(updatedRooms.map((room: any) => room.jid));
    const newRooms = serverRooms.filter(room => !existingRoomJids.has(room.jid));
    
    set({ rooms: [...updatedRooms, ...newRooms] });
  },

  startPeriodicRoomRefresh: () => {
    const refreshInterval = setInterval(() => {
      const { refreshRooms } = get();
      refreshRooms();
    }, 60000); // Refresh every minute

    set({ roomRefreshInterval: refreshInterval });
  },

  stopPeriodicRoomRefresh: () => {
    const { roomRefreshInterval } = get();
    if (roomRefreshInterval) {
      clearInterval(roomRefreshInterval);
      set({ roomRefreshInterval: null });
    }
  },
});
