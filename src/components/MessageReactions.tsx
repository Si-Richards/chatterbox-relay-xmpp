
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Plus } from 'lucide-react';
import { useXMPPStore } from '@/store/xmppStore';

interface MessageReaction {
  emoji: string;
  users: string[];
}

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onReact: (emoji: string) => void;
  currentUser: string;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onReact,
  currentUser
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { contacts } = useXMPPStore();

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setIsOpen(false);
  };

  const getUserDisplayName = (jid: string): string => {
    // Try to find the user in contacts
    const contact = contacts.find(c => c.jid === jid);
    if (contact) {
      return contact.name;
    }
    
    // Fallback to username from JID
    return jid.split('@')[0];
  };

  const getReactionTooltip = (reaction: MessageReaction): string => {
    const userNames = reaction.users.map(getUserDisplayName);
    const currentUserIndex = reaction.users.indexOf(currentUser);
    
    if (currentUserIndex >= 0) {
      // Current user is in the list
      const otherUsers = userNames.filter((_, index) => index !== currentUserIndex);
      if (otherUsers.length === 0) {
        return 'You reacted';
      } else if (otherUsers.length === 1) {
        return `You and ${otherUsers[0]}`;
      } else if (otherUsers.length <= 3) {
        return `You, ${otherUsers.slice(0, -1).join(', ')} and ${otherUsers[otherUsers.length - 1]}`;
      } else {
        return `You and ${otherUsers.length} others`;
      }
    } else {
      // Current user is not in the list
      if (userNames.length === 1) {
        return userNames[0];
      } else if (userNames.length <= 3) {
        return userNames.slice(0, -1).join(', ') + ' and ' + userNames[userNames.length - 1];
      } else {
        return `${userNames.slice(0, 2).join(', ')} and ${userNames.length - 2} others`;
      }
    }
  };

  return (
    <div className="flex items-center flex-wrap gap-1 mt-1">
      {reactions.map((reaction) => (
        <HoverCard key={reaction.emoji} openDelay={300} closeDelay={150}>
          <HoverCardTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-6 px-2 text-xs ${
                reaction.users.includes(currentUser) 
                  ? 'bg-blue-100 border-blue-300' 
                  : 'bg-gray-50'
              }`}
              onClick={() => onReact(reaction.emoji)}
            >
              {reaction.emoji} {reaction.users.length}
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto p-2 text-sm">
            {getReactionTooltip(reaction)}
          </HoverCardContent>
        </HoverCard>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg hover:bg-gray-100"
                onClick={() => handleReact(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
