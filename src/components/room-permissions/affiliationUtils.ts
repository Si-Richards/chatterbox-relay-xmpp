
import { Crown, Shield, User, UserMinus } from 'lucide-react';

export const getAffiliationIcon = (affiliation: string) => {
  switch (affiliation) {
    case 'owner':
      return Crown;
    case 'admin':
      return Shield;
    case 'member':
      return User;
    default:
      return UserMinus;
  }
};

export const getAffiliationIconColor = (affiliation: string) => {
  switch (affiliation) {
    case 'owner':
      return 'text-yellow-600';
    case 'admin':
      return 'text-blue-600';
    case 'member':
      return 'text-green-600';
    default:
      return 'text-gray-400';
  }
};

export const getAffiliationBadgeVariant = (affiliation: string) => {
  switch (affiliation) {
    case 'owner':
      return 'default' as const;
    case 'admin':
      return 'secondary' as const;
    case 'member':
      return 'outline' as const;
    default:
      return 'outline' as const;
  }
};
