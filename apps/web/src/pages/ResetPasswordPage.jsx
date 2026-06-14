
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import supabase from '@/lib/supabaseClient.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Cat } from 'lucide-react';
import { toast } from 'sonner';
import { mapAuthError } from '@/lib/authErrors.js';

const MIN_PASSWORD_LENGTH = 8;

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  // null = still checking for the recovery session, true/false = result.
  const [hasRecoverySession, setHasRecoverySession] = useState(null);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  // The reset link carries a recovery token in the URL hash. Supabase parses it
  // (detectSessionInUrl) and fires PASSWORD_RECOVERY, giving us a temporary
  // session that authorizes updateUser. Confirm one exists before showing the form.
  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasRecoverySession(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setHasRecoverySession((prev) => (prev === true ? prev : !!session));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      toast.success('Password updated! You are now logged in.');
      navigate('/discover', { replace: true });
    } catch (error) {
      console.error('Password update failed:', error);
      toast.error(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Set a new password - OnlyCats</title>
        <meta name="description" content="Choose a new password for your OnlyCats account." />
      </Helmet>

      <Header />

      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-mesh">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
              <Cat className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Set a new password</h1>
            <p className="text-muted-foreground">Choose a strong password you don't use elsewhere</p>
          </div>

          <Card className="p-8">
            {hasRecoverySession === false ? (
              <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold">This link is invalid or expired</h2>
                <p className="text-sm text-muted-foreground">
                  Reset links can only be used once and expire after a short while. Please request a
                  new one.
                </p>
                <Button className="w-full" onClick={() => navigate('/forgot-password')}>
                  Request a new link
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">New password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    className="text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Confirm new password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    className="text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || hasRecoverySession === null}
                >
                  {loading ? 'Updating...' : 'Update password'}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Back to login
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default ResetPasswordPage;
