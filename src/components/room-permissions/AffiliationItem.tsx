
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { RoomAffiliation } from '@/store/xmppStore';
import { getAffiliationIcon, getAffiliationIconColor, getAffiliationBadgeVariant } from './affiliationUtils';

interface AffiliationItemProps {
  affiliation: RoomAffiliation;
}

export const AffiliationItem: React.FC<AffiliationItemProps> = ({ affiliation }) => {
  const IconComponent = getAffiliationIcon(affiliation.affiliation);
  const iconColor = getAffiliationIconColor(affiliation.affiliation);

  return (
    <div className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
      <div className="flex items-center space-x-2">
        <IconComponent className={`h-4 w-4 ${iconColor}`} />
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
  );
};
