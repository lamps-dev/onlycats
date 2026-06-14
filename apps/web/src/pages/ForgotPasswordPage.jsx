
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Cat, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { mapAuthError } from '@/lib/authErrors.js';

const ForgotPasswordPage = () => {
  const location = useLocation();
  const [email, setEmail] = useState(() => location.state?.email || '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { requestPasswordReset } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await requestPasswordReset(email);
      // Always show success — don't reveal whether an account exists.
      setSent(true);
    } catch (error) {
      console.error('Password reset request failed:', error);
      toast.error(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset password - OnlyCats</title>
        <meta name="description" content="Reset the password for your OnlyCats account." />
      </Helmet>

      <Header />

      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-mesh">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
              <Cat className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Forgot your password?</h1>
            <p className="text-muted-foreground">We'll email you a link to reset it</p>
          </div>

          <Card className="p-8">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                  <MailCheck className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  If an account exists for <span className="font-medium">{email}</span>, we've sent a
                  link to reset your password. The link expires after a short while.
                </p>
                <Button className="w-full" onClick={() => navigate('/login')}>
                  Back to login
                </Button>
              </div>
            ) : (
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

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Remembered it?{' '}
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

export default ForgotPasswordPage;
