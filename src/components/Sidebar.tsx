
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
  Circle
} from 'lucide-react';
import { useXMPPStore } from '@/store/xmppStore';
import { AddContactDialog } from '@/components/AddContactDialog';
import { CreateRoomDialog } from '@/components/CreateRoomDialog';

export const Sidebar = () => {
  const { 
    currentUser, 
    contacts, 
    rooms, 
    activeChat, 
    activeChatType,
    setActiveChat, 
    disconnect 
  } = useXMPPStore();
  
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  const getPresenceColor = (presence: string) => {
    switch (presence) {
      case 'online': return 'text-green-500';
      case 'away': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
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
                <button
                  key={room.jid}
                  onClick={() => setActiveChat(room.jid, 'groupchat')}
                  className={`w-full text-left p-3 rounded-lg transition-colors flex items-center space-x-3 ${
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
    </>
  );
};
