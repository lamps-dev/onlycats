import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import supabase from '@/lib/supabaseClient.js';
import { Heart, DollarSign, Users, MessageSquare, Repeat2 } from 'lucide-react';
import CommentsDialog from './CommentsDialog.jsx';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import StaffRoleBadge from '@/components/StaffRoleBadge.jsx';

const ContentCard = ({ content, creator, repost }) => {
  const [likeCount, setLikeCount] = useState(content.like_count || 0);
  const [captionText, setCaptionText] = useState(content.caption ?? '');
  const [likersOpen, setLikersOpen] = useState(false);
  const [likersLoading, setLikersLoading] = useState(false);
  const [likers, setLikers] = useState([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(content.comment_count || 0);
  const [repostCount, setRepostCount] = useState(content.repost_count || 0);

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
                <StaffRoleBadge role={creator?.role} isBot={creator?.is_bot} className="shrink-0" />
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
                  crossOrigin="anonymous"
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

          {captionText && (
            <div className="mb-3">
              <p className="text-sm line-clamp-3">{captionText}</p>
            </div>
          )}

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 px-2 py-1" title="Likes">
              <Heart className="w-4 h-4" />
              <span className="tabular-nums">{likeCount}</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-2"
              disabled={likeCount === 0}
              onClick={() => likeCount > 0 && setLikersOpen(true)}
              title={likeCount === 0 ? 'No likes yet' : 'See who liked this'}
            >
              <Users className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCommentsOpen(true)}
              aria-label="Comments"
              title="Read comments"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              {commentCount}
            </Button>
            <span className="inline-flex items-center gap-1.5 px-2 py-1" title="Reposts">
              <Repeat2 className="w-4 h-4" />
              <span className="tabular-nums">{repostCount}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1" title="Tips">
              <DollarSign className="w-4 h-4" />
              <span className="tabular-nums">{content.tip_count || 0}</span>
            </span>
          </div>
        </div>
      </Card>

      <CommentsDialog
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        contentId={content.id}
      />

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

    </>
  );
};

export default ContentCard;
