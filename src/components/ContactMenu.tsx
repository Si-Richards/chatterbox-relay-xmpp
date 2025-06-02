
import React from 'react';
import { DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Bell, BellOff, UserX, Trash2, UserCheck, Loader2 } from 'lucide-react';
import { Contact } from '@/store/types';

interface ContactMenuProps {
  contact: Contact;
  isDeleting: boolean;
  onMuteContact: (contact: Contact) => void;
  onBlockContact: (contact: Contact) => void;
  onUnblockContact: (contact: Contact) => void;
  onDeleteContact: (contact: Contact) => void;
}

export const ContactMenu: React.FC<ContactMenuProps> = ({
  contact,
  isDeleting,
  onMuteContact,
  onBlockContact,
  onUnblockContact,
  onDeleteContact
}) => {
  return (
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => onMuteContact(contact)}>
        {contact.isMuted ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
        {contact.isMuted ? 'Unmute' : 'Mute'} Contact
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => contact.isBlocked ? onUnblockContact(contact) : onBlockContact(contact)}>
        {contact.isBlocked ? <UserCheck className="w-4 h-4 mr-2" /> : <UserX className="w-4 h-4 mr-2" />}
        {contact.isBlocked ? 'Unblock' : 'Block'} Contact
      </DropdownMenuItem>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={isDeleting}>
            {isDeleting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            {isDeleting ? 'Deleting...' : 'Delete Contact'}
          </DropdownMenuItem>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {contact.name}? This will remove them from your contacts and unsubscribe from their presence updates. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => onDeleteContact(contact)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Contact'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenuContent>
  );
};
