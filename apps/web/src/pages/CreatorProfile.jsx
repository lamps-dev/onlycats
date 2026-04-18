
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ContentCard from '@/components/ContentCard.jsx';
import ContentUpload from '@/components/ContentUpload.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Users, UserPlus, UserMinus, Upload } from 'lucide-react';
import { toast } from 'sonner';

const CreatorProfile = () => {
  const { creatorId } = useParams();
  const { currentUser, isAuthenticated } = useAuth();
  const [creator, setCreator] = useState(null);
  const [content, setContent] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    fetchCreatorData();
  }, [creatorId]);

  useEffect(() => {
    if (creator && currentUser) {
      checkIfOwnProfile();
      checkIfFollowing();
    }
  }, [creator, currentUser]);

  const fetchCreatorData = async () => {
    setLoading(true);
    try {
      const creatorRecord = await pb.collection('creators').getOne(creatorId, { $autoCancel: false });
      setCreator(creatorRecord);

      const contentRecords = await pb.collection('content').getList(1, 50, {
        filter: `creatorId="${creatorId}"`,
        sort: '-created',
        $autoCancel: false,
      });
      setContent(contentRecords.items);
    } catch (error) {
      console.error('Failed to fetch creator data:', error);
      toast.error('Failed to load creator profile');
    } finally {
      setLoading(false);
    }
  };

  const checkIfOwnProfile = () => {
    if (creator && currentUser) {
      setIsOwnProfile(creator.userId === currentUser.id);
    }
  };

  const checkIfFollowing = async () => {
    if (!isAuthenticated || !currentUser) return;

    try {
      const follows = await pb.collection('followers').getList(1, 1, {
        filter: `userId="${currentUser.id}" && creatorId="${creatorId}"`,
        $autoCancel: false,
      });
      setIsFollowing(follows.items.length > 0);
    } catch (error) {
      console.error('Failed to check follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to follow creators');
      return;
    }

    try {
      if (isFollowing) {
        const follows = await pb.collection('followers').getList(1, 1, {
          filter: `userId="${currentUser.id}" && creatorId="${creatorId}"`,
          $autoCancel: false,
        });
        if (follows.items.length > 0) {
          await pb.collection('followers').delete(follows.items[0].id, { $autoCancel: false });
          setIsFollowing(false);
          toast.success('Unfollowed creator');
        }
      } else {
        await pb.collection('followers').create({
          userId: currentUser.id,
          creatorId: creatorId,
        }, { $autoCancel: false });
        setIsFollowing(true);
        toast.success('Following creator');
      }
    } catch (error) {
      console.error('Follow toggle failed:', error);
      toast.error('Failed to update follow status');
    }
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    fetchCreatorData();
  };

  const avatarUrl = creator?.avatar ? pb.files.getUrl(creator, creator.avatar) : null;

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
        <title>{`${creator.name} - OnlyCats`}</title>
        <meta name="description" content={creator.bio || `View ${creator.name}'s cat content on OnlyCats`} />
      </Helmet>

      <Header />

      <main className="min-h-[calc(100vh-4rem)] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Avatar className="w-32 h-32 rounded-2xl mx-auto mb-6">
                <AvatarImage src={avatarUrl} alt={creator.name} />
                <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground text-4xl">
                  {creator.name?.charAt(0) || 'C'}
                </AvatarFallback>
              </Avatar>

              <h1 className="text-4xl font-bold mb-3">{creator.name}</h1>

              {creator.bio && (
                <p className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto">
                  {creator.bio}
                </p>
              )}

              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">{creator.followerCount || 0} followers</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                {!isOwnProfile && isAuthenticated && (
                  <Button size="lg" onClick={handleFollow}>
                    {isFollowing ? (
                      <>
                        <UserMinus className="w-5 h-5 mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                )}

                {isOwnProfile && (
                  <Button size="lg" onClick={() => setUploadModalOpen(true)}>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Content
                  </Button>
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
                    <ContentCard key={item.id} content={item} creator={creator} />
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

      <Footer />
    </>
  );
};

export default CreatorProfile;
