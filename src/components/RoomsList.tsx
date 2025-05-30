
import React from 'react';
import { useXMPPStore } from '@/store/xmppStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChevronDown, ChevronRight, Hash, Infinity, UserPlus, Trash2, ArrowUpDown, Clock, Type, Bell, BellOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface RoomsListProps {
  searchQuery: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onChatClick: (chatJid: string, type: 'chat' | 'groupchat') => void;
}

export const RoomsList: React.FC<RoomsListProps> = ({
  searchQuery,
  isCollapsed,
  onToggleCollapse,
  onChatClick
}) => {
  const { 
    rooms, 
    messages, 
    activeChat, 
    currentUser,
    roomSortMethod,
    setRoomSortMethod,
    deleteRoom,
    muteRoom,
    unmuteRoom,
    leaveRoom
  } = useXMPPStore();

  // Function to get last message timestamp for a chat
  const getLastMessageTime = (chatJid: string) => {
    const chatMessages = messages[chatJid] || [];
    if (chatMessages.length === 0) return new Date(0);
    return new Date(chatMessages[chatMessages.length - 1].timestamp);
  };

  // Sort rooms based on selected method
  const getSortedRooms = () => {
    let filtered = rooms.filter(room =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (roomSortMethod === 'newest') {
      return filtered.sort((a, b) => 
        getLastMessageTime(b.jid).getTime() - getLastMessageTime(a.jid).getTime()
      );
    } else {
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
  };

  // Function to count unread messages for a chat
  const getUnreadCount = (chatJid: string) => {
    const chatMessages = messages[chatJid] || [];
    return chatMessages.filter(msg => 
      msg.from !== currentUser && 
      !msg.from.includes(currentUser.split('@')[0]) &&
      (!msg.status || msg.status !== 'read')
    ).length;
  };

  const handleDeleteRoom = (roomJid: string, roomName: string) => {
    toast({
      title: "Room Deleted",
      description: `Deleted room: ${roomName}`
    });
    deleteRoom(roomJid);
  };

  const handleLeaveRoom = (roomJid: string, roomName: string) => {
    toast({
      title: "Left Room",
      description: `Left room: ${roomName}`
    });
    leaveRoom(roomJid);
  };

  const handleMuteRoom = (room: any) => {
    if (room.isMuted) {
      unmuteRoom(room.jid);
      toast({
        title: "Room Unmuted",
        description: `${room.name} has been unmuted`
      });
    } else {
      muteRoom(room.jid);
      toast({
        title: "Room Muted",
        description: `${room.name} has been muted`
      });
    }
  };

  const handleInviteToRoom = (roomJid: string, roomName: string) => {
    toast({
      title: "Invite Users",
      description: `Feature coming soon for room: ${roomName}`
    });
  };

  const filteredRooms = getSortedRooms();

  return (
    <Collapsible open={!isCollapsed} onOpenChange={onToggleCollapse}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="flex items-center text-xs font-medium text-gray-500 px-2 py-1 hover:bg-gray-100 rounded">
          {isCollapsed ? <ChevronRight className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
          Rooms ({filteredRooms.length})
        </CollapsibleTrigger>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRoomSortMethod('newest')}>
              <Clock className="h-4 w-4 mr-2" />
              Sort by Recent
              {roomSortMethod === 'newest' && ' ✓'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoomSortMethod('alphabetical')}>
              <Type className="h-4 w-4 mr-2" />
              Sort Alphabetically
              {roomSortMethod === 'alphabetical' && ' ✓'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CollapsibleContent>
        <div className="space-y-1 mt-1">
          {filteredRooms.map((room) => {
            const unreadCount = getUnreadCount(room.jid);
            const isActive = activeChat === room.jid;
            
            return (
              <ContextMenu key={room.jid}>
                <ContextMenuTrigger>
                  <Card
                    className={`bg-transparent shadow-none hover:bg-gray-100 transition-colors rounded-md cursor-pointer ${
                      isActive ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => onChatClick(room.jid, 'groupchat')}
                  >
                    <CardContent className="p-3 flex items-center space-x-2">
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={room.avatar} alt={room.name} />
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            <Hash className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        {room.isPermanent && <Infinity className="w-3 h-3 text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1">
                          <p className="text-sm font-medium truncate">{room.name}</p>
                          {room.isMuted && <BellOff className="w-3 h-3 text-gray-400" />}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{room.participants.length} participants</p>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1.5 mr-1">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInviteToRoom(room.jid, room.name);
                          }}
                          className="h-6 w-6 p-0 hover:bg-blue-100"
                        >
                          <UserPlus className="h-3 w-3 text-blue-500" />
                        </Button>
                        {room.isOwner && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                className="h-6 w-6 p-0 hover:bg-red-100"
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Room</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{room.name}"? This action cannot be undone.
                                  {room.isPermanent && " This is a permanent room and will be completely removed from the server."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteRoom(room.jid, room.name)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Room
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => handleMuteRoom(room)}>
                    {room.isMuted ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
                    {room.isMuted ? 'Unmute' : 'Mute'} Room
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <ContextMenuItem onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        {room.isOwner ? 'Delete Room' : 'Leave Room'}
                      </ContextMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{room.isOwner ? 'Delete Room' : 'Leave Room'}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {room.isOwner 
                            ? `Are you sure you want to delete "${room.name}"? This action cannot be undone.`
                            : `Are you sure you want to leave "${room.name}"? You can rejoin later if the room is public.`
                          }
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => room.isOwner ? handleDeleteRoom(room.jid, room.name) : handleLeaveRoom(room.jid, room.name)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {room.isOwner ? 'Delete Room' : 'Leave Room'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
