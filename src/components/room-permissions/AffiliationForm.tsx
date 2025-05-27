
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useXMPPStore, Room } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';
import { validateJID, validateAffiliation, sanitizeInput } from '@/utils/validation';
import { canSetAffiliation } from '@/utils/permissions';
import { handleXMPPError, retryOperation } from '@/utils/errorHandling';

interface AffiliationFormProps {
  room: Room;
  onRefreshAffiliations: () => void;
}

export const AffiliationForm: React.FC<AffiliationFormProps> = ({
  room,
  onRefreshAffiliations,
}) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAffiliation, setSelectedAffiliation] = useState<'owner' | 'admin' | 'member' | 'none'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState('');
  
  const { setRoomAffiliation, currentUser } = useXMPPStore();

  const validateInput = (userJid: string): boolean => {
    setInputError('');
    
    if (!userJid.trim()) {
      setInputError('Please enter a user JID');
      return false;
    }
    
    const sanitizedJid = sanitizeInput(userJid);
    if (!validateJID(sanitizedJid)) {
      setInputError('Please enter a valid JID (e.g., user@domain.com)');
      return false;
    }
    
    if (!validateAffiliation(selectedAffiliation)) {
      setInputError('Invalid affiliation selected');
      return false;
    }
    
    if (!canSetAffiliation(room, currentUser, selectedAffiliation)) {
      setInputError('You do not have permission to set this affiliation');
      return false;
    }
    
    return true;
  };

  const handleSetAffiliation = async () => {
    if (!validateInput(selectedUser)) return;
    
    const sanitizedJid = sanitizeInput(selectedUser);
    setIsSubmitting(true);
    
    try {
      await retryOperation(async () => {
        await setRoomAffiliation(room.jid, sanitizedJid, selectedAffiliation);
      });
      
      setSelectedUser('');
      setSelectedAffiliation('member');
      setInputError('');
      
      toast({
        title: "Affiliation Updated",
        description: `User affiliation has been set to ${selectedAffiliation}`
      });

      onRefreshAffiliations();
    } catch (error) {
      handleXMPPError(error, 'Failed to set affiliation');
      setInputError('Failed to update user affiliation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Add User Permission</Label>
      <div className="space-y-2">
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              placeholder="user@domain.com"
              value={selectedUser}
              onChange={(e) => {
                setSelectedUser(e.target.value);
                setInputError('');
              }}
              className={inputError ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {inputError && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {inputError}
              </div>
            )}
          </div>
          <Select 
            value={selectedAffiliation} 
            onValueChange={(value: any) => setSelectedAffiliation(value)}
            disabled={isSubmitting}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              {room.isOwner && <SelectItem value="owner">Owner</SelectItem>}
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleSetAffiliation} 
            disabled={!selectedUser || isSubmitting}
            className="min-w-[60px]"
          >
            {isSubmitting ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              'Set'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
