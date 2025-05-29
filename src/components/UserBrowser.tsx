
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search, User, RefreshCw } from 'lucide-react';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';

interface ServerUser {
  jid: string;
  name: string;
}

export const UserBrowser = () => {
  const { client, contacts, addContact, fetchServerUsers, searchUserByJid } = useXMPPStore();
  const [serverUsers, setServerUsers] = useState<ServerUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Filter users based on search and exclude existing contacts
  const filteredUsers = serverUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.jid.toLowerCase().includes(searchQuery.toLowerCase());
    const notInContacts = !contacts.find(contact => contact.jid === user.jid);
    return matchesSearch && notInContacts;
  });

  const handleFetchUsers = async () => {
    if (!client) {
      toast({
        title: "Error",
        description: "Not connected to server",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const users = await fetchServerUsers();
      setServerUsers(users);
      
      if (users.length === 0) {
        toast({
          title: "No Users Found",
          description: "No users were found on the server. Try searching for specific users by JID."
        });
      } else {
        toast({
          title: "Success",
          description: `Found ${users.length} users on the server`
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users from server",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!searchQuery.trim() || !client) return;
    
    setIsSearching(true);
    try {
      const user = await searchUserByJid(searchQuery.trim());
      if (user) {
        // Add to server users list if not already there
        setServerUsers(prev => {
          const exists = prev.find(u => u.jid === user.jid);
          if (!exists) {
            return [...prev, user];
          }
          return prev;
        });
        
        toast({
          title: "User Found",
          description: `Found user: ${user.name}`
        });
      } else {
        toast({
          title: "User Not Found",
          description: `No user found with JID: ${searchQuery}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Failed to search for user",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddUser = (userJid: string) => {
    addContact(userJid);
    toast({
      title: "Contact Added",
      description: `Added ${userJid.split('@')[0]} to your contacts`
    });
  };

  // Auto-fetch users when component mounts
  useEffect(() => {
    if (client && serverUsers.length === 0) {
      handleFetchUsers();
    }
  }, [client]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchUser();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Search users or enter JID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearchUser} disabled={isSearching || !searchQuery.trim()}>
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
        
        <Button onClick={handleFetchUsers} disabled={isLoading} variant="outline" className="w-full">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Loading...' : 'Refresh Server Users'}
        </Button>
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {serverUsers.length === 0 ? (
                <>
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="mb-2">No users found on server</p>
                  <p className="text-sm">Try searching for specific users by entering their JID</p>
                  <p className="text-xs mt-1 text-gray-400">Example: username@ejabberd.voicehost.io</p>
                </>
              ) : searchQuery ? (
                <>
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No users found matching "{searchQuery}"</p>
                </>
              ) : (
                <>
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>All users are already in your contacts</p>
                </>
              )}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.jid} className="bg-transparent shadow-none hover:bg-gray-50 transition-colors">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.jid}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddUser(user.jid)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
