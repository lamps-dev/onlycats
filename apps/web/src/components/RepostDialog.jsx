import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Repeat2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import supabase from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const QUOTE_MAX = 2000;
const OVERLAY_MAX = 200;

const RepostDialog = ({ open, onOpenChange, contentId, onReposted, onUnreposted }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [existing, setExisting] = useState(null);
  const [quote, setQuote] = useState('');
  const [overlay, setOverlay] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!open || !currentUser || !contentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('reposts')
          .select('id, quote_text, overlay_text')
          .eq('content_id', contentId)
          .eq('user_id', currentUser.id)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        setExisting(data ?? null);
        setQuote(data?.quote_text ?? '');
        setOverlay(data?.overlay_text ?? '');
      } catch (err) {
        console.error('Load repost failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, contentId, currentUser]);

  const handleSave = async () => {
    if (!isAuthenticated || !currentUser) {
      toast.error('Please login to repost');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        content_id: contentId,
        user_id: currentUser.id,
        quote_text: quote.trim() ? quote.trim() : null,
        overlay_text: overlay.trim() ? overlay.trim() : null,
      };
      if (existing) {
        const { error } = await supabase
          .from('reposts')
          .update({ quote_text: payload.quote_text, overlay_text: payload.overlay_text })
          .eq('id', existing.id);
        if (error) throw error;
        toast.success('Repost updated');
      } else {
        const { data, error } = await supabase
          .from('reposts')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setExisting({ id: data.id, quote_text: payload.quote_text, overlay_text: payload.overlay_text });
        toast.success('Reposted');
        onReposted?.();
      }
      onOpenChange(false);
    } catch (err) {
      console.error('Save repost failed:', err);
      toast.error(err.message || 'Failed to repost');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!existing) return;
    if (!window.confirm('Remove this repost?')) return;
    setRemoving(true);
    try {
      const { error } = await supabase.from('reposts').delete().eq('id', existing.id);
      if (error) throw error;
      setExisting(null);
      setQuote('');
      setOverlay('');
      toast.success('Repost removed');
      onUnreposted?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Remove repost failed:', err);
      toast.error(err.message || 'Failed to remove repost');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving && !removing) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat2 className="w-5 h-5" />
            {existing ? 'Edit repost' : 'Repost'}
          </DialogTitle>
          <DialogDescription>
            Share this to your followers. Add a quote or a short overlay that shows on top of the media.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="repost-quote">Quote (optional)</Label>
              <Textarea
                id="repost-quote"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                rows={3}
                maxLength={QUOTE_MAX}
                placeholder="Add your thoughts…"
                className="text-sm text-gray-900 placeholder:text-gray-500"
                disabled={saving || removing}
              />
              <p className="text-xs text-muted-foreground mt-1">{quote.length}/{QUOTE_MAX}</p>
            </div>
            <div>
              <Label htmlFor="repost-overlay">Text on media (optional)</Label>
              <Input
                id="repost-overlay"
                value={overlay}
                onChange={(e) => setOverlay(e.target.value)}
                maxLength={OVERLAY_MAX}
                placeholder="e.g. POV: I touch grass"
                className="text-sm text-gray-900 placeholder:text-gray-500"
                disabled={saving || removing}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Shown as a caption overlay on the post. {overlay.length}/{OVERLAY_MAX}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {existing && (
            <Button variant="destructive" onClick={handleRemove} disabled={saving || removing} className="mr-auto">
              <Trash2 className="w-4 h-4 mr-1" />
              {removing ? 'Removing…' : 'Remove repost'}
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving || removing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || removing || loading}>
            {saving ? 'Saving…' : existing ? 'Save' : 'Repost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RepostDialog;
