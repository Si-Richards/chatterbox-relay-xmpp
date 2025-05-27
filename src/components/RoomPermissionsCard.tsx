
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, User, UserMinus, RefreshCw, AlertTriangle } from 'lucide-react';
import { useXMPPStore } from '@/store/xmppStore';
import { toast } from '@/hooks/use-toast';
import { validateJID, validateAffiliation, sanitizeInput } from '@/utils/validation';
import { canSetAffiliation } from '@/utils/permissions';
import { handleXMPPError, retryOperation } from '@/utils/errorHandling';

interface Affiliation {
  jid: string;
  name?: string;
  affiliation: string;
  role?: string;
}

interface RoomWithAffiliations {
  jid: string;
  affiliations?: Affiliation[];
  isOwner?: boolean;
}

interface RoomPermissionsCardProps {
  room: RoomWithAffiliations;
  isLoadingAffiliations: boolean;
  onRefreshAffiliations: () => void;
}

export const RoomPermissionsCard: React.FC<RoomPermissionsCardProps> = ({
  room,
  isLoadingAffiliations,
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

      // Refresh affiliations after setting
      onRefreshAffiliations();
    } catch (error) {
      handleXMPPError(error, 'Failed to set affiliation');
      setInputError('Failed to update user affiliation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAffiliationIcon = (affiliation: string) => {
    switch (affiliation) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'member':
        return <User className="h-4 w-4 text-green-600" />;
      default:
        return <UserMinus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAffiliationBadgeVariant = (affiliation: string) => {
    switch (affiliation) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'member':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Room Permissions</CardTitle>
        <CardDescription>
          Manage user permissions and roles in this room
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Affiliation */}
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

        {/* Current Affiliations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Current Permissions</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefreshAffiliations}
              disabled={isLoadingAffiliations}
              className="flex items-center space-x-1"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingAffiliations ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
            {room.affiliations && room.affiliations.length > 0 ? (
              room.affiliations.map((affiliation, index) => (
                <div
                  key={`${affiliation.jid}-${index}`}
                  className="flex items-center justify-between p-2 border rounded-md bg-gray-50"
                >
                  <div className="flex items-center space-x-2">
                    {getAffiliationIcon(affiliation.affiliation)}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {affiliation.name || affiliation.jid.split('@')[0]}
                      </span>
                      <span className="text-xs text-gray-500">{affiliation.jid}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getAffiliationBadgeVariant(affiliation.affiliation)}>
                      {affiliation.affiliation}
                    </Badge>
                    {affiliation.role && (
                      <Badge variant="outline" className="text-xs">
                        {affiliation.role}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                {isLoadingAffiliations ? (
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">Loading permissions...</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No permissions loaded. Click "Refresh" to load current permissions.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
