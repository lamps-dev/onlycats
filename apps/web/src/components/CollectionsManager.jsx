import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import supabase from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { FolderPlus, Pencil, Trash2, X, ChevronRight, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const CollectionsManager = ({ userId, editable = false }) => {
  const { currentUser } = useAuth();
  const canEdit = editable && !!currentUser && currentUser.id === userId;

  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [itemsByCollection, setItemsByCollection] = useState({});
  const [itemsLoading, setItemsLoading] = useState({});

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', cover_url: '' });
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('id, name, description, cover_url, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCollections(data || []);
    } catch (err) {
      console.error('Load collections failed:', err);
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { if (userId) fetchCollections(); }, [userId, fetchCollections]);

  const fetchItems = useCallback(async (collectionId) => {
    setItemsLoading((m) => ({ ...m, [collectionId]: true }));
    try {
      const { data, error } = await supabase
        .from('collection_items')
        .select('content_id, added_at, content:content!inner(id, caption, file_url, creator_id)')
        .eq('collection_id', collectionId)
        .order('added_at', { ascending: false });
      if (error) throw error;
      setItemsByCollection((m) => ({ ...m, [collectionId]: data || [] }));
    } catch (err) {
      console.error('Load items failed:', err);
      toast.error('Failed to load items');
    } finally {
      setItemsLoading((m) => ({ ...m, [collectionId]: false }));
    }
  }, []);

  const toggleExpand = (id) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next && !itemsByCollection[next]) fetchItems(next);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', cover_url: '' });
    setEditorOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || '', cover_url: c.cover_url || '' });
    setEditorOpen(true);
  };

  const saveCollection = async () => {
    const name = form.name.trim();
    if (!name) { toast.error('Name is required'); return; }
    if (form.cover_url) {
      try { new URL(form.cover_url); } catch { toast.error('Cover URL is invalid'); return; }
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('collections')
          .update({ name, description: form.description.trim() || null, cover_url: form.cover_url.trim() || null })
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Collection updated');
      } else {
        const { error } = await supabase
          .from('collections')
          .insert({
            user_id: userId,
            name,
            description: form.description.trim() || null,
            cover_url: form.cover_url.trim() || null,
          });
        if (error) throw error;
        toast.success('Collection created');
      }
      setEditorOpen(false);
      fetchCollections();
    } catch (err) {
      console.error('Save collection failed:', err);
      toast.error(err.message || 'Failed to save collection');
    } finally {
      setSaving(false);
    }
  };

  const deleteCollection = async () => {
    if (!confirmDelete) return;
    try {
      const { error } = await supabase.from('collections').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      toast.success('Collection deleted');
      setConfirmDelete(null);
      setExpandedId((cur) => (cur === confirmDelete.id ? null : cur));
      fetchCollections();
    } catch (err) {
      console.error('Delete collection failed:', err);
      toast.error('Failed to delete collection');
    }
  };

  const removeItem = async (collectionId, contentId) => {
    try {
      const { error } = await supabase
        .from('collection_items')
        .delete()
        .eq('collection_id', collectionId)
        .eq('content_id', contentId);
      if (error) throw error;
      setItemsByCollection((m) => ({
        ...m,
        [collectionId]: (m[collectionId] || []).filter((r) => r.content_id !== contentId),
      }));
    } catch (err) {
      console.error('Remove item failed:', err);
      toast.error('Failed to remove from collection');
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading collections...</p>;
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <FolderPlus className="w-4 h-4 mr-1" />
            New collection
          </Button>
        </div>
      )}

      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canEdit ? 'No collections yet. Create your first one.' : 'No collections yet.'}
        </p>
      ) : (
        <div className="space-y-3">
          {collections.map((c) => {
            const expanded = expandedId === c.id;
            const items = itemsByCollection[c.id] || [];
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-3 flex-1 text-left"
                    onClick={() => toggleExpand(c.id)}
                  >
                    {c.cover_url ? (
                      <img src={c.cover_url} alt="" className="w-14 h-14 rounded-lg object-cover bg-muted" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      {c.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{c.description}</p>
                      )}
                    </div>
                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {canEdit && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(c)}
                        aria-label="Delete"
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {expanded && (
                  <div className="border-t px-4 py-3">
                    {itemsLoading[c.id] ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {canEdit ? 'Empty — use the bookmark on a post to add it here.' : 'No posts in this collection.'}
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {items.map((row) => {
                          const post = row.content;
                          if (!post) return null;
                          const isVideo = post.file_url && /\.(mp4|webm)(\?|$)/i.test(post.file_url);
                          return (
                            <div key={row.content_id} className="relative group aspect-square rounded-md overflow-hidden bg-muted">
                              <Link to={`/${post.creator_id}`} className="block w-full h-full">
                                {isVideo ? (
                                  <video src={post.file_url} className="w-full h-full object-cover" muted />
                                ) : (
                                  <img src={post.file_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                )}
                              </Link>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => removeItem(c.id, row.content_id)}
                                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  aria-label="Remove from collection"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={(v) => { if (!saving) setEditorOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit collection' : 'New collection'}</DialogTitle>
            <DialogDescription>Organize your posts into a named group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="col-name">Name</Label>
              <Input id="col-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={80} />
            </div>
            <div>
              <Label htmlFor="col-desc">Description</Label>
              <Textarea id="col-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} maxLength={300} />
            </div>
            <div>
              <Label htmlFor="col-cover">Cover image URL (optional)</Label>
              <Input id="col-cover" value={form.cover_url} onChange={(e) => setForm((f) => ({ ...f, cover_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditorOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveCollection} disabled={saving}>
              {saving ? 'Saving...' : (editing ? 'Save' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete collection?</DialogTitle>
            <DialogDescription>
              {confirmDelete ? `"${confirmDelete.name}" will be removed. The posts inside are not deleted.` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteCollection}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionsManager;
