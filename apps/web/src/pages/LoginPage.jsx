
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { DISCONTINUED_POST_PATH } from '@/components/DiscontinuedBanner.jsx';
import { Cat, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { mapAuthError } from '@/lib/authErrors.js';

const LoginPage = () => {
  const location = useLocation();
  const [email, setEmail] = useState(() => location.state?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Signed in. This account is read-only.');
      navigate('/settings', { replace: true });
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - OnlyCats</title>
        <meta
          name="description"
          content="Sign in to an existing OnlyCats account to download a copy of your data. OnlyCats is discontinued and no longer accepts new accounts or new posts."
        />
      </Helmet>

      <Header />

      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-mesh">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
              <Cat className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Sign in to save your data</h1>
            <p className="text-muted-foreground">
              Existing accounts only. Nothing here can be posted or changed any more.
            </p>
          </div>

          <Card className="p-8">
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-6 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-destructive" />
              <p className="text-muted-foreground">
                OnlyCats is discontinued and read-only. Signing in lets you download a copy of your
                data and delete your account. That is the only thing left to do here, and even that
                depends on what the database will still return.{' '}
                <Link to={DISCONTINUED_POST_PATH} className="text-primary font-medium hover:underline">
                  Read why
                </Link>
                .
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-gray-900 placeholder:text-gray-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Password</label>
                  <Link
                    to="/forgot-password"
                    state={{ email }}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-gray-900 placeholder:text-gray-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                No account? You cannot make one. New signups are permanently closed.
              </p>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default LoginPage;
