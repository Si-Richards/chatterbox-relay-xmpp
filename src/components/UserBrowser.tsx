
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search, User } from 'lucide-react';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';

interface ServerUser {
  jid: string;
  name: string;
}

export const UserBrowser = () => {
  const { client, contacts, addContact, fetchServerUsers } = useXMPPStore();
  const [serverUsers, setServerUsers] = useState<ServerUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredUsers = serverUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !contacts.find(contact => contact.jid === user.jid)
  );

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
      setServerUsers(users || []);
      toast({
        title: "Success",
        description: `Found ${users?.length || 0} users on the server`
      });
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

  const handleAddUser = (userJid: string) => {
    addContact(userJid);
    toast({
      title: "Contact Added",
      description: `Added ${userJid.split('@')[0]} to your contacts`
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleFetchUsers} disabled={isLoading}>
          <Search className="h-4 w-4 mr-2" />
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {serverUsers.length === 0 ? (
                <>
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Click "Refresh" to load users from the server</p>
                </>
              ) : (
                <>
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No users found matching your search</p>
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
