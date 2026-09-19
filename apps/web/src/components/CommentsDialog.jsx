import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import supabase from '@/lib/supabaseClient.js';
import StaffRoleBadge from '@/components/StaffRoleBadge.jsx';

// Comments are an archive now. OnlyCats is discontinued and read-only, so this
// dialog reads the existing thread and offers no way to add, edit, or remove
// anything in it.
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

const CommentNode = ({ node, depth }) => {
  const profile = node.profile || {};

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
            <p className="text-sm whitespace-pre-wrap break-words">{node.body}</p>
          </div>
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="space-y-0">
          {node.children.map((child) => (
            <CommentNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentsDialog = ({ open, onOpenChange, contentId }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

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
    else setRows([]);
  }, [open, load]);

  const tree = useMemo(() => buildTree(rows), [rows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[min(36rem,85vh)] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comments
          </DialogTitle>
          <DialogDescription>
            {rows.length === 0
              ? 'No comments on this post.'
              : `${rows.length} ${rows.length === 1 ? 'comment' : 'comments'}`}
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
                <CommentNode key={node.id} node={node} depth={0} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          <p>Commenting is closed. OnlyCats is discontinued.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsDialog;
