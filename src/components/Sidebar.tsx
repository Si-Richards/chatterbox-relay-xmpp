
import React, { useState } from 'react';
import { useXMPPStore } from '@/store/xmppStore';
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from '@/hooks/use-toast';
import { UserBrowser } from './UserBrowser';
import { CreateRoomDialog } from './CreateRoomDialog';
import { UserInfoSection } from './UserInfoSection';
import { ActionButtonsRow } from './ActionButtonsRow';
import { SearchBar } from './SearchBar';
import { ContactsList } from './ContactsList';
import { RoomsList } from './RoomsList';

export const Sidebar = () => {
  const { addContact, joinRoom, setActiveChat } = useXMPPStore();
  
  const [newContactJid, setNewContactJid] = useState('');
  const [roomJidToJoin, setRoomJidToJoin] = useState('');
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserBrowserOpen, setIsUserBrowserOpen] = useState(false);
  const [contactsCollapsed, setContactsCollapsed] = useState(false);
  const [roomsCollapsed, setRoomsCollapsed] = useState(false);

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

  const handleChatClick = (chatJid: string, type: 'chat' | 'groupchat') => {
    setActiveChat(chatJid, type);
    
    toast({
      title: "Opening Chat",
      description: `Opening conversation`,
      duration: 2000
    });
  };

  return (
    <div className="w-80 flex-shrink-0 border-r bg-gray-50 border-gray-200 flex flex-col">
      <UserInfoSection />

      <ActionButtonsRow
        onAddContact={() => setIsAddContactOpen(true)}
        onBrowseUsers={() => setIsUserBrowserOpen(true)}
        onCreateRoom={() => setIsCreateRoomOpen(true)}
        onJoinRoom={() => setIsJoinRoomOpen(true)}
      />

      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          <ContactsList
            searchQuery={searchQuery}
            isCollapsed={contactsCollapsed}
            onToggleCollapse={() => setContactsCollapsed(!contactsCollapsed)}
            onChatClick={handleChatClick}
          />

          <RoomsList
            searchQuery={searchQuery}
            isCollapsed={roomsCollapsed}
            onToggleCollapse={() => setRoomsCollapsed(!roomsCollapsed)}
            onChatClick={handleChatClick}
          />
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
