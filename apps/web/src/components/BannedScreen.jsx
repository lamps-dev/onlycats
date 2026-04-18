import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { AlertOctagon, LogOut } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

const BannedScreen = () => {
  const { sanction, logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const expiresLabel = sanction?.expires_at
    ? `Expires in ${formatDistanceToNowStrict(new Date(sanction.expires_at))}`
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-mesh p-6">
      <div className="max-w-lg w-full bg-card border rounded-2xl p-8 text-center shadow-lg">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertOctagon className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {sanction?.permanent ? 'You are permanently banned' : 'You are banned'}
        </h1>
        <p className="text-muted-foreground mb-6">
          Your account has been restricted from using OnlyCats.
        </p>

        <div className="text-left bg-muted/40 rounded-lg p-4 mb-6 space-y-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reason</p>
            <p className="text-sm">{sanction?.reason || 'No reason provided.'}</p>
          </div>
          {sanction?.permanent ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Appeal</p>
              <p className="text-sm">
                This is a permanent ban. No appeal is available.
              </p>
            </div>
          ) : (
            expiresLabel && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Duration</p>
                <p className="text-sm">{expiresLabel}</p>
              </div>
            )
          )}
          {currentUser?.email && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Account</p>
              <p className="text-sm font-mono break-all">{currentUser.email}</p>
            </div>
          )}
        </div>

        <Button variant="outline" onClick={handleLogout} className="w-full">
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
};

export default BannedScreen;
