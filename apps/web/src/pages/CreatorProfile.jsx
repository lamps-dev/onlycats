import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ContentCard from '@/components/ContentCard.jsx';
import ContentUpload from '@/components/ContentUpload.jsx';
import CollectionsManager from '@/components/CollectionsManager.jsx';
import MarkdownContent from '@/components/MarkdownContent.jsx';
import TaglineText from '@/components/TaglineText.jsx';
import StaffRoleBadge from '@/components/StaffRoleBadge.jsx';
import supabase from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Users, UserPlus, UserMinus, Upload, Settings, MapPin, Globe, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

const SOCIAL_LABELS = {
  twitter: 'Twitter', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube',
  twitch: 'Twitch', github: 'GitHub', discord: 'Discord', website: 'Website', other: 'Link',
};

const CreatorProfile = () => {
  const { creatorId } = useParams();
  const { currentUser, isAuthenticated } = useAuth();
  const [creator, setCreator] = useState(null);
  const [content, setContent] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const isOwnProfile = !!(creator && currentUser && creator.id === currentUser.id);

  const fetchCreatorData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [
        { data: profile, error: profileErr },
        { data: contentRows, error: contentErr },
        { data: repostRows, error: repostErr },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, bio, about_me, avatar_url, follower_count, country, location, social_links, role, is_bot')
          .eq('id', creatorId)
          .maybeSingle(),
        supabase
          .from('content')
          .select('id, caption, file_url, like_count, tip_count, comment_count, repost_count, created_at, creator_id')
          .eq('creator_id', creatorId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('reposts')
          .select(
            'id, quote_text, overlay_text, created_at, content:content!content_id(id, caption, file_url, like_count, tip_count, comment_count, repost_count, created_at, creator_id, creator:profiles!creator_id(id, display_name, avatar_url, role, is_bot))',
          )
          .eq('user_id', creatorId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (profileErr) throw profileErr;
      if (contentErr) throw contentErr;
      if (repostErr) throw repostErr;

      const ownItems = (contentRows ?? []).map((row) => ({
        kind: 'own',
        sortAt: row.created_at,
        content: row,
        creator: null,
        repost: null,
        key: `own:${row.id}`,
      }));
      const repostItems = (repostRows ?? [])
        .filter((r) => r.content)
        .map((r) => ({
          kind: 'repost',
          sortAt: r.created_at,
          content: r.content,
          creator: r.content.creator ?? null,
          repost: {
            id: r.id,
            quote_text: r.quote_text,
            overlay_text: r.overlay_text,
            created_at: r.created_at,
            reposter_name: profile?.display_name ?? null,
          },
          key: `repost:${r.id}`,
        }));
      const merged = [...ownItems, ...repostItems].sort(
        (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime(),
      );

      setCreator(profile ?? null);
      setContent(merged);
    } catch (err) {
      console.error('Failed to fetch creator data:', err);
      if (!silent) toast.error('Failed to load creator profile');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    fetchCreatorData();
    const interval = setInterval(() => fetchCreatorData({ silent: true }), 45000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCreatorData({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchCreatorData]);


  useEffect(() => {
    if (!creatorId) return undefined;
    const channel = supabase
      .channel(`creator-profile-${creatorId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${creatorId}` },
        ({ new: nextProfile }) => {
          setCreator((prev) => (prev ? {
            ...prev,
            display_name: nextProfile.display_name,
            bio: nextProfile.bio,
            about_me: nextProfile.about_me,
            avatar_url: nextProfile.avatar_url,
            follower_count: nextProfile.follower_count,
            country: nextProfile.country,
            location: nextProfile.location,
            social_links: nextProfile.social_links,
            role: nextProfile.role,
            is_bot: nextProfile.is_bot,
          } : prev));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [creatorId]);

  useEffect(() => {
    if (!creator || !currentUser) {
      setIsFollowing(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('followers')
      .select('id', { head: true, count: 'exact' })
      .eq('user_id', currentUser.id)
      .eq('creator_id', creator.id)
      .then(({ count }) => {
        if (!cancelled) setIsFollowing((count ?? 0) > 0);
      });
    return () => { cancelled = true; };
  }, [creator, currentUser]);

  const handleFollow = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to follow creators');
      return;
    }
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('creator_id', creatorId);
        if (error) throw error;
        setIsFollowing(false);
        setCreator((c) => c && { ...c, follower_count: Math.max(0, (c.follower_count ?? 0) - 1) });
        toast.success('Unfollowed creator');
      } else {
        const { error } = await supabase
          .from('followers')
          .insert({ user_id: currentUser.id, creator_id: creatorId });
        if (error) throw error;
        setIsFollowing(true);
        setCreator((c) => c && { ...c, follower_count: (c.follower_count ?? 0) + 1 });
        toast.success('Following creator');
      }
    } catch (err) {
      console.error('Follow toggle failed:', err);
      toast.error('Failed to update follow status');
    }
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    fetchCreatorData();
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-4rem)] py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="w-32 h-32 bg-muted rounded-xl mx-auto mb-4"></div>
              <div className="h-6 bg-muted rounded w-48 mx-auto mb-2"></div>
              <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!creator) {
    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Creator not found</h1>
            <p className="text-muted-foreground">This cat has wandered off</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${creator.display_name} - OnlyCats`}</title>
        <meta name="description" content={creator.bio || `View ${creator.display_name}'s cat content on OnlyCats`} />
      </Helmet>

      <Header />

      <main className="min-h-[calc(100vh-4rem)] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Avatar className="w-32 h-32 rounded-2xl mx-auto mb-6">
                <AvatarImage src={creator.avatar_url} alt={creator.display_name} />
                <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground text-4xl">
                  {creator.display_name?.charAt(0) || 'C'}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                <h1 className="text-4xl font-bold">{creator.display_name}</h1>
                <StaffRoleBadge role={creator.role} isBot={creator.is_bot} className="shrink-0" />
              </div>

              {creator.bio && (
                <TaglineText
                  text={creator.bio}
                  isOwnerTagline={creator.role === 'owner'}
                  className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto whitespace-break-spaces break-words"
                />
              )}

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">{creator.follower_count || 0} followers</span>
                </div>
                {(creator.location || creator.country) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span>{[creator.location, creator.country].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>

              {creator.about_me && (
                <div className="max-w-2xl mx-auto mb-6 text-left bg-card border rounded-xl p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> About me
                  </h3>
                  <MarkdownContent>{creator.about_me}</MarkdownContent>
                </div>
              )}

              {Array.isArray(creator.social_links) && creator.social_links.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {creator.social_links.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border bg-card hover:bg-muted transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      {SOCIAL_LABELS[s.platform] || 'Link'}
                    </a>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                {!isOwnProfile && isAuthenticated && (
                  <Button size="lg" onClick={handleFollow}>
                    {isFollowing ? (
                      <><UserMinus className="w-5 h-5 mr-2" />Unfollow</>
                    ) : (
                      <><UserPlus className="w-5 h-5 mr-2" />Follow</>
                    )}
                  </Button>
                )}

                {isOwnProfile && (
                  <>
                    <Button size="lg" onClick={() => setUploadModalOpen(true)}>
                      <Upload className="w-5 h-5 mr-2" />
                      Upload Content
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/settings"><Settings className="w-5 h-5 mr-2" />Settings</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6">Content</h2>
              {content.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">
                    {isOwnProfile ? 'Upload your first cat content to get started' : 'No content yet'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {content.map((item) => (
                    <ContentCard
                      key={item.key}
                      content={item.content}
                      creator={item.kind === 'own' ? creator : item.creator}
                      repost={item.repost}
                      onDelete={(deletedId) =>
                        setContent((items) =>
                          items.filter(
                            (i) => !(i.kind === 'own' && i.content.id === deletedId),
                          ),
                        )
                      }
                      onCaptionChange={(postId, caption) =>
                        setContent((items) =>
                          items.map((row) =>
                            row.kind === 'own' && row.content.id === postId
                              ? { ...row, content: { ...row.content, caption } }
                              : row,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Collections</h2>
              <CollectionsManager userId={creator.id} editable={isOwnProfile} />
            </div>
          </div>
        </div>
      </main>

      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Cat Content</DialogTitle>
          </DialogHeader>
          <ContentUpload
            creatorId={creatorId}
            onUploadSuccess={handleUploadSuccess}
          />
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
};

export default CreatorProfile;
