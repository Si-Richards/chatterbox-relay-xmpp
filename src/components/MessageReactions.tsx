
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus } from 'lucide-react';

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

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center flex-wrap gap-1 mt-1">
      {reactions.map((reaction) => (
        <Button
          key={reaction.emoji}
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
