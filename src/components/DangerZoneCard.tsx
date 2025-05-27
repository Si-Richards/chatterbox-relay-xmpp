
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DangerZoneCardProps {
  onDeleteClick: () => void;
  roomName: string;
  canDelete: boolean;
}

export const DangerZoneCard: React.FC<DangerZoneCardProps> = ({ 
  onDeleteClick, 
  roomName,
  canDelete 
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const isConfirmationValid = confirmationText === roomName;

  const handleDeleteClick = () => {
    if (!canDelete) return;
    
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }
    
    if (isConfirmationValid) {
      onDeleteClick();
      setShowConfirmation(false);
      setConfirmationText('');
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setConfirmationText('');
  };

  if (!canDelete) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-lg text-red-700">Danger Zone</CardTitle>
          <CardDescription className="text-red-600">
            Room management actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-gray-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Only room owners can delete rooms</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-lg text-red-700">Danger Zone</CardTitle>
        <CardDescription className="text-red-600">
          Irreversible actions that will permanently affect this room
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showConfirmation ? (
          <Button
            variant="destructive"
            onClick={handleDeleteClick}
            className="flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Room</span>
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 border border-red-200 rounded-md bg-red-50">
              <p className="text-sm text-red-800 mb-2">
                This action cannot be undone. To confirm deletion, type the room name: <strong>{roomName}</strong>
              </p>
              <Label htmlFor="confirmation" className="text-sm font-medium">
                Room name confirmation
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={`Type "${roomName}" to confirm`}
                className="mt-1"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={!isConfirmationValid}
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Room</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
