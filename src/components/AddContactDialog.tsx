
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddContactDialog: React.FC<AddContactDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [contactJid, setContactJid] = useState('');
  const { addContact } = useXMPPStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactJid.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid JID",
        variant: "destructive"
      });
      return;
    }

    let jid = contactJid.trim();
    if (!jid.includes('@')) {
      jid = `${jid}@ejabberd.voicehost.io`;
    }

    addContact(jid);
    setContactJid('');
    onOpenChange(false);
    
    toast({
      title: "Contact Added",
      description: `Sent friend request to ${jid}`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Enter the username or full JID of the person you want to add.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-jid">Username or JID</Label>
            <Input
              id="contact-jid"
              placeholder="username or user@domain.com"
              value={contactJid}
              onChange={(e) => setContactJid(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Contact</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
