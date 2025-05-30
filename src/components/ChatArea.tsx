import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, Hash, User, MessageSquare, Check, Bold, Italic, Type, Edit2, Save, X, Settings, Users, UserPlus, Lock, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageActions } from './MessageActions';
import { MessageReactions } from './MessageReactions';
import { RoomSettings } from './RoomSettings';
import { TypingIndicator } from './TypingIndicator';
import { PollMessage } from './PollMessage';
import { SecureMessageRenderer } from './SecureMessageRenderer';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useXMPPStore } from '@/store/xmppStore';
import { useTyping } from '@/hooks/useTyping';
import { toast } from '@/hooks/use-toast';
import { sanitizeInput } from '@/utils/validation';

// Image component with error handling
const ImageWithFallback = ({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: React.CSSProperties }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageLoad = () => {
    setImageLoading(false);
    console.log('Image loaded successfully:', src);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
    console.error('Failed to load image:', src);
  };

  if (imageError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded ${className}`} style={style}>
        <div className="text-center p-4">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Failed to load image</p>
          <p className="text-xs text-gray-400 mt-1">URL: {src}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {imageLoading && (
        <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 rounded ${className}`} style={style}>
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
};

export const ChatArea = () => {
  const [messageText, setMessageText] = useState('');
  const [markdownEnabled, setMarkdownEnabled] = useState(true);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [inviteUsersOpen, setInviteUsersOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    activeChat,
    activeChatType,
    messages,
    currentUser,
    contacts,
    rooms,
    sendMessage,
    sendFileMessage,
    sendPoll,
    votePoll,
    closePoll,
    deleteMessage,
    addReaction,
    updateRoomDescription,
    userAvatar,
    setActiveChat
  } = useXMPPStore();

  // Initialize typing hook
  const {
    startTyping,
    stopTyping
  } = useTyping({
    chatJid: activeChat || '',
    chatType: activeChatType || 'chat'
  });

  // Fix duplicated messages by using a Set to track unique message IDs
  const currentMessages = activeChat ? Array.from(new Map((messages[activeChat] || []).map(msg => [msg.id, msg])).values()) : [];

  const getChatName = () => {
    if (!activeChat) return '';
    if (activeChatType === 'chat') {
      const contact = contacts.find(c => c.jid === activeChat);
      return contact ? contact.name : activeChat.split('@')[0];
    } else {
      const room = rooms.find(r => r.jid === activeChat);
      return room ? room.name : activeChat.split('@')[0];
    }
  };
  const getChatDescription = () => {
    if (!activeChat || activeChatType !== 'groupchat') return '';
    const room = rooms.find(r => r.jid === activeChat);
    return room?.description || '';
  };
  const getRoomParticipants = () => {
    if (!activeChat || activeChatType !== 'groupchat') return [];
    const room = rooms.find(r => r.jid === activeChat);
    return room?.participants || [];
  };
  const isRoomOwner = () => {
    if (!activeChat || activeChatType !== 'groupchat') return false;
    const room = rooms.find(r => r.jid === activeChat);
    return room?.isOwner || false;
  };
  const handleEditDescription = () => {
    setEditDescription(getChatDescription());
    setIsEditingDescription(true);
  };
  const handleSaveDescription = () => {
    if (!activeChat) return;
    updateRoomDescription(activeChat, editDescription);
    setIsEditingDescription(false);
    toast({
      title: "Description Updated",
      description: "Room description has been updated successfully"
    });
  };
  const handleCancelEdit = () => {
    setIsEditingDescription(false);
    setEditDescription('');
  };
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat || !activeChatType) return;
    
    // Sanitize message before sending
    const sanitizedMessage = sanitizeInput(messageText);
    if (sanitizedMessage.length === 0) {
      toast({
        title: "Invalid Message",
        description: "Message contains invalid characters",
        variant: "destructive"
      });
      return;
    }
    
    stopTyping(); // Stop typing when sending message
    sendMessage(activeChat, sanitizedMessage, activeChatType);
    setMessageText('');
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length <= 1000) {
      setMessageText(newText);

      // Handle typing notifications
      if (newText.trim() && activeChat && activeChatType) {
        startTyping();
      } else if (!newText.trim()) {
        stopTyping();
      }
    }
  };
  const insertMarkdown = (type: 'bold' | 'italic') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = messageText.substring(start, end);
    let wrapper = '';
    if (type === 'bold') wrapper = '**';
    if (type === 'italic') wrapper = '*';
    const newText = messageText.substring(0, start) + wrapper + selectedText + wrapper + messageText.substring(end);
    setMessageText(newText);

    // Focus back and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + wrapper.length + selectedText.length + wrapper.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };
  const handleDeleteMessage = (messageId: string) => {
    if (!activeChat) return;
    deleteMessage(activeChat, messageId);
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);
  const formatTime = (date: Date | string) => {
    try {
      // Ensure we have a valid Date object
      const dateObj = typeof date === 'string' ? new Date(date) : date;

      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date received:', date);
        return 'Invalid time';
      }
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting time:', error, 'Date:', date);
      return 'Invalid time';
    }
  };
  const isFromCurrentUser = (fromJid: string) => {
    if (activeChatType === 'groupchat') {
      return fromJid.includes(currentUser.split('@')[0]);
    }
    return fromJid === currentUser;
  };
  const getMessageStatusIcon = (status?: string) => {
    if (!status || status === 'sent') {
      return null;
    } else if (status === 'delivered') {
      return <Check className="h-3 w-3 inline ml-1 text-white" />;
    } else if (status === 'read') {
      return <div className="inline-flex ml-1">
          <Check className="h-3 w-3 text-white" />
          <Check className="h-3 w-3 -ml-1 text-white" />
        </div>;
    }
    return null;
  };
  const getContactAvatar = (jid: string) => {
    const contact = contacts.find(c => c.jid === jid);
    return contact?.avatar;
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
  };
  const handleFileUpload = async (file: File) => {
    if (!activeChat || !activeChatType) return;

    // Validate file before processing
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Only image files are allowed",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast({
        title: "File Too Large",
        description: "File size must be less than 50MB",
        variant: "destructive"
      });
      return;
    }

    // For demo purposes, we'll convert the file to a data URL
    // In a real implementation, you'd upload to a file server
    const reader = new FileReader();
    reader.onload = e => {
      const fileData = {
        name: sanitizeInput(file.name),
        type: file.type,
        size: file.size,
        url: e.target?.result as string
      };
      sendFileMessage(activeChat, fileData, activeChatType);
    };
    reader.readAsDataURL(file);
  };
  const handleGifSelect = (gifUrl: string) => {
    if (!activeChat || !activeChatType) return;
    console.log('Sending GIF:', gifUrl);
    const gifData = {
      name: 'animated.gif',
      type: 'image/gif',
      size: 0,
      url: gifUrl
    };
    sendFileMessage(activeChat, gifData, activeChatType);
  };

  const handleCreatePoll = (pollData: {
    question: string;
    options: { text: string }[];
    isAnonymous: boolean;
    allowMultipleChoice: boolean;
    expiresAt?: Date;
  }) => {
    if (!activeChat || !activeChatType) return;
    sendPoll(activeChat, pollData, activeChatType);
  };

  const handlePollVote = (messageId: string, pollId: string, optionIds: string[]) => {
    if (!activeChat) return;
    votePoll(activeChat, messageId, pollId, optionIds);
  };

  const handleClosePoll = (messageId: string, pollId: string) => {
    if (!activeChat) return;
    closePoll(activeChat, messageId, pollId);
  };

  const handleMessageReaction = (messageId: string, emoji: string) => {
    if (!activeChat) return;
    addReaction(activeChat, messageId, emoji);
  };
  const handleInviteUsers = () => {
    toast({
      title: "Invite Users",
      description: "Feature coming soon"
    });
    setInviteUsersOpen(false);
  };
  if (!activeChat) {
    return <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">&lt;Account_Name&gt; Chat</h3>
          <p className="text-gray-500">Select a contact or group to start messaging</p>
        </div>
      </div>;
  }
  return <div className="flex-1 flex flex-col h-screen">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeChatType === 'groupchat' ? 'bg-green-100' : 'bg-blue-100'}`}>
              {activeChatType === 'groupchat' ? <Hash className="w-5 h-5 text-green-600" /> : <Avatar>
                  <AvatarImage src={getContactAvatar(activeChat)} />
                  <AvatarFallback>
                    <User className="w-5 h-5 text-blue-600" />
                  </AvatarFallback>
                </Avatar>}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">{getChatName()}</h2>
              {activeChatType === 'groupchat' && <div className="flex items-center space-x-2">
                  {isEditingDescription ? <div className="flex items-center space-x-2 w-full">
                      <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Enter room description..." className="text-sm h-6" />
                      <Button size="sm" onClick={handleSaveDescription} className="h-6 w-6 p-0">
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="h-6 w-6 p-0">
                        <X className="h-3 w-3" />
                      </Button>
                    </div> : <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-500">
                        {getChatDescription() || 'Group Chat'}
                      </p>
                      {isRoomOwner() && <Button variant="ghost" size="sm" onClick={handleEditDescription} className="h-5 w-5 p-0 hover:bg-gray-100">
                          <Edit2 className="h-3 w-3 text-gray-400" />
                        </Button>}
                    </div>}
                </div>}
              {activeChatType === 'chat' && <p className="text-sm text-gray-500">Direct Message</p>}
            </div>
          </div>
          
          {/* Room Action Buttons */}
          {activeChatType === 'groupchat' && <div className="flex items-center space-x-2">
              {/* Participants List */}
              <Popover open={participantsOpen} onOpenChange={setParticipantsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Participants</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">Room Participants</h4>
                    <Separator />
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {getRoomParticipants().map((participant, index) => {
                      // Handle both string and object participants
                      const participantData = typeof participant === 'string' ? {
                        jid: participant,
                        nick: participant.split('@')[0],
                        affiliation: 'member'
                      } : participant;
                      return <div key={index} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>
                                  <User className="h-3 w-3" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{participantData.nick || participantData.jid}</span>
                              {participantData.affiliation && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {participantData.affiliation}
                                </span>}
                            </div>;
                    })}
                        {getRoomParticipants().length === 0 && <p className="text-sm text-gray-500 text-center py-4">No participants</p>}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Invite Users */}
              <AlertDialog open={inviteUsersOpen} onOpenChange={setInviteUsersOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center space-x-1">
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Invite</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Invite Users to Room</AlertDialogTitle>
                    <AlertDialogDescription>
                      Feature coming soon. You'll be able to invite users to this room.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleInviteUsers}>
                      Invite
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Room Settings */}
              <Button variant="ghost" size="sm" onClick={() => setRoomSettingsOpen(true)} className="flex items-center space-x-1">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </div>}
        </div>
      </div>

      {/* Messages Area - Fixed height with scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {currentMessages.map(message => {
        const isOwn = isFromCurrentUser(message.from);
        const senderName = activeChatType === 'groupchat' ? message.from.split('/')[1] || message.from.split('@')[0] : message.from.split('@')[0];
        
        // Handle poll messages
        if (message.pollData) {
          return <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {!isOwn && <div className="mr-2 flex-shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getContactAvatar(message.from.split('/')[0])} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>}
              <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
                <PollMessage
                  pollData={message.pollData}
                  currentUser={currentUser}
                  onVote={(optionIds) => handlePollVote(message.id, message.pollData!.id, optionIds)}
                  onClosePoll={() => handleClosePoll(message.id, message.pollData!.id)}
                  isOwner={isOwn}
                />
                <div className={`text-xs mt-1 ${isOwn ? 'text-right text-blue-600' : 'text-gray-500'}`}>
                  {formatTime(message.timestamp)}
                  {isOwn && getMessageStatusIcon(message.status)}
                </div>
              </div>
              {isOwn && <div className="ml-2 flex-shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userAvatar || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>}
            </div>;
        }

        // Handle regular messages with secure rendering
        const messageContent = <div className="flex items-start space-x-2">
              <div className={`px-4 py-2 rounded-lg ${isOwn ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200'}`}>
                {!isOwn && activeChatType === 'groupchat' && <p className="text-xs font-medium mb-1 text-blue-600">
                    {senderName}
                  </p>}
                
                {/* Encryption indicator */}
                {message.isEncrypted && <div className={`flex items-center space-x-1 mb-1 text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                    <Lock className="h-3 w-3" />
                    <span>OMEMO Encrypted</span>
                  </div>}
                
                {message.fileData ? <div className="space-y-2">
                    {message.fileData.type.startsWith('image/') ? <ImageWithFallback 
                        src={message.fileData.url} 
                        alt={message.fileData.name} 
                        className="max-w-xs rounded" 
                        style={{
                          maxHeight: '300px',
                          objectFit: 'contain'
                        }} 
                      /> : <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded">
                        <div className="text-sm">
                          <p className="font-medium">{message.fileData.name}</p>
                          <p className="text-gray-500">{(message.fileData.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>}
                    {message.body && <SecureMessageRenderer 
                        content={message.body}
                        markdownEnabled={markdownEnabled}
                        className="text-sm break-words whitespace-pre-wrap"
                      />}
                  </div> : <SecureMessageRenderer 
                    content={message.body}
                    markdownEnabled={markdownEnabled}
                    className="text-sm break-words whitespace-pre-wrap"
                  />}
                
                <div className={`text-xs mt-1 flex items-center ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                  <span>{formatTime(message.timestamp)}</span>
                  {isOwn && getMessageStatusIcon(message.status)}
                </div>
              </div>
              
              {/* Only show delete button for own messages */}
              {isOwn && <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-red-100" onClick={() => handleDeleteMessage(message.id)}>
                  <X className="h-3 w-3 text-red-500" />
                </Button>}
            </div>;
        return <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {!isOwn && <div className="mr-2 flex-shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getContactAvatar(message.from.split('/')[0])} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>}
              <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
                {messageContent}
                {message.reactions && message.reactions.length > 0 && <MessageReactions reactions={message.reactions} onReact={emoji => handleMessageReaction(message.id, emoji)} currentUser={currentUser} />}
                {!message.reactions || message.reactions.length === 0 ? <MessageReactions reactions={[]} onReact={emoji => handleMessageReaction(message.id, emoji)} currentUser={currentUser} /> : null}
              </div>
              {isOwn && <div className="ml-2 flex-shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userAvatar || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>}
            </div>;
      })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {activeChat && activeChatType && <TypingIndicator chatJid={activeChat} chatType={activeChatType} />}

      {/* Message Input - Fixed at bottom */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center space-x-2 mb-2">
          <MessageActions 
            onDelete={() => {}} 
            onEmojiSelect={handleEmojiSelect} 
            onFileUpload={handleFileUpload} 
            onGifSelect={handleGifSelect} 
            onCreatePoll={handleCreatePoll}
            showDelete={false} 
          />
          
          {/* Markdown Controls */}
          <div className="flex items-center space-x-1 border-l pl-2">
            <Button variant={markdownEnabled ? "default" : "ghost"} size="sm" className="h-6 w-6 p-0" onClick={() => setMarkdownEnabled(!markdownEnabled)} title="Toggle Markdown">
              <Type className="h-3 w-3" />
            </Button>
            {markdownEnabled && <>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => insertMarkdown('bold')} title="Bold">
                  <Bold className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => insertMarkdown('italic')} title="Italic">
                  <Italic className="h-3 w-3" />
                </Button>
              </>}
          </div>
        </div>
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <div className="flex-1 relative">
            <Textarea ref={textareaRef} value={messageText} onChange={handleTextChange} onKeyDown={handleKeyDown} placeholder={`Message ${getChatName()}... ${markdownEnabled ? '(Use **bold** or *italic*)' : ''}`} className="min-h-[40px] max-h-[120px] resize-none" rows={1} />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {messageText.length}/1000
            </div>
          </div>
          <Button type="submit" disabled={!messageText.trim()} className="bg-blue-500 hover:bg-blue-600 self-end">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Room Settings Dialog */}
      {activeChatType === 'groupchat' && activeChat && <RoomSettings open={roomSettingsOpen} onOpenChange={setRoomSettingsOpen} roomJid={activeChat} />}
    </div>;
};
