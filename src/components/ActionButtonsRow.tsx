
import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Users, Plus, Hash } from 'lucide-react';

interface ActionButtonsRowProps {
  onAddContact: () => void;
  onBrowseUsers: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export const ActionButtonsRow: React.FC<ActionButtonsRowProps> = ({
  onAddContact,
  onBrowseUsers,
  onCreateRoom,
  onJoinRoom
}) => {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddContact}
          className="flex-1"
          title="Add Contact"
        >
          <UserPlus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onBrowseUsers}
          className="flex-1"
          title="Browse Users"
        >
          <Users className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateRoom}
          className="flex-1"
          title="Create Room"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onJoinRoom}
          className="flex-1"
          title="Join Room"
        >
          <Hash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
