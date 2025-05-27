
import React, { useState, useEffect } from 'react';
import { useXMPPStore } from '@/store/xmppStore';
import { AvatarSelector } from './AvatarSelector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Plus, Search, Hash, User, Infinity, Trash2, UserPlus, ChevronDown, ChevronRight, Users, ArrowUpDown, Clock, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from '@/hooks/use-toast';
import { UserBrowser } from './UserBrowser';
import { CreateRoomDialog } from './CreateRoomDialog';

export const Sidebar = () => {
  const { 
    currentUser, 
    contacts, 
    rooms, 
    messages,
    activeChat,
    contactSortMethod,
    roomSortMethod,
    disconnect, 
    addContact, 
    createRoom, 
    deleteRoom,
    joinRoom,
    setActiveChat, 
    userStatus, 
    setUserStatus,
    setContactSortMethod,
    setRoomSortMethod
  } = useXMPPStore();
  
  const [newContactJid, setNewContactJid] = useState('');
  const [roomJidToJoin, setRoomJidToJoin] = useState('');
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserBrowserOpen, setIsUserBrowserOpen] = useState(false);
  const [contactsCollapsed, setContactsCollapsed] = useState(false);
  const [roomsCollapsed, setRoomsCollapsed] = useState(false);

  // Function to get last message timestamp for a chat
  const getLastMessageTime = (chatJid: string) => {
    const chatMessages = messages[chatJid] || [];
    if (chatMessages.length === 0) return new Date(0);
    return new Date(chatMessages[chatMessages.length - 1].timestamp);
  };

  // Sort contacts based on selected method
  const getSortedContacts = () => {
    let filtered = contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (contactSortMethod === 'newest') {
      return filtered.sort((a, b) => 
        getLastMessageTime(b.jid).getTime() - getLastMessageTime(a.jid).getTime()
      );
    } else {
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
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

  const filteredContacts = getSortedContacts();
  const filteredRooms = getSortedRooms();

  const getPresenceColor = (presence: string) => {
    switch (presence) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      case 'xa': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  const getPresenceText = (contact: any) => {
    if (contact.presence === 'online') {
      return 'Online';
    } else if (contact.lastSeen) {
      const lastSeenDate = new Date(contact.lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - lastSeenDate.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return lastSeenDate.toLocaleDateString();
      }
    } else {
      return contact.presence ? contact.presence.charAt(0).toUpperCase() + contact.presence.slice(1) : 'Offline';
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

  const handleAddContact = () => {
    if (!newContactJid.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid JID",
        variant: "destructive"
      });
      return;
    }
    addContact(newContactJid.trim());
    setNewContactJid('');
    setIsAddContactOpen(false);
  };

  const handleJoinRoom = () => {
    if (!roomJidToJoin.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room JID",
        variant: "destructive"
      });
      return;
    }
    // Call joinRoom with roomJid and nickname (required parameters)
    const nickname = currentUser.split('@')[0]; // Use username part as nickname
    joinRoom(roomJidToJoin.trim(), nickname);
    setRoomJidToJoin('');
    setIsJoinRoomOpen(false);
  };

  const handleDeleteRoom = (roomJid: string, roomName: string) => {
    toast({
      title: "Room Deleted",
      description: `Deleted room: ${roomName}`
    });
    deleteRoom(roomJid);
  };

  const handleInviteToRoom = (roomJid: string, roomName: string) => {
    toast({
      title: "Invite Users",
      description: `Feature coming soon for room: ${roomName}`
    });
  };

  const handleChatClick = (chatJid: string, type: 'chat' | 'groupchat') => {
    setActiveChat(chatJid, type);
    
    // Show toast for new message click
    const senderName = type === 'chat' 
      ? contacts.find(c => c.jid === chatJid)?.name || chatJid.split('@')[0]
      : rooms.find(r => r.jid === chatJid)?.name || chatJid.split('@')[0];
    
    toast({
      title: "Opening Chat",
      description: `Opening conversation with ${senderName}`,
      duration: 2000
    });
  };

  return (
    <div className="w-80 flex-shrink-0 border-r bg-gray-50 border-gray-200 flex flex-col">
      {/* User Info Section */}
      <div className="flex items-center p-4 border-b">
        <AvatarSelector />
        <div className="ml-3">
          <p className="text-sm font-medium">{currentUser.split('@')[0]}</p>
          <select 
            value={userStatus} 
            onChange={(e) => setUserStatus(e.target.value as any)}
            className="text-xs text-gray-500 bg-transparent"
          >
            <option value="online">Online</option>
            <option value="away">Away</option>
            <option value="dnd">Do Not Disturb</option>
            <option value="xa">Extended Away</option>
          </select>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={disconnect}
          className="ml-auto"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Action Buttons Row */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddContactOpen(true)}
            className="flex-1"
            title="Add Contact"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUserBrowserOpen(true)}
            className="flex-1"
            title="Browse Users"
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateRoomOpen(true)}
            className="flex-1"
            title="Create Room"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsJoinRoomOpen(true)}
            className="flex-1"
            title="Join Room"
          >
            <Hash className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <Input
          type="text"
          placeholder="Search or start new chat"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Contacts */}
          <Collapsible open={!contactsCollapsed} onOpenChange={(open) => setContactsCollapsed(!open)}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center text-xs font-medium text-gray-500 px-2 py-1 hover:bg-gray-100 rounded">
                {contactsCollapsed ? <ChevronRight className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                Contacts ({filteredContacts.length})
              </CollapsibleTrigger>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setContactSortMethod('newest')}>
                    <Clock className="h-4 w-4 mr-2" />
                    Sort by Recent
                    {contactSortMethod === 'newest' && ' ✓'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setContactSortMethod('alphabetical')}>
                    <Type className="h-4 w-4 mr-2" />
                    Sort Alphabetically
                    {contactSortMethod === 'alphabetical' && ' ✓'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CollapsibleContent>
              <div className="space-y-1 mt-1">
                {filteredContacts.map((contact) => {
                  const unreadCount = getUnreadCount(contact.jid);
                  const isActive = activeChat === contact.jid;
                  
                  return (
                    <Card
                      key={contact.jid}
                      className={`bg-transparent shadow-none hover:bg-gray-100 transition-colors rounded-md cursor-pointer ${
                        isActive ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => handleChatClick(contact.jid, 'chat')}
                    >
                      <CardContent className="p-3 flex items-center space-x-2">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={contact.avatar} alt={contact.name} />
                            <AvatarFallback className="bg-gray-100 text-gray-600">
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white ${getPresenceColor(contact.presence)}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{contact.name}</p>
                          <p className="text-xs text-gray-500 truncate">{getPresenceText(contact)}</p>
                        </div>
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1.5 flex-shrink-0">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Rooms */}
          <Collapsible open={!roomsCollapsed} onOpenChange={(open) => setRoomsCollapsed(!open)}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center text-xs font-medium text-gray-500 px-2 py-1 hover:bg-gray-100 rounded">
                {roomsCollapsed ? <ChevronRight className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
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
                    <Card
                      key={room.jid}
                      className={`bg-transparent shadow-none hover:bg-gray-100 transition-colors rounded-md cursor-pointer ${
                        isActive ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => handleChatClick(room.jid, 'groupchat')}
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
                          <p className="text-sm font-medium truncate">{room.name}</p>
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
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Add Contact Dialog */}
      <AlertDialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add New Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the JID of the contact you want to add.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="jid">JID</Label>
            <Input
              id="jid"
              value={newContactJid}
              onChange={(e) => setNewContactJid(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsAddContactOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddContact}>Add Contact</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Browser Dialog */}
      <AlertDialog open={isUserBrowserOpen} onOpenChange={setIsUserBrowserOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Browse Server Users</AlertDialogTitle>
            <AlertDialogDescription>
              Find and add users from the XMPP server to your contacts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <UserBrowser />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsUserBrowserOpen(false)}>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Room Dialog */}
      <CreateRoomDialog 
        open={isCreateRoomOpen} 
        onOpenChange={setIsCreateRoomOpen}
      />

      {/* Join Room Dialog */}
      <AlertDialog open={isJoinRoomOpen} onOpenChange={setIsJoinRoomOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Join Room</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the JID of the room you want to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="roomJid">Room JID</Label>
            <Input
              id="roomJid"
              value={roomJidToJoin}
              onChange={(e) => setRoomJidToJoin(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsJoinRoomOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleJoinRoom}>Join Room</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
