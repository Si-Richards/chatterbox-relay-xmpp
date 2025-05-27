
import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Menu } from 'lucide-react';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from "@/components/ui/scroll-area"
import { CreateRoomDialog } from './CreateRoomDialog';
import { UserBrowserDialog } from './UserBrowserDialog';
import { ThemeToggle } from './ThemeToggle';

export const Sidebar: React.FC = () => {
  const { 
    isConnected, 
    rooms, 
    currentUser, 
    connect, 
    disconnect, 
    joinRoom,
    messages,
    currentRoomJid,
    setCurrentRoomJid,
    fetchRooms
  } = useXMPPStore();
  const [jid, setJid] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCreateRoomDialogOpen, setIsCreateRoomDialogOpen] = useState(false);

  useEffect(() => {
    if (isConnected) {
      fetchRooms();
    }
  }, [isConnected, fetchRooms]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect(jid, password);
      toast({
        title: "Connected",
        description: "Successfully connected to XMPP server",
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error?.message || "Failed to connect to XMPP server",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Disconnected",
      description: "Successfully disconnected from XMPP server",
    });
  };

  const handleJoinRoom = (roomJid: string) => {
    joinRoom(roomJid);
    setCurrentRoomJid(roomJid);
  };

  const getUnreadMessagesCount = (roomJid: string) => {
    const roomMessages = messages[roomJid] || [];
    return roomMessages.filter(msg => msg.from !== currentUser).length;
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-64 dark:bg-gray-900 dark:border-gray-700">
        <SheetHeader className="space-y-2.5">
          <SheetTitle>XMPP Chat</SheetTitle>
          <SheetDescription>
            Manage your account settings and set preferences.
          </SheetDescription>
        </SheetHeader>

        {!isConnected ? (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="jid">JID</Label>
              <Input
                id="jid"
                placeholder="user@example.com"
                type="email"
                value={jid}
                onChange={(e) => setJid(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleConnect} disabled={isConnecting || !jid || !password}>
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h1 className="text-xl font-bold">XMPP Chat</h1>
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                <UserBrowserDialog />
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>

            {/* Room List */}
            <div className="flex-grow overflow-y-auto">
              <ScrollArea className="h-full">
                <div className="py-4">
                  <div className="px-4 py-2 font-semibold text-sm">Rooms</div>
                  {rooms.map((room) => (
                    <Button
                      key={room.jid}
                      variant="ghost"
                      className={`w-full justify-start rounded-none hover:bg-secondary ${currentRoomJid === room.jid ? 'bg-secondary text-secondary-foreground' : ''}`}
                      onClick={() => handleJoinRoom(room.jid)}
                    >
                      <Avatar className="mr-2 h-6 w-6">
                        <AvatarImage src={room.avatar} alt={room.name} />
                        <AvatarFallback>{room.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      {room.name}
                      {getUnreadMessagesCount(room.jid) > 0 && (
                        <span className="ml-auto rounded-full bg-red-500 text-white text-xs font-bold px-2 py-0.5">
                          {getUnreadMessagesCount(room.jid)}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Footer */}
            <div className="p-4 border-t">
              <CreateRoomDialog
                open={isCreateRoomDialogOpen}
                onOpenChange={setIsCreateRoomDialogOpen}
              />
              <Button onClick={() => setIsCreateRoomDialogOpen(true)} className="w-full">
                Create Room
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
