
import React from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronRight, ArrowUpDown, Clock, Type } from 'lucide-react';

interface ContactsHeaderProps {
  isCollapsed: boolean;
  contactCount: number;
  contactSortMethod: 'newest' | 'alphabetical';
  onToggleCollapse: () => void;
  onSortMethodChange: (method: 'newest' | 'alphabetical') => void;
}

export const ContactsHeader: React.FC<ContactsHeaderProps> = ({
  isCollapsed,
  contactCount,
  contactSortMethod,
  onToggleCollapse,
  onSortMethodChange
}) => {
  return (
    <div className="flex items-center justify-between">
      <CollapsibleTrigger className="flex items-center text-xs font-medium text-gray-500 px-2 py-1 hover:bg-gray-100 rounded">
        {isCollapsed ? <ChevronRight className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
        Contacts ({contactCount})
      </CollapsibleTrigger>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onSortMethodChange('newest')}>
            <Clock className="h-4 w-4 mr-2" />
            Sort by Recent
            {contactSortMethod === 'newest' && ' ✓'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortMethodChange('alphabetical')}>
            <Type className="h-4 w-4 mr-2" />
            Sort Alphabetically
            {contactSortMethod === 'alphabetical' && ' ✓'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
