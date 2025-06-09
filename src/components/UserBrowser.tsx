
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search, User, RefreshCw, AlertCircle } from 'lucide-react';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';

interface ServerUser {
  jid: string;
  name: string;
}

export const UserBrowser = () => {
  const { client, contacts, addContact, fetchServerUsers, searchUserByJid, isConnected } = useXMPPStore();
  const [serverUsers, setServerUsers] = useState<ServerUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Filter users based on search and exclude existing contacts
  const filteredUsers = serverUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.jid.toLowerCase().includes(searchQuery.toLowerCase());
    const notInContacts = !contacts.find(contact => contact.jid === user.jid);
    return matchesSearch && notInContacts;
  });

  const handleFetchUsers = async () => {
    if (!client || !isConnected) {
      const error = "Not connected to server";
      setLastError(error);
      toast({
        title: "Connection Error",
        description: error,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setLastError(null);
    
    try {
      console.log('UserBrowser: Starting user fetch...');
      const users = await fetchServerUsers();
      console.log(`UserBrowser: Fetched ${users.length} users`);
      
      setServerUsers(users);
      
      if (users.length === 0) {
        const message = "No users found on the server. The server might not support user discovery, or you might need different permissions.";
        setLastError(message);
        toast({
          title: "No Users Found",
          description: message
        });
      } else {
        toast({
          title: "Success",
          description: `Found ${users.length} users on the server`
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('UserBrowser: Failed to fetch users:', error);
      setLastError(errorMessage);
      toast({
        title: "Error",
        description: `Failed to fetch users: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Invalid Input", 
        description: "Please enter a username or JID to search",
        variant: "destructive"
      });
      return;
    }
    
    if (!client || !isConnected) {
      toast({
        title: "Connection Error",
        description: "Not connected to server",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    setLastError(null);
    
    try {
      console.log(`UserBrowser: Searching for user: ${searchQuery}`);
      const user = await searchUserByJid(searchQuery.trim());
      
      if (user) {
        console.log(`UserBrowser: Found user:`, user);
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
        const message = `No user found with JID: ${searchQuery}. The user might not exist or might be offline.`;
        setLastError(message);
        toast({
          title: "User Not Found",
          description: message,
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('UserBrowser: Search failed:', error);
      setLastError(errorMessage);
      toast({
        title: "Search Error",
        description: `Failed to search for user: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddUser = (userJid: string) => {
    console.log(`UserBrowser: Adding user: ${userJid}`);
    addContact(userJid);
    toast({
      title: "Contact Added",
      description: `Added ${userJid.split('@')[0]} to your contacts`
    });
  };

  // Auto-fetch users when component mounts
  useEffect(() => {
    if (client && isConnected && serverUsers.length === 0) {
      console.log('UserBrowser: Auto-fetching users on mount');
      handleFetchUsers();
    }
  }, [client, isConnected]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchUser();
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      {!isConnected && (
        <div className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">Not connected to server</span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Search users or enter JID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={!isConnected}
          />
          <Button 
            onClick={handleSearchUser} 
            disabled={isSearching || !searchQuery.trim() || !isConnected}
          >
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
        
        <Button 
          onClick={handleFetchUsers} 
          disabled={isLoading || !isConnected} 
          variant="outline" 
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Loading...' : 'Refresh Server Users'}
        </Button>

        {/* Error Display */}
        {lastError && (
          <div className="p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">{lastError}</p>
          </div>
        )}
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {!isConnected ? (
                <>
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="mb-2">Not connected to server</p>
                  <p className="text-sm">Please ensure you're connected to browse users</p>
                </>
              ) : serverUsers.length === 0 ? (
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

      {/* Debug Info */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
        <p>Total users found: {serverUsers.length}</p>
        <p>Contacts: {contacts.length}</p>
        <p>Filtered users: {filteredUsers.length}</p>
      </div>
    </div>
  );
};
