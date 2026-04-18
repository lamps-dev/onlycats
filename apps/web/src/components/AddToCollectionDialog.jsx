import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import supabase from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';

const AddToCollectionDialog = ({ open, onOpenChange, contentId }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collections, setCollections] = useState([]);
  const [memberIds, setMemberIds] = useState(new Set());
  const [initialMembers, setInitialMembers] = useState(new Set());

  useEffect(() => {
    if (!open || !currentUser || !contentId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [{ data: cols, error: colErr }, { data: items, error: itemErr }] = await Promise.all([
          supabase
            .from('collections')
            .select('id, name')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('collection_items')
            .select('collection_id, collections!inner(user_id)')
            .eq('content_id', contentId)
            .eq('collections.user_id', currentUser.id),
        ]);
        if (colErr) throw colErr;
        if (itemErr) throw itemErr;
        if (cancelled) return;
        setCollections(cols || []);
        const ids = new Set((items || []).map((r) => r.collection_id));
        setMemberIds(new Set(ids));
        setInitialMembers(new Set(ids));
      } catch (err) {
        console.error('Load collections failed:', err);
        toast.error('Failed to load collections');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, currentUser, contentId]);

  const toggle = (id) => {
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const toAdd = [...memberIds].filter((id) => !initialMembers.has(id));
      const toRemove = [...initialMembers].filter((id) => !memberIds.has(id));

      if (toAdd.length) {
        const rows = toAdd.map((cid) => ({ collection_id: cid, content_id: contentId }));
        const { error } = await supabase.from('collection_items').insert(rows);
        if (error) throw error;
      }
      for (const cid of toRemove) {
        const { error } = await supabase
          .from('collection_items')
          .delete()
          .eq('collection_id', cid)
          .eq('content_id', contentId);
        if (error) throw error;
      }
      toast.success('Updated collections');
      onOpenChange(false);
    } catch (err) {
      console.error('Save memberships failed:', err);
      toast.error(err.message || 'Failed to update collections');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save to collection</DialogTitle>
          <DialogDescription>Choose one or more of your collections.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don't have any collections yet. Create one from Settings → Profile.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2">
            {collections.map((c) => (
              <label key={c.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                <Checkbox checked={memberIds.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                <span className="text-sm font-medium">{c.name}</span>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading || collections.length === 0}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddToCollectionDialog;
