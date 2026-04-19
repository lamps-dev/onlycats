import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Heart, DollarSign, Trash2, Bookmark, Pencil, Users, MessageSquare, Repeat2 } from 'lucide-react';
import TipModal from './TipModal.jsx';
import AddToCollectionDialog from './AddToCollectionDialog.jsx';
import CommentsDialog from './CommentsDialog.jsx';
import RepostDialog from './RepostDialog.jsx';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { formatDistanceToNow } from 'date-fns';
import StaffRoleBadge from '@/components/StaffRoleBadge.jsx';

const CAPTION_MAX_LEN = 2000;

const ContentCard = ({ content, creator, repost, onDelete, onCaptionChange }) => {
  const { currentUser, isAuthenticated, isModerator, isOwner } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(content.like_count || 0);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [captionText, setCaptionText] = useState(content.caption ?? '');
  const [captionEditOpen, setCaptionEditOpen] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [likersLoading, setLikersLoading] = useState(false);
  const [likers, setLikers] = useState([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(content.comment_count || 0);
  const [repostOpen, setRepostOpen] = useState(false);
  const [repostCount, setRepostCount] = useState(content.repost_count || 0);
  const [hasReposted, setHasReposted] = useState(false);

  useEffect(() => {
    setCaptionText(content.caption ?? '');
  }, [content.id, content.caption]);

  useEffect(() => {
    setLikeCount(content.like_count || 0);
  }, [content.id, content.like_count]);

  useEffect(() => {
    setCommentCount(content.comment_count || 0);
  }, [content.id, content.comment_count]);

  useEffect(() => {
    setRepostCount(content.repost_count || 0);
  }, [content.id, content.repost_count]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setHasReposted(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('reposts')
      .select('id', { head: true, count: 'exact' })
      .eq('user_id', currentUser.id)
      .eq('content_id', content.id)
      .then(({ count }) => {
        if (!cancelled) setHasReposted((count ?? 0) > 0);
      });
    return () => { cancelled = true; };
  }, [content.id, isAuthenticated, currentUser]);

  useEffect(() => {
    if (!likersOpen) return;
    let cancelled = false;
    (async () => {
      setLikersLoading(true);
      try {
        const { data: likeRows, error: likesErr } = await supabase
          .from('likes')
          .select('user_id, created_at')
          .eq('content_id', content.id)
          .order('created_at', { ascending: false })
          .limit(200);
        if (likesErr) throw likesErr;
        const rows = likeRows ?? [];
        const ids = [...new Set(rows.map((r) => r.user_id))];
        if (ids.length === 0) {
          if (!cancelled) setLikers([]);
          return;
        }
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, role')
          .in('id', ids);
        if (profErr) throw profErr;
        const byId = new Map((profs ?? []).map((p) => [p.id, p]));
        if (!cancelled) {
          setLikers(
            rows
              .map((r) => {
                const profile = byId.get(r.user_id);
                if (!profile) return null;
                return { profile, likedAt: r.created_at };
              })
              .filter(Boolean),
          );
        }
      } catch (err) {
        console.error('Failed to load likers:', err);
        if (!cancelled) {
          setLikers([]);
          toast.error('Could not load who liked this post');
        }
      } finally {
        if (!cancelled) setLikersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [likersOpen, content.id, likeCount]);

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

  const openCaptionEdit = () => {
    setCaptionDraft(captionText);
    setCaptionEditOpen(true);
  };

  const handleSaveCaption = async () => {
    if (!isPostOwner || !currentUser) return;
    const trimmed = captionDraft.trim();
    if (trimmed.length > CAPTION_MAX_LEN) {
      toast.error(`Caption is too long (max ${CAPTION_MAX_LEN} characters)`);
      return;
    }
    setSavingCaption(true);
    try {
      const value = trimmed.length > 0 ? trimmed : null;
      const { error } = await supabase
        .from('content')
        .update({ caption: value })
        .eq('id', content.id)
        .eq('creator_id', currentUser.id);
      if (error) throw error;
      setCaptionText(value ?? '');
      onCaptionChange?.(content.id, value);
      toast.success('Caption updated');
      setCaptionEditOpen(false);
    } catch (err) {
      console.error('Caption update failed:', err);
      toast.error(err.message || 'Failed to update caption');
    } finally {
      setSavingCaption(false);
    }
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
          {repost && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Repeat2 className="w-3.5 h-3.5" />
              <span>
                {repost.reposter_name ? `${repost.reposter_name} reposted` : 'Reposted'}
                {repost.created_at && ` · ${formatDistanceToNow(new Date(repost.created_at), { addSuffix: true })}`}
              </span>
            </div>
          )}

          <Link to={`/${creatorId}`} className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10 rounded-xl">
              <AvatarImage src={avatarUrl} alt={creatorName || 'Creator'} />
              <AvatarFallback className="rounded-xl bg-primary text-primary-foreground">
                {creatorName?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="font-semibold text-sm truncate flex-1 min-w-0">
                  {creatorName || 'Unknown Creator'}
                </p>
                <StaffRoleBadge role={creator?.role} className="shrink-0" />
              </div>
              {content.created_at && (
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(content.created_at), { addSuffix: true })}
                </p>
              )}
            </div>
          </Link>

          {repost?.quote_text && (
            <p className="text-sm italic text-foreground/90 mb-3 whitespace-pre-wrap">
              {repost.quote_text}
            </p>
          )}

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
              {repost?.overlay_text && (
                <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                  <p
                    className="text-white text-center text-xl font-bold leading-tight break-words"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)' }}
                  >
                    {repost.overlay_text}
                  </p>
                </div>
              )}
            </div>
          )}

          {(captionText || isPostOwner) && (
            <div className="mb-3 flex items-start gap-2">
              <p className={`text-sm flex-1 min-w-0 ${captionText ? 'line-clamp-3' : 'text-muted-foreground italic'}`}>
                {captionText || (isPostOwner ? 'No caption — add one' : '')}
              </p>
              {isPostOwner && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={openCaptionEdit}
                  aria-label="Edit caption"
                  title="Edit caption"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant={isLiked ? 'default' : 'ghost'}
                size="sm"
                onClick={handleLike}
                className="transition-all"
                aria-label={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="tabular-nums px-2 text-muted-foreground"
                disabled={likeCount === 0}
                onClick={() => likeCount > 0 && setLikersOpen(true)}
                aria-label={likeCount === 0 ? 'No likes yet' : `See ${likeCount} likes`}
                title={likeCount === 0 ? 'No likes yet' : 'See who liked this'}
              >
                {likeCount}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCommentsOpen(true)}
                aria-label="Comments"
                title="Comments"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                {commentCount}
              </Button>
              <Button
                variant={hasReposted ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setRepostOpen(true)}
                disabled={!isAuthenticated}
                aria-label={hasReposted ? 'Edit repost' : 'Repost'}
                title={hasReposted ? 'Edit repost' : 'Repost'}
              >
                <Repeat2 className="w-4 h-4 mr-1" />
                {repostCount}
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

      <CommentsDialog
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        contentId={content.id}
        onCountChange={(fn) => setCommentCount((n) => fn(n))}
      />

      <RepostDialog
        open={repostOpen}
        onOpenChange={setRepostOpen}
        contentId={content.id}
        onReposted={() => { setHasReposted(true); setRepostCount((n) => n + 1); }}
        onUnreposted={() => { setHasReposted(false); setRepostCount((n) => Math.max(0, n - 1)); }}
      />

      {isPostOwner && (
        <AddToCollectionDialog
          open={collectionOpen}
          onOpenChange={setCollectionOpen}
          contentId={content.id}
        />
      )}

      <Dialog open={likersOpen} onOpenChange={setLikersOpen}>
        <DialogContent className="max-w-md max-h-[min(28rem,70vh)] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Liked by
            </DialogTitle>
            <DialogDescription>
              {likeCount === 0
                ? 'No one has liked this post yet.'
                : `${likeCount} ${likeCount === 1 ? 'person' : 'people'} liked this post.`}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 -mx-1 px-1">
            {likersLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
            ) : likers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No likes to show.</p>
            ) : (
              <ul className="space-y-2">
                {likers.map(({ profile, likedAt }) => (
                  <li key={`${profile.id}-${likedAt}`}>
                    <Link
                      to={`/${profile.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/80 transition-colors"
                      onClick={() => setLikersOpen(false)}
                    >
                      <Avatar className="w-9 h-9 rounded-xl shrink-0">
                        <AvatarImage src={profile.avatar_url} alt="" />
                        <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-sm">
                          {profile.display_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm truncate">{profile.display_name || 'Member'}</span>
                          <StaffRoleBadge role={profile.role} className="shrink-0" />
                        </div>
                        {likedAt && (
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(likedAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={captionEditOpen} onOpenChange={(open) => { if (!savingCaption) setCaptionEditOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit caption</DialogTitle>
            <DialogDescription>
              Update the text shown under your post. Leave empty to remove the caption.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={captionDraft}
            onChange={(e) => setCaptionDraft(e.target.value)}
            rows={4}
            maxLength={CAPTION_MAX_LEN}
            className="text-gray-900 placeholder:text-gray-500"
            placeholder="Write a caption..."
            disabled={savingCaption}
          />
          <p className="text-xs text-muted-foreground">{captionDraft.length}/{CAPTION_MAX_LEN}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCaptionEditOpen(false)} disabled={savingCaption}>
              Cancel
            </Button>
            <Button onClick={handleSaveCaption} disabled={savingCaption}>
              {savingCaption ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
