
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, Smile, Paperclip, Image, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MessageActionsProps {
  onDelete: () => void;
  onEmojiSelect: (emoji: string) => void;
  onFileUpload: (file: File) => void;
  onGifSelect: (gifUrl: string) => void;
  showDelete?: boolean;
}

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '👍', '👎', '👌', '🤞', '✌️', '🤟', '🤘', '👊', '✊', '🤛',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔'
];

export const MessageActions: React.FC<MessageActionsProps> = ({
  onDelete,
  onEmojiSelect,
  onFileUpload,
  onGifSelect,
  showDelete = false
}) => {
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isGifOpen, setIsGifOpen] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEmojiSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsEmojiOpen(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      onFileUpload(file);
    }
  };

  const searchGifs = async () => {
    if (!gifSearch.trim()) return;
    
    try {
      // Using a free GIF service for demo purposes
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=GlVGYHkr3WSBnllca54iNt0yFbjz7L65&q=${encodeURIComponent(gifSearch)}&limit=20`);
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Error fetching GIFs:', error);
      toast({
        title: "Error",
        description: "Failed to load GIFs",
        variant: "destructive"
      });
    }
  };

  const handleGifSelect = (gif: any) => {
    onGifSelect(gif.images.fixed_height.url);
    setIsGifOpen(false);
    setGifSearch('');
    setGifs([]);
  };

  return (
    <div className="flex items-center space-x-1">
      {/* Emoji Picker */}
      <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Smile className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
            {EMOJI_LIST.map((emoji, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg hover:bg-gray-100"
                onClick={() => handleEmojiSelect(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* File Upload */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={() => fileInputRef.current?.click()}
      >
        <Paperclip className="h-3 w-3" />
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileUpload}
      />

      {/* GIF Picker */}
      <Popover open={isGifOpen} onOpenChange={setIsGifOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Image className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3">
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                placeholder="Search GIFs..."
                value={gifSearch}
                onChange={(e) => setGifSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchGifs()}
              />
              <Button onClick={searchGifs} size="sm">Search</Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {gifs.map((gif) => (
                <img
                  key={gif.id}
                  src={gif.images.fixed_height_small.url}
                  alt={gif.title}
                  className="cursor-pointer rounded hover:opacity-80 transition-opacity"
                  onClick={() => handleGifSelect(gif)}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete Message */}
      {showDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-red-100"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3 text-red-500" />
        </Button>
      )}
    </div>
  );
};
