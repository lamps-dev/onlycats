
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ContentCard from '@/components/ContentCard.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Heart, RefreshCw, AlertCircle } from 'lucide-react';

const FeedPage = () => {
  const { currentUser } = useAuth();
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const autoRefreshInterval = useRef(null);

  useEffect(() => {
    fetchFeed();

    // Auto-refresh every 30 seconds
    autoRefreshInterval.current = setInterval(() => {
      fetchFeed(true);
    }, 30000);

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, []);

  const fetchFeed = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const follows = await pb.collection('followers').getFullList({
        filter: `userId="${currentUser.id}"`,
        $autoCancel: false,
      });

      const followedCreatorIds = follows.map(f => f.creatorId);

      if (followedCreatorIds.length === 0) {
        setFeedItems([]);
        setLoading(false);
        return;
      }

      const filterStr = followedCreatorIds.map(id => `creatorId="${id}"`).join(' || ');

      const contentRecords = await pb.collection('content').getList(1, 50, {
        filter: filterStr,
        sort: '-created',
        $autoCancel: false,
      });

      const creatorsMap = {};
      for (const creatorId of followedCreatorIds) {
        try {
          const creator = await pb.collection('creators').getOne(creatorId, { $autoCancel: false });
          creatorsMap[creatorId] = creator;
        } catch (err) {
          console.error('Failed to fetch creator:', err);
        }
      }

      const itemsWithCreators = contentRecords.items.map(item => ({
        content: item,
        creator: creatorsMap[item.creatorId],
      }));

      setFeedItems(itemsWithCreators);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch feed:', error);
      setError('Failed to load feed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchFeed();
  };

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
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold" style={{letterSpacing: '-0.02em'}}>
                Your feed
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchFeed()}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-destructive mb-2">{error}</p>
                  <Button variant="outline" size="sm" onClick={handleRetry}>
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
                  <ContentCard key={content.id} content={content} creator={creator} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default FeedPage;
