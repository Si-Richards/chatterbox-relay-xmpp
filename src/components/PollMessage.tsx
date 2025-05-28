
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BarChart3, Clock, Users, Check, X } from 'lucide-react';
import { PollData } from '@/store/types';

interface PollMessageProps {
  pollData: PollData;
  currentUser: string;
  onVote: (optionIds: string[]) => void;
  onClosePoll?: () => void;
  isOwner: boolean;
}

export const PollMessage: React.FC<PollMessageProps> = ({
  pollData,
  currentUser,
  onVote,
  onClosePoll,
  isOwner
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Check if user has already voted
  useEffect(() => {
    const userVoted = pollData.options.some(option => 
      option.votes.includes(currentUser)
    );
    setHasVoted(userVoted);

    if (userVoted) {
      const votedOptions = pollData.options
        .filter(option => option.votes.includes(currentUser))
        .map(option => option.id);
      setSelectedOptions(votedOptions);
    }
  }, [pollData, currentUser]);

  // Update time left
  useEffect(() => {
    if (!pollData.expiresAt) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const expires = new Date(pollData.expiresAt!);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`);
      } else {
        setTimeLeft(`${minutes}m left`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [pollData.expiresAt]);

  const handleOptionToggle = (optionId: string) => {
    if (hasVoted || pollData.isClosed || isExpired()) return;

    if (pollData.allowMultipleChoice) {
      setSelectedOptions(prev => 
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleVote = () => {
    if (selectedOptions.length === 0) return;
    onVote(selectedOptions);
  };

  const isExpired = () => {
    if (!pollData.expiresAt) return false;
    return new Date() > new Date(pollData.expiresAt);
  };

  const canVote = !hasVoted && !pollData.isClosed && !isExpired();
  const showResults = hasVoted || pollData.isClosed || isExpired();

  const getOptionPercentage = (option: any) => {
    if (pollData.totalVotes === 0) return 0;
    return Math.round((option.votes.length / pollData.totalVotes) * 100);
  };

  return (
    <Card className="p-4 space-y-3 max-w-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">Poll</span>
        </div>
        <div className="flex items-center space-x-2">
          {pollData.isClosed && (
            <Badge variant="secondary">Closed</Badge>
          )}
          {isExpired() && (
            <Badge variant="destructive">Expired</Badge>
          )}
          {pollData.isAnonymous && (
            <Badge variant="outline">Anonymous</Badge>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-gray-900">{pollData.question}</h3>

      <div className="space-y-2">
        {pollData.options.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          const percentage = getOptionPercentage(option);
          const userVotedThis = option.votes.includes(currentUser);

          return (
            <div key={option.id} className="space-y-1">
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  canVote
                    ? isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    : userVotedThis
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                } ${!canVote ? 'cursor-default' : ''}`}
                onClick={() => handleOptionToggle(option.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{option.text}</span>
                  <div className="flex items-center space-x-2">
                    {showResults && (
                      <span className="text-xs text-gray-500">{percentage}%</span>
                    )}
                    {userVotedThis && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                </div>
                {showResults && (
                  <div className="mt-2">
                    <Progress value={percentage} className="h-1" />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {option.votes.length} vote{option.votes.length !== 1 ? 's' : ''}
                      </span>
                      {!pollData.isAnonymous && option.votes.length > 0 && (
                        <div className="flex -space-x-1">
                          {option.votes.slice(0, 3).map((voterJid, index) => (
                            <Avatar key={index} className="h-4 w-4 border border-white">
                              <AvatarFallback className="text-xs">
                                {voterJid.split('@')[0][0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {option.votes.length > 3 && (
                            <span className="text-xs text-gray-500 ml-1">
                              +{option.votes.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span>{pollData.totalVotes} vote{pollData.totalVotes !== 1 ? 's' : ''}</span>
          </div>
          {pollData.expiresAt && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{timeLeft}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {canVote && selectedOptions.length > 0 && (
            <Button size="sm" onClick={handleVote}>
              Vote
            </Button>
          )}
          {isOwner && !pollData.isClosed && !isExpired() && (
            <Button
              size="sm"
              variant="outline"
              onClick={onClosePoll}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-3 w-3 mr-1" />
              Close
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
