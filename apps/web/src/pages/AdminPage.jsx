import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Navigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import supabase from '@/lib/supabaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Shield, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const roleBadgeClass = (role) => {
  switch (role) {
    case 'owner':
      return 'bg-primary/10 text-primary';
    case 'moderator':
      return 'bg-secondary/10 text-secondary-foreground border border-secondary/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const AdminPage = () => {
  const { isOwner, currentUser, isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actingOn, setActingOn] = useState(null); // user id currently being updated

  const load = useCallback(async (q = '') => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');

      const params = new URLSearchParams();
      if (q) params.set('search', q);
      const res = await apiServerClient.fetch(`/admin/users${params.toString() ? `?${params}` : ''}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        let message = `Failed to load users (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch (_) { /* ignore */ }
        throw new Error(message);
      }
      const body = await res.json();
      setUsers(body.users ?? []);
    } catch (err) {
      console.error('Admin users load failed:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) load('');
  }, [isOwner, load]);

  const setRole = async (userId, role) => {
    setActingOn(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');

      const res = await apiServerClient.fetch(`/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        let message = `Failed to update role (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch (_) { /* ignore */ }
        throw new Error(message);
      }
      const body = await res.json();
      setUsers((list) => list.map((u) => (u.id === userId ? { ...u, role: body.role } : u)));
      toast.success(`Role updated to ${body.role}`);
    } catch (err) {
      console.error('Role update failed:', err);
      toast.error(err.message || 'Failed to update role');
    } finally {
      setActingOn(null);
    }
  };

  // Guard: only owner may view this page. Redirect everyone else home.
  // (Server also enforces owner-only on every admin endpoint.)
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isOwner) return <Navigate to="/" replace />;

  const handleSearch = (e) => {
    e.preventDefault();
    load(search);
  };

  return (
    <>
      <Helmet>
        <title>Admin - OnlyCats</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <Header />

      <main className="min-h-[calc(100vh-4rem)] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Admin</h1>
                <p className="text-sm text-muted-foreground">
                  Owner console for {currentUser?.display_name || currentUser?.email}
                </p>
              </div>
            </div>

            <Card className="p-6 mb-6">
              <h2 className="text-lg font-semibold mb-1">Moderator management</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Promote users to moderator so they can delete any post. Only you can grant or revoke this role.
              </p>

              <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by display name..."
                    className="pl-9 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
                <Button type="submit" variant="outline" disabled={loading}>
                  Search
                </Button>
              </form>

              {error && (
                <div className="p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No users found.</p>
              ) : (
                <ul className="divide-y">
                  {users.map((u) => {
                    const busy = actingOn === u.id;
                    const isSelf = u.id === currentUser?.id;
                    const locked = u.role === 'owner' || isSelf;
                    return (
                      <li key={u.id} className="flex items-center gap-3 py-3">
                        <Avatar className="w-10 h-10 rounded-xl">
                          <AvatarImage src={u.avatar_url} alt={u.display_name} />
                          <AvatarFallback className="rounded-xl bg-primary text-primary-foreground">
                            {u.display_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {u.display_name || '(no name)'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{u.id}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeClass(u.role)}`}
                        >
                          {u.role}
                        </span>
                        {!locked && (
                          <div className="flex gap-2">
                            {u.role !== 'moderator' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => setRole(u.id, 'moderator')}
                              >
                                Make moderator
                              </Button>
                            )}
                            {u.role === 'moderator' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => setRole(u.id, 'user')}
                                className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                              >
                                Remove moderator
                              </Button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default AdminPage;
