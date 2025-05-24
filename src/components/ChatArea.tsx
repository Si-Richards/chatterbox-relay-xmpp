import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Hash, User, MessageSquare, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageActions } from './MessageActions';
import { useXMPPStore } from '@/store/xmppStore';

export const ChatArea = () => {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    activeChat, 
    activeChatType, 
    messages, 
    currentUser,
    contacts,
    rooms,
    sendMessage,
    sendFileMessage,
    deleteMessage,
    userAvatar
  } = useXMPPStore();

  const currentMessages = activeChat ? messages[activeChat] || [] : [];
  
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat || !activeChatType) return;
    
    sendMessage(activeChat, messageText, activeChatType);
    setMessageText('');
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!activeChat) return;
    deleteMessage(activeChat, messageId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
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
      return <Check className="h-3 w-3 inline ml-1 text-gray-400" />;
    } else if (status === 'read') {
      return (
        <div className="inline-flex ml-1">
          <Check className="h-3 w-3 text-blue-400" />
          <Check className="h-3 w-3 -ml-1 text-blue-400" />
        </div>
      );
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
    
    // For demo purposes, we'll convert the file to a data URL
    // In a real implementation, you'd upload to a file server
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = {
        name: file.name,
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
    
    const gifData = {
      name: 'animated.gif',
      type: 'image/gif',
      size: 0,
      url: gifUrl
    };
    
    sendFileMessage(activeChat, gifData, activeChatType);
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to XMPP Chat</h3>
          <p className="text-gray-500">Select a contact or group to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            activeChatType === 'groupchat' ? 'bg-green-100' : 'bg-blue-100'
          }`}>
            {activeChatType === 'groupchat' ? (
              <Hash className="w-5 h-5 text-green-600" />
            ) : (
              <Avatar>
                <AvatarImage src={getContactAvatar(activeChat)} />
                <AvatarFallback>
                  <User className="w-5 h-5 text-blue-600" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{getChatName()}</h2>
            <p className="text-sm text-gray-500">
              {activeChatType === 'groupchat' ? 'Group Chat' : 'Direct Message'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentMessages.map((message) => {
          const isOwn = isFromCurrentUser(message.from);
          const senderName = activeChatType === 'groupchat' 
            ? message.from.split('/')[1] || message.from.split('@')[0]
            : message.from.split('@')[0];

          const messageContent = (
            <div className="flex items-start space-x-2">
              <div
                className={`px-4 py-2 rounded-lg ${
                  isOwn
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {!isOwn && activeChatType === 'groupchat' && (
                  <p className="text-xs font-medium mb-1 text-blue-600">
                    {senderName}
                  </p>
                )}
                
                {message.fileData ? (
                  <div className="space-y-2">
                    {message.fileData.type.startsWith('image/') ? (
                      <img 
                        src={message.fileData.url} 
                        alt={message.fileData.name}
                        className="max-w-xs rounded"
                      />
                    ) : (
                      <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded">
                        <div className="text-sm">
                          <p className="font-medium">{message.fileData.name}</p>
                          <p className="text-gray-500">{(message.fileData.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    )}
                    {message.body && <p className="text-sm break-words">{message.body}</p>}
                  </div>
                ) : (
                  <p className="text-sm break-words">{message.body}</p>
                )}
                
                <div className={`text-xs mt-1 flex items-center ${
                  isOwn ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <span>{formatTime(message.timestamp)}</span>
                  {isOwn && getMessageStatusIcon(message.status)}
                </div>
              </div>
              
              {isOwn && (
                <MessageActions
                  onDelete={() => handleDeleteMessage(message.id)}
                  onEmojiSelect={handleEmojiSelect}
                  onFileUpload={handleFileUpload}
                  onGifSelect={handleGifSelect}
                  showDelete={true}
                />
              )}
            </div>
          );

          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              {!isOwn && (
                <div className="mr-2 flex-shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getContactAvatar(message.from.split('/')[0])} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
                {messageContent}
              </div>
              {isOwn && (
                <div className="ml-2 flex-shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userAvatar || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-2">
          <MessageActions
            onDelete={() => {}}
            onEmojiSelect={handleEmojiSelect}
            onFileUpload={handleFileUpload}
            onGifSelect={handleGifSelect}
            showDelete={false}
          />
        </div>
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={`Message ${getChatName()}...`}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!messageText.trim()}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
