
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  MessageSquare, 
  Users, 
  UserPlus, 
  Plus, 
  LogOut,
  Hash,
  User,
  Circle,
  UserMinus,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useXMPPStore } from '@/store/xmppStore';
import { AddContactDialog } from '@/components/AddContactDialog';
import { CreateRoomDialog } from '@/components/CreateRoomDialog';

// New component for adding participants to a room
const AddRoomParticipantDialog = ({ 
  open, 
  onOpenChange, 
  roomJid 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  roomJid: string;
}) => {
  const [userJid, setUserJid] = useState('');
  const { inviteToRoom, contacts } = useXMPPStore();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userJid.trim()) return;
    
    // Add domain if not provided
    const fullJid = userJid.includes('@') ? userJid : `${userJid}@ejabberd.voicehost.io`;
    inviteToRoom(roomJid, fullJid);
    setUserJid('');
    onOpenChange(false);
  };
  
  return (
    <dialog open={open} className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Invite to Room</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">User JID</label>
            <Input
              value={userJid}
              onChange={(e) => setUserJid(e.target.value)}
              placeholder="username or username@ejabberd.voicehost.io"
              required
            />
          </div>
          
          {contacts.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-1">Your contacts:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {contacts.map(contact => (
                  <button
                    type="button"
                    key={contact.jid}
                    onClick={() => setUserJid(contact.jid)}
                    className="px-2 py-1 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
                  >
                    {contact.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Invite</Button>
          </div>
        </form>
      </div>
    </dialog>
  );
};

export const Sidebar = () => {
  const { 
    currentUser, 
    contacts, 
    rooms, 
    activeChat, 
    activeChatType,
    userStatus,
    setActiveChat, 
    disconnect,
    setUserStatus,
    kickFromRoom
  } = useXMPPStore();
  
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedRoomJid, setSelectedRoomJid] = useState('');

  const getPresenceColor = (presence: string) => {
    switch (presence) {
      case 'online': return 'text-green-500';
      case 'away': return 'text-yellow-500';
      case 'dnd': return 'text-red-500';
      case 'xa': return 'text-orange-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'dnd': return 'Do Not Disturb';
      case 'xa': return 'Extended Away';
      default: return 'Offline';
    }
  };
  
  const handleRoomKickUser = (roomJid: string, userJid: string) => {
    kickFromRoom(roomJid, userJid);
  };

  return (
    <>
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">XMPP Chat</h2>
                <p className="text-sm text-gray-500 truncate">{currentUser}</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-500">
                    <Circle className={`w-4 h-4 fill-current ${getPresenceColor(userStatus)}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setUserStatus('online')}>
                    <Circle className="w-3 h-3 fill-current text-green-500 mr-2" />
                    Online
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setUserStatus('away')}>
                    <Circle className="w-3 h-3 fill-current text-yellow-500 mr-2" />
                    Away
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setUserStatus('dnd')}>
                    <Circle className="w-3 h-3 fill-current text-red-500 mr-2" />
                    Do Not Disturb
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setUserStatus('xa')}>
                    <Circle className="w-3 h-3 fill-current text-orange-500 mr-2" />
                    Extended Away
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={disconnect}
                className="text-gray-500 hover:text-red-500"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 flex items-center">
            <Circle className={`w-3 h-3 fill-current ${getPresenceColor(userStatus)} mr-1`} />
            <span>Status: {getStatusLabel(userStatus)}</span>
          </div>
        </div>

        {/* Contacts Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Direct Messages
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAddContact(true)}
                className="text-gray-500 hover:text-blue-500"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-1">
              {contacts.map((contact) => (
                <button
                  key={contact.jid}
                  onClick={() => setActiveChat(contact.jid, 'chat')}
                  className={`w-full text-left p-3 rounded-lg transition-colors flex items-center space-x-3 ${
                    activeChat === contact.jid && activeChatType === 'chat'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="relative">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <Circle className={`w-3 h-3 absolute -bottom-0.5 -right-0.5 fill-current ${getPresenceColor(contact.presence)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{contact.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{contact.presence}</p>
                  </div>
                </button>
              ))}
              
              {contacts.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No contacts yet. Add some friends!
                </p>
              )}
            </div>
          </div>

          {/* Rooms Section */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center">
                <Hash className="w-4 h-4 mr-2" />
                Group Chats
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowCreateRoom(true)}
                className="text-gray-500 hover:text-blue-500"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-1">
              {rooms.map((room) => (
                <div key={room.jid} className="relative">
                  <button
                    onClick={() => setActiveChat(room.jid, 'groupchat')}
                    className={`w-full text-left p-3 pr-10 rounded-lg transition-colors flex items-center space-x-3 ${
                      activeChat === room.jid && activeChatType === 'groupchat'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Hash className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{room.name}</p>
                      <p className="text-xs text-gray-500">{room.participants.length} members</p>
                    </div>
                  </button>
                  
                  {/* Room actions dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="absolute right-2 top-3 h-8 w-8 p-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedRoomJid(room.jid);
                          setShowAddParticipant(true);
                        }}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        <span>Add Participant</span>
                      </DropdownMenuItem>
                      
                      {room.participants.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Participants</DropdownMenuLabel>
                          {room.participants.map((participant, idx) => (
                            <DropdownMenuItem 
                              key={idx} 
                              className="flex justify-between items-center"
                            >
                              <span className="truncate">
                                {participant.split('@')[0]}
                              </span>
                              {room.isOwner && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 ml-2 text-red-500 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRoomKickUser(room.jid, participant);
                                  }}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              
              {rooms.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No group chats yet. Create one!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddContactDialog 
        open={showAddContact} 
        onOpenChange={setShowAddContact} 
      />
      <CreateRoomDialog 
        open={showCreateRoom} 
        onOpenChange={setShowCreateRoom} 
      />
      {showAddParticipant && (
        <AddRoomParticipantDialog
          open={showAddParticipant}
          onOpenChange={setShowAddParticipant}
          roomJid={selectedRoomJid}
        />
      )}
    </>
  );
};
