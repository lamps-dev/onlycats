
import React from 'react';
import { Link } from 'react-router-dom';
import { Cat, Heart, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { DISCONTINUED_POST_PATH } from '@/components/DiscontinuedBanner.jsx';

const Footer = () => {
  const { isAuthenticated, currentUser } = useAuth();
  return (
    <footer className="border-t bg-muted/30 mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 font-bold text-xl mb-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Cat className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                OnlyCats
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Discontinued. This service is no longer maintained and is not recommended for use.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  to={DISCONTINUED_POST_PATH}
                  className="inline-flex items-center gap-1.5 font-medium text-destructive hover:underline"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Why this service is discontinued
                </Link>
              </li>
              <li>
                <Link to="/archive" className="hover:text-primary transition-colors">
                  The old homepage
                </Link>
              </li>
              <li>
                <Link to="/discover" className="hover:text-primary transition-colors">
                  Discover Creators
                </Link>
              </li>
              {isAuthenticated && currentUser?.id && (
                <li>
                  <Link to={`/${currentUser.id}`} className="hover:text-primary transition-colors">
                    My Profile
                  </Link>
                </li>
              )}
              <li>
                <Link to="/privacy" className="hover:text-primary transition-colors">
                  Privacy Pawlicy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Status</h3>
            <p className="text-sm text-muted-foreground">
              Shut down for good. The database behind this site was not recoverable after a long
              stretch of inactivity, and nothing here is being maintained or supported.
            </p>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 OnlyCats. Made with <Heart className="w-4 h-4 inline text-secondary fill-current" /> for cats everywhere, then retired.
          </p>
          <p className="text-xs text-muted-foreground">
            No actual cats were harmed in the making, or the shutting down, of this parody site.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
