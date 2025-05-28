
import React from 'react';
import { useXMPPStore } from '@/store/xmppStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronRight, User, ArrowUpDown, Clock, Type } from 'lucide-react';

interface ContactsListProps {
  searchQuery: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onChatClick: (chatJid: string, type: 'chat' | 'groupchat') => void;
}

export const ContactsList: React.FC<ContactsListProps> = ({
  searchQuery,
  isCollapsed,
  onToggleCollapse,
  onChatClick
}) => {
  const { 
    contacts, 
    messages, 
    activeChat, 
    currentUser,
    contactSortMethod,
    setContactSortMethod
  } = useXMPPStore();

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

  const filteredContacts = getSortedContacts();

  return (
    <Collapsible open={!isCollapsed} onOpenChange={onToggleCollapse}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="flex items-center text-xs font-medium text-gray-500 px-2 py-1 hover:bg-gray-100 rounded">
          {isCollapsed ? <ChevronRight className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
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
                onClick={() => onChatClick(contact.jid, 'chat')}
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
  );
};
