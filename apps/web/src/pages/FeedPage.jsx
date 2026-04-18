import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ContentCard from '@/components/ContentCard.jsx';
import ContentUpload from '@/components/ContentUpload.jsx';
import supabase from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Heart, RefreshCw, AlertCircle, Plus } from 'lucide-react';

const FeedPage = () => {
  const { currentUser } = useAuth();
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
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

      const { data: content, error: contentErr } = await supabase
        .from('content')
        .select('id, caption, file_url, like_count, tip_count, created_at, creator_id, creator:profiles!creator_id(id, display_name, avatar_url, role)')
        .in('creator_id', creatorIds)
        .order('created_at', { ascending: false })
        .limit(50);
      if (contentErr) throw contentErr;

      setFeedItems((content ?? []).map((item) => ({ content: item, creator: item.creator })));
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
        <meta name="description" content="View the latest cat content from creators you follow on OnlyCats." />
      </Helmet>

      <Header />

      <main className="min-h-[calc(100vh-4rem)] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-8 gap-3">
              <h1 className="text-4xl font-bold" style={{ letterSpacing: '-0.02em' }}>
                Your feed
              </h1>
              <div className="flex items-center gap-2">
                {currentUser && (
                  <Button size="sm" onClick={() => setUploadOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload cat
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => fetchFeed()} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-destructive mb-2">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => fetchFeed()}>
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border rounded-xl p-6 animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-muted rounded-xl"></div>
                      <div className="h-4 bg-muted rounded w-32"></div>
                    </div>
                    <div className="aspect-square bg-muted rounded-xl mb-4"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : feedItems.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Your feed is empty</h2>
                <p className="text-muted-foreground mb-6">
                  Follow some creators to see their content here
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {feedItems.map(({ content, creator }) => (
                  <ContentCard
                    key={content.id}
                    content={content}
                    creator={creator}
                    onDelete={(deletedId) =>
                      setFeedItems((items) => items.filter((i) => i.content.id !== deletedId))
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

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
