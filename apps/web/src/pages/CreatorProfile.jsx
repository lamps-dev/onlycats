import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ContentCard from '@/components/ContentCard.jsx';
import ContentUpload from '@/components/ContentUpload.jsx';
import DeleteAccountDialog from '@/components/DeleteAccountDialog.jsx';
import supabase from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Users, UserPlus, UserMinus, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const CreatorProfile = () => {
  const { creatorId } = useParams();
  const { currentUser, isAuthenticated } = useAuth();
  const [creator, setCreator] = useState(null);
  const [content, setContent] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const isOwnProfile = !!(creator && currentUser && creator.id === currentUser.id);

  const fetchCreatorData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: profile, error: profileErr }, { data: contentRows, error: contentErr }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, bio, avatar_url, follower_count')
          .eq('id', creatorId)
          .maybeSingle(),
        supabase
          .from('content')
          .select('id, caption, file_url, like_count, tip_count, created_at, creator_id')
          .eq('creator_id', creatorId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (profileErr) throw profileErr;
      if (contentErr) throw contentErr;

      setCreator(profile ?? null);
      setContent(contentRows ?? []);
    } catch (err) {
      console.error('Failed to fetch creator data:', err);
      toast.error('Failed to load creator profile');
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => { fetchCreatorData(); }, [fetchCreatorData]);

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

              <h1 className="text-4xl font-bold mb-3">{creator.display_name}</h1>

              {creator.bio && (
                <p className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto">
                  {creator.bio}
                </p>
              )}

              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">{creator.follower_count || 0} followers</span>
                </div>
              </div>

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
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setDeleteAccountOpen(true)}
                      className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-5 h-5 mr-2" />
                      Delete account
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
                      key={item.id}
                      content={item}
                      creator={creator}
                      onDelete={(deletedId) =>
                        setContent((items) => items.filter((i) => i.id !== deletedId))
                      }
                    />
                  ))}
                </div>
              )}
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

      {isOwnProfile && (
        <DeleteAccountDialog
          open={deleteAccountOpen}
          onOpenChange={setDeleteAccountOpen}
          accountName={creator?.display_name}
        />
      )}

      <Footer />
    </>
  );
};

export default CreatorProfile;
