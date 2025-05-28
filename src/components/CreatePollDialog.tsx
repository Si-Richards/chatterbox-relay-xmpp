
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, BarChart3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CreatePollDialogProps {
  onCreatePoll: (pollData: {
    question: string;
    options: { text: string }[];
    isAnonymous: boolean;
    allowMultipleChoice: boolean;
    expiresAt?: Date;
  }) => void;
  children: React.ReactNode;
}

export const CreatePollDialog: React.FC<CreatePollDialogProps> = ({
  onCreatePoll,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultipleChoice, setAllowMultipleChoice] = useState(false);
  const [duration, setDuration] = useState('');

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = () => {
    if (!question.trim()) {
      toast({
        title: "Error",
        description: "Please enter a poll question",
        variant: "destructive"
      });
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      toast({
        title: "Error", 
        description: "Please add at least 2 options",
        variant: "destructive"
      });
      return;
    }

    let expiresAt: Date | undefined;
    if (duration) {
      const now = new Date();
      switch (duration) {
        case '1h':
          expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case '6h':
          expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);
          break;
        case '1d':
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '1w':
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    onCreatePoll({
      question: question.trim(),
      options: validOptions.map(text => ({ text: text.trim() })),
      isAnonymous,
      allowMultipleChoice,
      expiresAt
    });

    // Reset form
    setQuestion('');
    setOptions(['', '']);
    setIsAnonymous(false);
    setAllowMultipleChoice(false);
    setDuration('');
    setIsOpen(false);

    toast({
      title: "Poll Created",
      description: "Your poll has been sent to the chat"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Create Poll</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="question">Poll Question</Label>
            <Textarea
              id="question"
              placeholder="What would you like to ask?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="mt-1"
              maxLength={200}
            />
          </div>

          <div>
            <Label>Options</Label>
            <div className="space-y-2 mt-1">
              {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addOption}
                  className="w-full border-dashed border-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="anonymous">Anonymous votes</Label>
              <Switch
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="multiple">Allow multiple choice</Label>
              <Switch
                id="multiple"
                checked={allowMultipleChoice}
                onCheckedChange={setAllowMultipleChoice}
              />
            </div>

            <div>
              <Label htmlFor="duration">Poll Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="No expiration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No expiration</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="6h">6 hours</SelectItem>
                  <SelectItem value="1d">1 day</SelectItem>
                  <SelectItem value="1w">1 week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreatePoll}>
            Create Poll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
