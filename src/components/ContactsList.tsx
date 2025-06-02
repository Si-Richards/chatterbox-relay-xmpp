
import React, { useState } from 'react';
import { useXMPPStore } from '@/store/xmppStore';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { ContactsHeader } from './ContactsHeader';
import { ContactCard } from './ContactCard';

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
    setContactSortMethod,
    markMessagesAsRead,
    muteContact,
    unmuteContact,
    blockContact,
    unblockContact,
    deleteContact,
    blockedContacts,
    isConnected
  } = useXMPPStore();

  const [deletingContacts, setDeletingContacts] = useState<Set<string>>(new Set());

  // Function to get last message timestamp for a chat
  const getLastMessageTime = (chatJid: string) => {
    const chatMessages = messages[chatJid] || [];
    if (chatMessages.length === 0) return new Date(0);
    return new Date(chatMessages[chatMessages.length - 1].timestamp);
  };

  // Show both regular contacts and blocked contacts (but blocked ones are filtered in getSortedContacts)
  const getAllContacts = () => {
    let allContacts = [...contacts];
    
    // Add blocked contacts that might not be in the regular contacts list
    blockedContacts.forEach(blockedJid => {
      if (!allContacts.find(c => c.jid === blockedJid)) {
        allContacts.push({
          jid: blockedJid,
          name: blockedJid.split('@')[0],
          presence: 'offline' as const,
          isBlocked: true
        });
      }
    });
    
    return allContacts;
  };

  // Sort contacts based on selected method
  const getSortedContacts = () => {
    let filtered = getAllContacts().filter(contact =>
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

  // Function to count unread messages for a chat
  const getUnreadCount = (chatJid: string) => {
    const chatMessages = messages[chatJid] || [];
    return chatMessages.filter(msg => 
      msg.from !== currentUser && 
      !msg.from.includes(currentUser.split('@')[0]) &&
      (!msg.status || msg.status !== 'read')
    ).length;
  };

  // Handle chat click and mark messages as read
  const handleChatClick = (chatJid: string, type: 'chat' | 'groupchat') => {
    onChatClick(chatJid, type);
    
    // Mark messages as read when opening the chat
    setTimeout(() => {
      markMessagesAsRead(chatJid);
    }, 100);
  };

  const handleMuteContact = (contact: any) => {
    if (contact.isMuted) {
      unmuteContact(contact.jid);
      toast({
        title: "Contact Unmuted",
        description: `${contact.name} has been unmuted`
      });
    } else {
      muteContact(contact.jid);
      toast({
        title: "Contact Muted",
        description: `${contact.name} has been muted`
      });
    }
  };

  const handleBlockContact = (contact: any) => {
    blockContact(contact.jid);
    toast({
      title: "Contact Blocked",
      description: `${contact.name} has been blocked`
    });
  };

  const handleUnblockContact = (contact: any) => {
    unblockContact(contact.jid);
    toast({
      title: "Contact Unblocked",
      description: `${contact.name} has been unblocked`
    });
  };

  const handleDeleteContact = async (contact: any) => {
    console.log(`User initiated deletion of contact: ${contact.name} (${contact.jid})`);
    
    if (!isConnected) {
      toast({
        title: "Connection Error",
        description: "Not connected to XMPP server. Please reconnect and try again.",
        variant: "destructive"
      });
      return;
    }

    // Add to deleting state
    setDeletingContacts(prev => new Set([...prev, contact.jid]));

    try {
      await deleteContact(contact.jid);
      
      toast({
        title: "Contact Deleted",
        description: `${contact.name} has been successfully removed from your contacts`
      });
    } catch (error) {
      console.error(`Failed to delete contact ${contact.jid}:`, error);
      
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete contact. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Remove from deleting state
      setDeletingContacts(prev => {
        const newSet = new Set(prev);
        newSet.delete(contact.jid);
        return newSet;
      });
    }
  };

  const filteredContacts = getSortedContacts();

  return (
    <Collapsible open={!isCollapsed} onOpenChange={onToggleCollapse}>
      <ContactsHeader
        isCollapsed={isCollapsed}
        contactCount={filteredContacts.length}
        contactSortMethod={contactSortMethod}
        onToggleCollapse={onToggleCollapse}
        onSortMethodChange={setContactSortMethod}
      />
      <CollapsibleContent>
        <div className="space-y-1 mt-1">
          {filteredContacts.map((contact) => {
            const unreadCount = getUnreadCount(contact.jid);
            const isActive = activeChat === contact.jid;
            const isDeleting = deletingContacts.has(contact.jid);
            
            return (
              <ContactCard
                key={contact.jid}
                contact={contact}
                isActive={isActive}
                unreadCount={unreadCount}
                isDeleting={isDeleting}
                onChatClick={handleChatClick}
                onMuteContact={handleMuteContact}
                onBlockContact={handleBlockContact}
                onUnblockContact={handleUnblockContact}
                onDeleteContact={handleDeleteContact}
              />
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
