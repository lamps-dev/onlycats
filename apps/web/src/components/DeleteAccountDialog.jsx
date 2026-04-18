import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import supabase from '@/lib/supabaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const DeleteAccountDialog = ({ open, onOpenChange, accountName }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const expected = `OnlyCats / ${accountName || ''}`;
  const canSubmit =
    password.length > 0 &&
    confirmation.trim() === expected &&
    accountName &&
    !loading;

  const reset = () => {
    setPassword('');
    setConfirmation('');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');

      const res = await apiServerClient.fetch('/account', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, confirmationText: confirmation.trim() }),
      });

      if (!res.ok) {
        let message = `Account deletion failed (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch (_) { /* ignore */ }
        throw new Error(message);
      }

      toast.success('Your account has been deleted.');
      reset();
      onOpenChange(false);
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Account deletion failed:', err);
      toast.error(err.message || 'Failed to delete account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (loading) return;
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete your account
          </DialogTitle>
          <DialogDescription>
            This permanently deletes your account, your profile, every post you've uploaded, and
            all uploaded files. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your current password"
              className="text-gray-900 placeholder:text-gray-500"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Type <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">{expected}</code> to confirm
            </label>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={expected}
              className="font-mono text-sm text-gray-900 placeholder:text-gray-500"
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? 'Deleting...' : 'Delete my account forever'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteAccountDialog;
