import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Heart, MessageSquare, Repeat2, DollarSign, Volume2, VolumeX, Play, Pencil,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import supabase from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import CommentsDialog from '@/components/CommentsDialog.jsx';
import RepostDialog from '@/components/RepostDialog.jsx';
import TipModal from '@/components/TipModal.jsx';
import StaffRoleBadge from '@/components/StaffRoleBadge.jsx';

const CAPTION_MAX_LEN = 2000;

const FeedItem = ({ item, muted, onToggleMute, onAutoplayBlocked }) => {
  const { content, creator, repost } = item;
  const { currentUser, isAuthenticated } = useAuth();
  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [paused, setPaused] = useState(false);

  const [likeCount, setLikeCount] = useState(content.like_count || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(content.comment_count || 0);
  const [repostCount, setRepostCount] = useState(content.repost_count || 0);
  const [hasReposted, setHasReposted] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  const fileUrl = content.file_url;
  const isVideo = fileUrl && /\.(mp4|webm)(\?|$)/i.test(fileUrl);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsActive(entry.intersectionRatio >= 0.6),
      { threshold: [0, 0.6, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo) return;
    if (isActive && !paused) {
      v.muted = muted;
      const p = v.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Browser blocked autoplay with sound — fall back to muted and retry.
          if (!v.muted) {
            v.muted = true;
            onAutoplayBlocked?.();
            v.play().catch(() => {});
          }
        });
      }
    } else {
      v.pause();
      if (!isActive) {
        try { v.currentTime = 0; } catch (_) { /* ignore */ }
      }
    }
  }, [isActive, paused, muted, isVideo, onAutoplayBlocked]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) { setIsLiked(false); setHasReposted(false); return; }
    let cancelled = false;
    (async () => {
      const [{ count: likeC }, { count: repostC }] = await Promise.all([
        supabase.from('likes').select('id', { head: true, count: 'exact' })
          .eq('user_id', currentUser.id).eq('content_id', content.id),
        supabase.from('reposts').select('id', { head: true, count: 'exact' })
          .eq('user_id', currentUser.id).eq('content_id', content.id),
      ]);
      if (cancelled) return;
      setIsLiked((likeC ?? 0) > 0);
      setHasReposted((repostC ?? 0) > 0);
    })();
    return () => { cancelled = true; };
  }, [content.id, isAuthenticated, currentUser]);

  const handleLike = async () => {
    if (!isAuthenticated || !currentUser) {
      toast.error('Please login to like content');
      return;
    }
    try {
      if (isLiked) {
        const { error } = await supabase.from('likes').delete()
          .eq('user_id', currentUser.id).eq('content_id', content.id);
        if (error) throw error;
        setIsLiked(false);
        setLikeCount((n) => Math.max(0, n - 1));
      } else {
        const { error } = await supabase.from('likes')
          .insert({ user_id: currentUser.id, content_id: content.id });
        if (error) throw error;
        setIsLiked(true);
        setLikeCount((n) => n + 1);
      }
    } catch (err) {
      console.error('Like toggle failed:', err);
      toast.error('Could not update like');
    }
  };

  const togglePaused = () => {
    if (!isVideo) return;
    setPaused((p) => !p);
  };

  const creatorName = creator?.display_name || 'Unknown Creator';
  const creatorId = creator?.id;
  const reposter = repost?.reposter;

  return (
    <section
      ref={rootRef}
      className="snap-start snap-always relative w-full h-[calc(100dvh-4rem)] bg-black overflow-hidden"
    >
      {fileUrl && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer select-none"
          onClick={togglePaused}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={fileUrl}
              className="w-full h-full object-contain"
              loop
              playsInline
              muted={muted}
              preload="metadata"
            />
          ) : (
            <img
              src={fileUrl}
              alt={content.caption || 'Cat content'}
              className="w-full h-full object-contain"
              loading="lazy"
              draggable={false}
            />
          )}

          {isVideo && paused && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
                <Play className="w-10 h-10 text-white" fill="white" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top-left: repost banner */}
      {repost && (
        <div className="absolute top-3 left-3 right-3 flex items-center gap-2 text-white text-sm bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 w-fit pointer-events-auto">
          <Repeat2 className="w-4 h-4" />
          <Link to={`/${reposter?.id ?? ''}`} className="hover:underline font-medium truncate">
            {reposter?.display_name || 'Someone'}
          </Link>
          <span className="opacity-80">reposted</span>
          {repost.created_at && (
            <span className="opacity-70 text-xs">
              · {formatDistanceToNow(new Date(repost.created_at), { addSuffix: true })}
            </span>
          )}
        </div>
      )}

      {/* Overlay text on media (reposts only) */}
      {repost?.overlay_text && (
        <div className="absolute inset-0 flex items-center justify-center px-6 pointer-events-none">
          <p
            className="text-white text-center font-black text-3xl sm:text-5xl leading-tight break-words max-w-full"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)' }}
          >
            {repost.overlay_text}
          </p>
        </div>
      )}

      {/* Mute toggle for video */}
      {isVideo && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onToggleMute?.(); }}
          className="absolute top-3 right-3 text-white hover:text-white hover:bg-white/20 bg-black/30 rounded-full"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
      )}

      {/* Right-side action rail */}
      <div className="absolute right-3 bottom-24 sm:bottom-10 flex flex-col items-center gap-4 z-10">
        <ActionButton
          icon={<Heart className={`w-6 h-6 ${isLiked ? 'fill-current text-pink-500' : 'text-white'}`} />}
          label={likeCount}
          onClick={handleLike}
          ariaLabel={isLiked ? 'Unlike' : 'Like'}
        />
        <ActionButton
          icon={<MessageSquare className="w-6 h-6 text-white" />}
          label={commentCount}
          onClick={() => setCommentsOpen(true)}
          ariaLabel="Comments"
        />
        <ActionButton
          icon={<Repeat2 className={`w-6 h-6 ${hasReposted ? 'text-green-400' : 'text-white'}`} />}
          label={repostCount}
          onClick={() => setRepostOpen(true)}
          ariaLabel="Repost"
        />
        <ActionButton
          icon={<DollarSign className="w-6 h-6 text-white" />}
          label={content.tip_count || 0}
          onClick={() => setTipOpen(true)}
          ariaLabel="Tip"
        />
      </div>

      {/* Bottom-left: creator + caption + repost quote */}
      <div className="absolute left-3 right-20 sm:right-24 bottom-4 z-10 text-white">
        <Link to={`/${creatorId}`} className="flex items-center gap-2 mb-2">
          <Avatar className="w-10 h-10 rounded-xl ring-2 ring-white/30">
            <AvatarImage src={creator?.avatar_url} alt="" />
            <AvatarFallback className="rounded-xl bg-primary text-primary-foreground">
              {creatorName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm truncate">{creatorName}</span>
            <StaffRoleBadge role={creator?.role} className="shrink-0" />
          </div>
        </Link>

        {repost?.quote_text && (
          <p className="text-sm mb-2 italic opacity-95 whitespace-pre-wrap break-words line-clamp-4">
            “{repost.quote_text}”
          </p>
        )}

        {content.caption && (
          <p className="text-sm whitespace-pre-wrap break-words line-clamp-4 opacity-95">
            {content.caption}
          </p>
        )}

        {content.created_at && (
          <p className="text-xs opacity-70 mt-1">
            {formatDistanceToNow(new Date(content.created_at), { addSuffix: true })}
          </p>
        )}
      </div>

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

      <TipModal
        isOpen={tipOpen}
        onClose={() => setTipOpen(false)}
        creatorId={creatorId}
        creatorName={creatorName}
      />
    </section>
  );
};

const ActionButton = ({ icon, label, onClick, ariaLabel }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    className="flex flex-col items-center gap-1 group"
    aria-label={ariaLabel}
  >
    <span className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/60 transition-colors">
      {icon}
    </span>
    <span className="text-xs text-white font-semibold tabular-nums drop-shadow">{label}</span>
  </button>
);

export default FeedItem;
