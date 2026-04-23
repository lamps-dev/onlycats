import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import TaglineText from '@/components/TaglineText.jsx';
import StaffRoleBadge from '@/components/StaffRoleBadge.jsx';
import supabase from '@/lib/supabaseClient.js';
import { Search, Users } from 'lucide-react';

const DiscoveryPage = () => {
  const [creators, setCreators] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCreators = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, bio, avatar_url, follower_count, role')
      .order('follower_count', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Failed to fetch creators:', error);
    } else {
      setCreators(data ?? []);
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    fetchCreators();
    const interval = setInterval(() => fetchCreators({ silent: true }), 60000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCreators({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchCreators]);

  const filteredCreators = creators.filter((creator) =>
    (creator.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <Helmet>
        <title>Discover Creators - OnlyCats</title>
        <meta name="description" content="Discover amazing cat content creators on OnlyCats. Follow your favorites and support them with tips." />
      </Helmet>

      <Header />

      <main className="min-h-[calc(100vh-4rem)] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
              Discover creators
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Find and follow cat content creators from around the world
            </p>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search creators by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="w-24 h-24 bg-muted rounded-xl mx-auto mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3 mx-auto"></div>
                </Card>
              ))}
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">No creators found</h2>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Be the first to create a profile'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCreators.map((creator) => (
                <Card key={creator.id} className="p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 flex flex-col h-full">
                  <div className="flex-1">
                    <Avatar className="w-24 h-24 rounded-xl mx-auto mb-4">
                      <AvatarImage src={creator.avatar_url} alt={creator.display_name} />
                      <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-2xl">
                        {creator.display_name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg text-center truncate max-w-[min(100%,12rem)]">
                        {creator.display_name}
                      </h3>
                      <StaffRoleBadge role={creator.role} className="shrink-0" />
                    </div>

                    {creator.bio && (
                      <TaglineText
                        text={creator.bio}
                        isOwnerTagline={creator.role === 'owner'}
                        className="text-sm text-muted-foreground text-center mb-3 line-clamp-2"
                      />
                    )}

                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-4">
                      <Users className="w-4 h-4" />
                      <span>{creator.follower_count || 0} followers</span>
                    </div>
                  </div>

                  <Button asChild className="w-full mt-auto">
                    <Link to={`/${creator.id}`}>View Profile</Link>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
};

export default DiscoveryPage;
