
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
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
  return (
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
            <AffiliationItem
              key={`${affiliation.jid}-${index}`}
              affiliation={affiliation}
            />
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
  );
};
