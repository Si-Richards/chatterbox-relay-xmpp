import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RefreshCw, Users, Crown, Shield, User } from 'lucide-react';
import { Room } from '@/store/xmppStore';
import { AffiliationItem } from './AffiliationItem';

interface AffiliationsListProps {
  room: Room;
  isLoadingAffiliations: boolean;
  onRefreshAffiliations: () => void;
}

export const AffiliationsList: React.FC<AffiliationsListProps> = ({
  room,
  isLoadingAffiliations,
  onRefreshAffiliations,
}) => {
  // Group affiliations by type for better organization
  const groupedAffiliations = {
    owners: room.affiliations?.filter(a => a.affiliation === 'owner') || [],
    admins: room.affiliations?.filter(a => a.affiliation === 'admin') || [],
    members: room.affiliations?.filter(a => a.affiliation === 'member') || [],
    others: room.affiliations?.filter(a => a.affiliation === 'none') || []
  };

  const totalMembers = room.affiliations?.length || 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center space-x-2">
          <Users className="h-4 w-4" />
          <span>Room Members ({totalMembers})</span>
        </Label>
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
          <div className="space-y-3">
            {/* Owners */}
            {groupedAffiliations.owners.length > 0 && (
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <Crown className="h-3 w-3 text-yellow-600" />
                  <span className="text-xs font-medium text-yellow-600">Owners ({groupedAffiliations.owners.length})</span>
                </div>
                {groupedAffiliations.owners.map((affiliation, index) => (
                  <AffiliationItem
                    key={`owner-${affiliation.jid}-${index}`}
                    affiliation={affiliation}
                  />
                ))}
              </div>
            )}

            {/* Admins */}
            {groupedAffiliations.admins.length > 0 && (
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <Shield className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">Admins ({groupedAffiliations.admins.length})</span>
                </div>
                {groupedAffiliations.admins.map((affiliation, index) => (
                  <AffiliationItem
                    key={`admin-${affiliation.jid}-${index}`}
                    affiliation={affiliation}
                  />
                ))}
              </div>
            )}

            {/* Members */}
            {groupedAffiliations.members.length > 0 && (
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <User className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium text-green-600">Members ({groupedAffiliations.members.length})</span>
                </div>
                {groupedAffiliations.members.map((affiliation, index) => (
                  <AffiliationItem
                    key={`member-${affiliation.jid}-${index}`}
                    affiliation={affiliation}
                  />
                ))}
              </div>
            )}

            {/* Others */}
            {groupedAffiliations.others.length > 0 && (
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <User className="h-3 w-3 text-gray-600" />
                  <span className="text-xs font-medium text-gray-600">Others ({groupedAffiliations.others.length})</span>
                </div>
                {groupedAffiliations.others.map((affiliation, index) => (
                  <AffiliationItem
                    key={`other-${affiliation.jid}-${index}`}
                    affiliation={affiliation}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            {isLoadingAffiliations ? (
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-500">Loading members...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Users className="h-8 w-8 mx-auto text-gray-300" />
                <p className="text-sm text-gray-500">
                  No members loaded. Click "Refresh" to load current members.
                </p>
                <p className="text-xs text-gray-400">
                  Note: You need appropriate permissions to view member lists.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
