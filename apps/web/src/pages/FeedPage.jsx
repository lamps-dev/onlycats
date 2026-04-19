import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Header from '@/components/Header.jsx';
import FeedItem from '@/components/FeedItem.jsx';
import ContentUpload from '@/components/ContentUpload.jsx';
import supabase from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Heart, RefreshCw, AlertCircle, Plus } from 'lucide-react';

const mergeSorted = (posts, reposts) => {
  const postItems = posts.map((p) => ({
    key: `post:${p.id}`,
    sortAt: p.created_at,
    content: p,
    creator: p.creator,
    repost: null,
  }));
  const repostItems = reposts
    .filter((r) => r.content) // guard against deleted originals
    .map((r) => ({
      key: `repost:${r.id}`,
      sortAt: r.created_at,
      content: r.content,
      creator: r.content.creator,
      repost: {
        id: r.id,
        quote_text: r.quote_text,
        overlay_text: r.overlay_text,
        created_at: r.created_at,
        reposter: r.reposter,
      },
    }));
  return [...postItems, ...repostItems].sort(
    (a, b) => new Date(b.sortAt) - new Date(a.sortAt),
  );
};

const FeedPage = () => {
  const { currentUser } = useAuth();
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const autoRefreshInterval = useRef(null);

  const fetchFeed = useCallback(async (silent = false) => {
    if (!currentUser) return;
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const { data: follows, error: followsErr } = await supabase
        .from('followers')
        .select('creator_id')
        .eq('user_id', currentUser.id);
      if (followsErr) throw followsErr;

      const creatorIds = (follows ?? []).map((f) => f.creator_id);
      if (creatorIds.length === 0) {
        setFeedItems([]);
        setLoading(false);
        return;
      }

      const [postsRes, repostsRes] = await Promise.all([
        supabase
          .from('content')
          .select('id, caption, file_url, like_count, tip_count, comment_count, repost_count, created_at, creator_id, creator:profiles!creator_id(id, display_name, avatar_url, role, is_bot)')
          .in('creator_id', creatorIds)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('reposts')
          .select('id, quote_text, overlay_text, created_at, user_id, reposter:profiles!user_id(id, display_name, avatar_url, role, is_bot), content:content!content_id(id, caption, file_url, like_count, tip_count, comment_count, repost_count, created_at, creator_id, creator:profiles!creator_id(id, display_name, avatar_url, role, is_bot))')
          .in('user_id', creatorIds)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (postsRes.error) throw postsRes.error;
      if (repostsRes.error) throw repostsRes.error;

      setFeedItems(mergeSorted(postsRes.data ?? [], repostsRes.data ?? []));
      setError(null);
    } catch (err) {
      console.error('Failed to fetch feed:', err);
      setError('Failed to load feed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchFeed();
    autoRefreshInterval.current = setInterval(() => fetchFeed(true), 30000);
    return () => clearInterval(autoRefreshInterval.current);
  }, [fetchFeed]);

  return (
    <>
      <Helmet>
        <title>Feed - OnlyCats</title>
        <meta name="description" content="Scroll the latest cat content from creators you follow on OnlyCats." />
      </Helmet>

      <Header />

      <main className="relative">
        {/* Top controls floating over scroller */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          {currentUser && (
            <Button size="sm" onClick={() => setUploadOpen(true)} className="shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Upload
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => fetchFeed()} disabled={loading} className="shadow-lg">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="container mx-auto px-4 pt-4">
            <div className="max-w-lg mx-auto p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={() => fetchFeed()}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="h-[calc(100dvh-4rem)] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : feedItems.length === 0 ? (
          <div className="h-[calc(100dvh-4rem)] flex items-center justify-center px-4">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Your feed is empty</h2>
              <p className="text-muted-foreground mb-6">
                Follow some creators to see their content here.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="h-[calc(100dvh-4rem)] overflow-y-scroll snap-y snap-mandatory bg-black"
            style={{ scrollbarWidth: 'none' }}
          >
            {feedItems.map((item) => (
              <FeedItem
                key={item.key}
                item={item}
                muted={muted}
                onToggleMute={() => setMuted((m) => !m)}
                onAutoplayBlocked={() => setMuted(true)}
              />
            ))}
          </div>
        )}
      </main>

      {currentUser && (
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload a cat</DialogTitle>
              <DialogDescription>
                Share a photo or video — it&apos;ll appear on your profile and your followers&apos; feeds.
              </DialogDescription>
            </DialogHeader>
            <ContentUpload
              creatorId={currentUser.id}
              onUploadSuccess={() => {
                setUploadOpen(false);
                fetchFeed(true);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default FeedPage;
