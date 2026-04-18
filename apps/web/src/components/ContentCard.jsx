import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import supabase from '@/lib/supabaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { Heart, DollarSign, Trash2, Bookmark } from 'lucide-react';
import TipModal from './TipModal.jsx';
import AddToCollectionDialog from './AddToCollectionDialog.jsx';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { formatDistanceToNow } from 'date-fns';

const ContentCard = ({ content, creator, onDelete }) => {
  const { currentUser, isAuthenticated, isModerator, isOwner } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(content.like_count || 0);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const postOwnerId = content.creator_id ?? creator?.id;
  const isPostOwner = !!(currentUser && postOwnerId && currentUser.id === postOwnerId);
  const canDelete = isPostOwner || isModerator || isOwner;
  const isModerating = canDelete && !isPostOwner; // mod/owner deleting someone else's post

  const ownerDisplayName = creator?.display_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || '';
  const expectedConfirmation = isModerating
    ? 'OnlyCats / moderate'
    : `OnlyCats / ${ownerDisplayName}`;
  const canConfirmDelete = deleteConfirm.trim() === expectedConfirmation && !deleting;

  const openDeleteDialog = () => {
    setDeleteConfirm('');
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!canDelete || !canConfirmDelete) return;

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');

      const res = await apiServerClient.fetch(`/uploads/content/${content.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        let message = `Delete failed (${res.status})`;
        let details = '';
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
          if (body?.code) details = body.code;
        } catch (_) { /* ignore */ }
        const err = new Error(message);
        err.details = details;
        throw err;
      }

      toast.success('Post deleted');
      setDeleteOpen(false);
      onDelete?.(content.id);
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error(err.message || 'Failed to delete post. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setIsLiked(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('likes')
      .select('id', { head: true, count: 'exact' })
      .eq('user_id', currentUser.id)
      .eq('content_id', content.id)
      .then(({ count }) => {
        if (!cancelled) setIsLiked((count ?? 0) > 0);
      });
    return () => { cancelled = true; };
  }, [content.id, isAuthenticated, currentUser]);

  const handleLike = async () => {
    if (!isAuthenticated || !currentUser) {
      toast.error('Please login to like content');
      return;
    }

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('content_id', content.id);
        if (error) throw error;
        setIsLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: currentUser.id, content_id: content.id });
        if (error) throw error;
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Like toggle failed:', err);
      toast.error('This cat is feeling finicky. Try again.');
    }
  };

  const fileUrl = content.file_url;
  const avatarUrl = creator?.avatar_url;
  const creatorName = creator?.display_name;
  const creatorId = creator?.id;

  const isVideo = fileUrl && /\.(mp4|webm)(\?|$)/i.test(fileUrl);

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200">
        <div className="p-4">
          <Link to={`/${creatorId}`} className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10 rounded-xl">
              <AvatarImage src={avatarUrl} alt={creatorName || 'Creator'} />
              <AvatarFallback className="rounded-xl bg-primary text-primary-foreground">
                {creatorName?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{creatorName || 'Unknown Creator'}</p>
              {content.created_at && (
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(content.created_at), { addSuffix: true })}
                </p>
              )}
            </div>
          </Link>

          {fileUrl && (
            <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-muted">
              {isVideo ? (
                <video
                  src={fileUrl}
                  controls
                  className="w-full h-full object-cover"
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={fileUrl}
                  alt={content.caption || 'Cat content'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
          )}

          {content.caption && (
            <p className="text-sm mb-3 line-clamp-3">{content.caption}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={isLiked ? 'default' : 'ghost'}
                size="sm"
                onClick={handleLike}
                className="transition-all"
              >
                <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                {likeCount}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTipModalOpen(true)}
                disabled={!isAuthenticated}
              >
                <DollarSign className="w-4 h-4 mr-1" />
                {content.tip_count || 0}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              {isPostOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCollectionOpen(true)}
                  aria-label="Save to collection"
                  title="Save to collection"
                >
                  <Bookmark className="w-4 h-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openDeleteDialog}
                  disabled={deleting}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label={isModerating ? 'Remove post (moderation)' : 'Delete post'}
                  title={isModerating ? 'Remove post (moderation)' : 'Delete post'}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <TipModal
        isOpen={tipModalOpen}
        onClose={() => setTipModalOpen(false)}
        creatorId={creatorId}
        creatorName={creatorName}
      />

      {isPostOwner && (
        <AddToCollectionDialog
          open={collectionOpen}
          onOpenChange={setCollectionOpen}
          contentId={content.id}
        />
      )}

      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!deleting) setDeleteOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isModerating ? 'Remove this post (moderation)' : 'Delete this post?'}</DialogTitle>
            <DialogDescription>
              {isModerating
                ? `You are removing a post by ${creator?.display_name || 'another user'} as a moderator. This permanently removes the post and its uploaded file. This action is logged.`
                : 'This permanently removes the post and its uploaded file. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Type <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">{expectedConfirmation}</code> to confirm.
            </p>
            <Input
              autoFocus
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={expectedConfirmation}
              className="font-mono text-sm text-gray-900 placeholder:text-gray-500"
              disabled={deleting}
            />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canConfirmDelete}
            >
              {deleting ? (isModerating ? 'Removing...' : 'Deleting...') : (isModerating ? 'Remove post' : 'Delete post')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContentCard;
