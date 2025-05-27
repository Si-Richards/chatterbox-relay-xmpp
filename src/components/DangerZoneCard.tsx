
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface DangerZoneCardProps {
  onDeleteClick: () => void;
}

export const DangerZoneCard: React.FC<DangerZoneCardProps> = ({ onDeleteClick }) => {
  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-lg text-red-700">Danger Zone</CardTitle>
        <CardDescription className="text-red-600">
          Irreversible actions that will permanently affect this room
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={onDeleteClick}
          className="flex items-center space-x-2"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete Room</span>
        </Button>
      </CardContent>
    </Card>
  );
};
