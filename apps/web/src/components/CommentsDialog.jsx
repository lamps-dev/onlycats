import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Reply, Trash2, Pencil, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import supabase from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import StaffRoleBadge from '@/components/StaffRoleBadge.jsx';

const MAX_LEN = 2000;
const COMMENT_COOLDOWN_MS = 10_000;

const buildTree = (rows) => {
  const byId = new Map();
  const roots = [];
  for (const row of rows) byId.set(row.id, { ...row, children: [] });
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortAsc = (a, b) => new Date(a.created_at) - new Date(b.created_at);
  roots.sort(sortAsc);
  for (const node of byId.values()) node.children.sort(sortAsc);
  return roots;
};

const CommentNode = ({ node, depth, onReply, onDelete, onEdit, currentUserId, canModerate }) => {
  const profile = node.profile || {};
  const isOwn = node.user_id === currentUserId;
  const canDelete = isOwn || canModerate;
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(node.body);
  const [savingEdit, setSavingEdit] = useState(false);

  const submitReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    setSubmittingReply(true);
    try {
      await onReply(node.id, trimmed);
      setReplyText('');
      setReplying(false);
    } finally {
      setSubmittingReply(false);
    }
  };

  const submitEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === node.body) { setEditing(false); return; }
    setSavingEdit(true);
    try {
      await onEdit(node.id, trimmed);
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className={depth === 0 ? '' : 'pl-4 border-l border-border ml-2'}>
      <div className="flex gap-2 py-2">
        <Link to={`/${profile.id}`} className="shrink-0">
          <Avatar className="w-8 h-8 rounded-xl">
            <AvatarImage src={profile.avatar_url} alt="" />
            <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-xs">
              {profile.display_name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="bg-muted/50 rounded-xl px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <Link to={`/${profile.id}`} className="font-semibold text-xs hover:underline truncate">
                {profile.display_name || 'Member'}
              </Link>
              <StaffRoleBadge role={profile.role} className="shrink-0" />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(node.created_at), { addSuffix: true })}
                {node.edited_at && ' · edited'}
              </span>
            </div>
            {editing ? (
              <div className="space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  maxLength={MAX_LEN}
                  rows={2}
                  className="text-sm text-gray-900 placeholder:text-gray-500"
                  disabled={savingEdit}
                />
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditText(node.body); }} disabled={savingEdit}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={submitEdit} disabled={savingEdit || !editText.trim()}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words">{node.body}</p>
            )}
          </div>
          {!editing && (
            <div className="flex items-center gap-2 mt-1 text-xs">
              {currentUserId && (
                <button type="button" onClick={() => setReplying((v) => !v)} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                  <Reply className="w-3 h-3" /> Reply
                </button>
              )}
              {isOwn && (
                <button type="button" onClick={() => { setEditing(true); setEditText(node.body); }} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              )}
              {canDelete && (
                <button type="button" onClick={() => onDelete(node)} className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              )}
            </div>
          )}
          {replying && (
            <div className="mt-2 space-y-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={MAX_LEN}
                rows={2}
                placeholder={`Reply to ${profile.display_name || 'this comment'}…`}
                className="text-sm text-gray-900 placeholder:text-gray-500"
                disabled={submittingReply}
              />
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setReplying(false); setReplyText(''); }} disabled={submittingReply}>
                  Cancel
                </Button>
                <Button size="sm" onClick={submitReply} disabled={submittingReply || !replyText.trim()}>
                  {submittingReply ? 'Posting…' : 'Reply'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="space-y-0">
          {node.children.map((child) => (
            <CommentNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
              currentUserId={currentUserId}
              canModerate={canModerate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentsDialog = ({ open, onOpenChange, contentId, onCountChange }) => {
  const { currentUser, isAuthenticated, isModerator, isOwner } = useAuth();
  const canModerate = isModerator || isOwner;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [nextCommentAt, setNextCommentAt] = useState(0);

  const load = useCallback(async () => {
    if (!contentId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('id, content_id, user_id, parent_id, body, edited_at, created_at')
        .eq('content_id', contentId)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      const comments = data ?? [];
      const ids = [...new Set(comments.map((c) => c.user_id))];
      let byId = new Map();
      if (ids.length) {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, role')
          .in('id', ids);
        if (profErr) throw profErr;
        byId = new Map((profs ?? []).map((p) => [p.id, p]));
      }
      setRows(comments.map((c) => ({ ...c, profile: byId.get(c.user_id) })));
    } catch (err) {
      console.error('Load comments failed:', err);
      toast.error('Could not load comments');
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    if (open) load();
    else { setRows([]); setDraft(''); }
  }, [open, load]);

  const tree = useMemo(() => buildTree(rows), [rows]);

  const insertComment = async (parentId, body) => {
    if (!isAuthenticated || !currentUser) {
      toast.error('Please login to comment');
      return;
    }
    const trimmed = body.trim();
    if (!trimmed) return;
    if (Date.now() < nextCommentAt) {
      const waitSeconds = Math.max(1, Math.ceil((nextCommentAt - Date.now()) / 1000));
      toast.error(`Please wait ${waitSeconds}s before commenting again.`);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ content_id: contentId, user_id: currentUser.id, parent_id: parentId ?? null, body: trimmed })
        .select('id, content_id, user_id, parent_id, body, edited_at, created_at')
        .single();
      if (error) throw error;
      const newRow = {
        ...data,
        profile: {
          id: currentUser.id,
          display_name: currentUser.display_name,
          avatar_url: currentUser.avatar_url,
          role: currentUser.role,
        },
      };
      setRows((r) => [...r, newRow]);
      setNextCommentAt(Date.now() + COMMENT_COOLDOWN_MS);
      onCountChange?.((n) => n + 1);
    } catch (err) {
      console.error('Post comment failed:', err);
      if (err?.message?.toLowerCase().includes('between comments')) {
        toast.error('You are commenting too quickly. Please wait a few seconds.');
      } else {
        toast.error(err.message || 'Failed to post comment');
      }
    }
  };

  const handleTopLevelSubmit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setPosting(true);
    try {
      await insertComment(null, trimmed);
      setDraft('');
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (parentId, body) => {
    await insertComment(parentId, body);
  };

  const handleEdit = async (id, body) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ body, edited_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setRows((r) => r.map((c) => (c.id === id ? { ...c, body, edited_at: new Date().toISOString() } : c)));
    } catch (err) {
      console.error('Edit comment failed:', err);
      toast.error(err.message || 'Failed to edit comment');
    }
  };

  const countDescendants = (id) => {
    let n = 1;
    for (const r of rows) if (r.parent_id === id) n += countDescendants(r.id);
    return n;
  };

  const handleDelete = async (node) => {
    if (!window.confirm('Delete this comment and its replies?')) return;
    const removed = countDescendants(node.id);
    try {
      const { error } = await supabase.from('comments').delete().eq('id', node.id);
      if (error) throw error;
      setRows((r) => {
        const doomed = new Set([node.id]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const c of r) {
            if (c.parent_id && doomed.has(c.parent_id) && !doomed.has(c.id)) {
              doomed.add(c.id);
              changed = true;
            }
          }
        }
        return r.filter((c) => !doomed.has(c.id));
      });
      onCountChange?.((n) => Math.max(0, n - removed));
    } catch (err) {
      console.error('Delete comment failed:', err);
      toast.error(err.message || 'Failed to delete comment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[min(36rem,85vh)] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comments
          </DialogTitle>
          <DialogDescription>
            {rows.length === 0 ? 'Be the first to comment.' : `${rows.length} ${rows.length === 1 ? 'comment' : 'comments'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 -mx-1 px-1">
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : tree.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No comments yet.</p>
          ) : (
            <div className="space-y-1">
              {tree.map((node) => (
                <CommentNode
                  key={node.id}
                  node={node}
                  depth={0}
                  onReply={handleReply}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  currentUserId={currentUser?.id}
                  canModerate={canModerate}
                />
              ))}
            </div>
          )}
        </div>

        {isAuthenticated ? (
          <div className="border-t pt-3 space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_LEN}
              rows={2}
              placeholder="Add a comment…"
              className="text-sm text-gray-900 placeholder:text-gray-500"
              disabled={posting}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{draft.length}/{MAX_LEN}</p>
              <Button size="sm" onClick={handleTopLevelSubmit} disabled={posting || !draft.trim()}>
                {posting ? 'Posting…' : 'Comment'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t pt-3 text-center">
            <p className="text-sm text-muted-foreground">Log in to comment.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CommentsDialog;
