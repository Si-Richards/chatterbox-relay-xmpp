
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, UserPlus, Search } from 'lucide-react';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';

export const UserBrowserDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<{ jid: string; name: string; }[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { addContact, fetchServerUsers, contacts } = useXMPPStore();

  const handleSearchUsers = async () => {
    setLoading(true);
    try {
      const serverUsers = await fetchServerUsers();
      setUsers(serverUsers);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users from server",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = (userJid: string) => {
    addContact(userJid);
    toast({
      title: "Contact Added",
      description: `Added ${userJid.split('@')[0]} to your contacts`
    });
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.jid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAlreadyContact = (userJid: string) => {
    return contacts.some(contact => contact.jid === userJid);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center space-x-1">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Browse Users</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Browse Users</DialogTitle>
          <DialogDescription>
            Search and add users from the server to your contacts
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={handleSearchUsers} 
              disabled={loading}
              className="flex items-center space-x-1"
            >
              <Search className="h-4 w-4" />
              <span>{loading ? 'Loading...' : 'Load Users'}</span>
            </Button>
          </div>

          {users.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.jid}
                      className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-2">
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
                        variant={isAlreadyContact(user.jid) ? "outline" : "default"}
                        onClick={() => handleAddContact(user.jid)}
                        disabled={isAlreadyContact(user.jid)}
                        className="flex items-center space-x-1"
                      >
                        <UserPlus className="h-3 w-3" />
                        <span>{isAlreadyContact(user.jid) ? "Added" : "Add"}</span>
                      </Button>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && searchTerm && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No users found matching "{searchTerm}"
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {users.length === 0 && (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Click "Load Users" to browse available users on the server
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
