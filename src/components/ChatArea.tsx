
import React, { useState, useRef, useEffect } from 'react';
import { useXMPPStore } from '@/store/xmppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Send, Users, UserPlus, Settings, User, Hash, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
}

type ChatType = 'chat' | 'groupchat';

export const ChatArea = () => {
  const { 
    activeChat, 
    activeChatType, 
    sendMessage, 
    currentUser, 
    messages,
    rooms,
    contacts,
    deleteMessage
  } = useXMPPStore();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentRoom = rooms.find(room => room.jid === activeChat);

  const getChatName = () => {
    if (activeChatType === 'groupchat' && currentRoom) {
      return currentRoom.name;
    } else if (activeChatType === 'chat') {
      const contact = contacts.find(contact => contact.jid === activeChat);
      return contact ? contact.name : activeChat;
    }
    return 'Chat';
  };

  const getRoomParticipants = () => {
    return currentRoom ? currentRoom.participants : [];
  };

  const getMessages = () => {
    const chatMessages = messages[activeChat] || [];
    // Ensure all messages have proper timestamp format
    return chatMessages.map(msg => ({
      ...msg,
      timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : msg.timestamp.getTime()
    }));
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && activeChat) {
      sendMessage(activeChat, newMessage.trim(), activeChatType || 'chat');
      setNewMessage('');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages[activeChat]]);

  return (
    <div className="flex-1 flex flex-col h-screen">
      {activeChat ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>
                  {activeChatType === 'groupchat' ? (
                    <Hash className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold">{getChatName()}</h2>
                {activeChatType === 'groupchat' && (
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500">
                      {getRoomParticipants().length} participants
                    </p>
                    {currentRoom?.description && (
                      <p className="text-sm text-gray-600">• {currentRoom.description}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            {activeChatType === 'groupchat' && (
              <div className="flex items-center space-x-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Users className="h-4 w-4 mr-2" />
                      Participants
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Room Participants</AlertDialogTitle>
                      <AlertDialogDescription>
                        Users currently in this room
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Separator />
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {getRoomParticipants().map((participant, index) => {
                          // Handle both string and object participants
                          const participantData = typeof participant === 'string' 
                            ? { jid: participant, nick: participant.split('@')[0], affiliation: 'member' }
                            : participant;
                          
                          return (
                            <div key={index} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>
                                  <User className="h-3 w-3" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{participantData.nick || participantData.jid}</span>
                              {participantData.affiliation && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {participantData.affiliation}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {getRoomParticipants().length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">No participants</p>
                        )}
                      </div>
                    </ScrollArea>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Close</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </div>
            )}
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4" ref={messagesEndRef}>
              {getMessages().map((message) => (
                <MessageBubble 
                  key={`${message.id}-${message.timestamp}`} 
                  message={message} 
                  isOwnMessage={message.from === currentUser}
                  chatJid={activeChat}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button onClick={handleSendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Welcome to XMPP Chat</h2>
            <p className="text-gray-500">Select a contact or room to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
};

const MessageBubble = ({ message, isOwnMessage, chatJid }: { message: Message; isOwnMessage: boolean; chatJid: string }) => {
  const { deleteMessage } = useXMPPStore();

  const handleDeleteMessage = () => {
    deleteMessage(chatJid, message.id);
    toast({
      title: "Message Deleted",
      description: "Message has been removed"
    });
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
        isOwnMessage 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-200 text-gray-800'
      }`}>
        {!isOwnMessage && (
          <p className="text-xs opacity-70 mb-1">{message.from}</p>
        )}
        <p className="text-sm">{message.body}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs opacity-70">
            {new Date(message.timestamp).toLocaleTimeString()}
          </p>
          {isOwnMessage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteMessage}
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2 hover:bg-red-100"
            >
              <X className="h-3 w-3 text-red-500" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
