
import React, { useState, useEffect } from 'react';
import { useXMPPStore } from '@/store/xmppStore';
import { AvatarSelector } from './AvatarSelector';
import { LogOut, Plus, Search, Hash, User, Infinity, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from "@/components/ui/scroll-area"
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { toast } from '@/hooks/use-toast';
import { UserBrowser } from './UserBrowser';
import { CreateRoomDialog } from './CreateRoomDialog';

export const Sidebar = () => {
  const { 
    currentUser, 
    contacts, 
    rooms, 
    disconnect, 
    addContact, 
    createRoom, 
    deleteRoom,
    joinRoom,
    setActiveChat, 
    userStatus, 
    setUserStatus 
  } = useXMPPStore();
  const [newContactJid, setNewContactJid] = useState('');
  const [roomJidToJoin, setRoomJidToJoin] = useState('');
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = React.useState(false)
  const [isUserBrowserOpen, setIsUserBrowserOpen] = useState(false);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPresenceColor = (presence: string) => {
    switch (presence) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      case 'xa': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
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
    joinRoom(roomJidToJoin.trim());
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

      {/* Search Bar */}
      <div className="p-3">
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
          <div>
            <div className="text-xs font-medium text-gray-500 px-2">Contacts</div>
            {filteredContacts.map((contact) => (
              <Card
                key={contact.jid}
                className="bg-transparent shadow-none hover:bg-gray-100 transition-colors rounded-md"
                onClick={() => setActiveChat(contact.jid, 'chat')}
              >
                <CardContent className="p-3 flex items-center space-x-2">
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500" />
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white ${getPresenceColor(contact.presence)}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{contact.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{contact.presence}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Rooms */}
          <div>
            <div className="text-xs font-medium text-gray-500 px-2">Rooms</div>
            {filteredRooms.map((room) => (
              <Card
                key={room.jid}
                className="bg-transparent shadow-none hover:bg-gray-100 transition-colors rounded-md"
                onClick={() => setActiveChat(room.jid, 'groupchat')}
              >
                <CardContent className="p-3 flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Hash className="w-4 h-4 text-gray-500" />
                    {room.isPermanent && <Infinity className="w-3 h-3 text-blue-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{room.name}</p>
                    <p className="text-xs text-gray-500">{room.participants.length} participants</p>
                  </div>
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Add New Chat Button */}
      <div className="p-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start pl-3 font-normal">
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandList>
                <CommandGroup>
                  <CommandItem onSelect={() => {
                      setOpen(false)
                      setIsAddContactOpen(true)
                    }}>
                    Add Contact
                  </CommandItem>
                  <CommandItem onSelect={() => {
                      setOpen(false)
                      setIsUserBrowserOpen(true)
                    }}>
                    Browse Users
                  </CommandItem>
                  <CommandItem onSelect={() => {
                      setOpen(false)
                      setIsCreateRoomOpen(true)
                    }}>
                    Create Room
                  </CommandItem>
                  <CommandItem onSelect={() => {
                      setOpen(false)
                      setIsJoinRoomOpen(true)
                    }}>
                    Join Room
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

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
