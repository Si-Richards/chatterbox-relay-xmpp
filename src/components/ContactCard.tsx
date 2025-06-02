
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { User, Bell, BellOff, UserX, Trash2, MoreVertical, UserCheck } from 'lucide-react';
import { Contact } from '@/store/types';
import { ContactMenu } from './ContactMenu';

interface ContactCardProps {
  contact: Contact;
  isActive: boolean;
  unreadCount: number;
  isDeleting: boolean;
  onChatClick: (chatJid: string, type: 'chat' | 'groupchat') => void;
  onMuteContact: (contact: Contact) => void;
  onBlockContact: (contact: Contact) => void;
  onUnblockContact: (contact: Contact) => void;
  onDeleteContact: (contact: Contact) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  isActive,
  unreadCount,
  isDeleting,
  onChatClick,
  onMuteContact,
  onBlockContact,
  onUnblockContact,
  onDeleteContact
}) => {
  const getPresenceColor = (presence: string) => {
    switch (presence) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      case 'xa': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  const getPresenceText = (contact: Contact) => {
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

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card
          className={`bg-transparent shadow-none hover:bg-gray-100 transition-colors rounded-md cursor-pointer ${
            isActive ? 'bg-blue-50 border-blue-200' : ''
          } ${contact.isBlocked ? 'opacity-60' : ''}`}
          onClick={() => !contact.isBlocked && onChatClick(contact.jid, 'chat')}
        >
          <CardContent className="p-3 flex items-center space-x-2">
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={contact.avatar} alt={contact.name} />
                <AvatarFallback className="bg-gray-100 text-gray-600">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              {!contact.isBlocked && (
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white ${getPresenceColor(contact.presence)}`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1">
                <p className="text-sm font-medium truncate">{contact.name}</p>
                {contact.isMuted && <BellOff className="w-3 h-3 text-gray-400" />}
                {contact.isBlocked && <UserX className="w-3 h-3 text-red-400" />}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {contact.isBlocked ? 'Blocked' : getPresenceText(contact)}
              </p>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              {!contact.isBlocked && unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1.5 flex-shrink-0">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <ContactMenu
                  contact={contact}
                  isDeleting={isDeleting}
                  onMuteContact={onMuteContact}
                  onBlockContact={onBlockContact}
                  onUnblockContact={onUnblockContact}
                  onDeleteContact={onDeleteContact}
                />
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onMuteContact(contact)}>
          {contact.isMuted ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
          {contact.isMuted ? 'Unmute' : 'Mute'} Contact
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => contact.isBlocked ? onUnblockContact(contact) : onBlockContact(contact)}>
          {contact.isBlocked ? <UserCheck className="w-4 h-4 mr-2" /> : <UserX className="w-4 h-4 mr-2" />}
          {contact.isBlocked ? 'Unblock' : 'Block'} Contact
        </ContextMenuItem>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <ContextMenuItem onSelect={(e) => e.preventDefault()}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Contact
            </ContextMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Contact</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {contact.name}? This will remove them from your contacts and unsubscribe from their presence updates.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onDeleteContact(contact)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Contact
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ContextMenuContent>
    </ContextMenu>
  );
};
