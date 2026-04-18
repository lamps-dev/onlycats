
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';
import { DollarSign } from 'lucide-react';

const TipModal = ({ isOpen, onClose, creatorId, creatorName }) => {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const amounts = [1, 5, 10, 25];

  const handleTip = async () => {
    if (!selectedAmount) {
      toast.error('Please select a tip amount');
      return;
    }

    setLoading(true);
    try {
      await pb.collection('tips').create({
        senderId: pb.authStore.model.id,
        creatorId: creatorId,
        amount: selectedAmount,
        message: message || '',
      }, { $autoCancel: false });

      toast.success(`Tipped $${selectedAmount} to ${creatorName}`);
      setSelectedAmount(null);
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Tip failed:', error);
      toast.error('Failed to send tip. Looks like this cat knocked your wallet off the table.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a Tip</DialogTitle>
          <DialogDescription>
            Support {creatorName} with a tip for their pawsome content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {amounts.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? 'default' : 'outline'}
                onClick={() => setSelectedAmount(amount)}
                className="h-16 text-lg"
              >
                <DollarSign className="w-5 h-5 mr-1" />
                {amount}
              </Button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Add a message (optional)</label>
            <Textarea
              placeholder="Leave a nice message for the creator..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleTip}
              disabled={!selectedAmount || loading}
              className="flex-1"
            >
              {loading ? 'Sending...' : `Send $${selectedAmount || 0}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TipModal;
