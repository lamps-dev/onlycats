
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import pb from '@/lib/pocketbaseClient.js';
import { Heart, DollarSign, Calendar } from 'lucide-react';
import TipModal from './TipModal.jsx';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { formatDistanceToNow } from 'date-fns';

const ContentCard = ({ content, creator }) => {
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(content.likeCount || 0);
  const [tipModalOpen, setTipModalOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && pb.authStore.model) {
      checkIfLiked();
    }
  }, [content.id, isAuthenticated]);

  const checkIfLiked = async () => {
    try {
      const likes = await pb.collection('likes').getList(1, 1, {
        filter: `userId="${pb.authStore.model.id}" && contentId="${content.id}"`,
        $autoCancel: false,
      });
      setIsLiked(likes.items.length > 0);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to like content');
      return;
    }

    try {
      if (isLiked) {
        const likes = await pb.collection('likes').getList(1, 1, {
          filter: `userId="${pb.authStore.model.id}" && contentId="${content.id}"`,
          $autoCancel: false,
        });
        if (likes.items.length > 0) {
          await pb.collection('likes').delete(likes.items[0].id, { $autoCancel: false });
          setIsLiked(false);
          setLikeCount(prev => prev - 1);
        }
      } else {
        await pb.collection('likes').create({
          userId: pb.authStore.model.id,
          contentId: content.id,
        }, { $autoCancel: false });
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Like toggle failed:', error);
      toast.error('This cat is feeling finicky. Try again.');
    }
  };

  const fileUrl = content.file ? pb.files.getUrl(content, content.file) : null;
  const avatarUrl = creator?.avatar ? pb.files.getUrl(creator, creator.avatar) : null;

  const isVideo = content.file && (
    content.file.endsWith('.mp4') || 
    content.file.endsWith('.webm') ||
    content.file.includes('.mp4?') ||
    content.file.includes('.webm?')
  );

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200">
        <div className="p-4">
          <Link to={`/${creator?.id}`} className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10 rounded-xl">
              <AvatarImage src={avatarUrl} alt={creator?.name || 'Creator'} />
              <AvatarFallback className="rounded-xl bg-primary text-primary-foreground">
                {creator?.name?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{creator?.name || 'Unknown Creator'}</p>
              {content.created && (
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(content.created), { addSuffix: true })}
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
                {content.tipCount || 0}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <TipModal
        isOpen={tipModalOpen}
        onClose={() => setTipModalOpen(false)}
        creatorId={creator?.id}
        creatorName={creator?.name}
      />
    </>
  );
};

export default ContentCard;
