
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { Button } from '@/components/ui/button';
import { Cat, LogOut, Shield, Settings, Sun, Moon, Gavel } from 'lucide-react';
import TimeoutBanner from '@/components/TimeoutBanner.jsx';
import StaffRoleBadge from '@/components/StaffRoleBadge.jsx';

const Header = () => {
  const { isAuthenticated, logout, currentUser, isOwner, isModerator } = useAuth();
  const { resolved, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Cat className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              OnlyCats
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive('/') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Home
            </Link>
            <Link
              to="/discover"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive('/discover') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Discover
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  to="/feed"
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActive('/feed') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Feed
                </Link>
                <Link
                  to="/developer"
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActive('/developer') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Developer
                </Link>
                {isModerator && (
                  <Link
                    to="/moderation"
                    className={`text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-1 ${
                      isActive('/moderation') ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <Gavel className="w-4 h-4" />
                    Moderation
                  </Link>
                )}
                {isOwner && (
                  <Link
                    to="/admin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-1 ${
                      isActive('/admin') ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}
              </>
            )}
            <Link
              to="/api-docs"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive('/api-docs') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              API Docs
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={resolved === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {resolved === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {!isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Login
                </Button>
                <Button size="sm" onClick={() => navigate('/signup')}>
                  Sign Up
                </Button>
              </>
            ) : (
              <>
                <span className="hidden sm:inline-flex items-center gap-2 max-w-[12rem] sm:max-w-[16rem]">
                  <span className="text-sm text-muted-foreground truncate">
                    {currentUser?.display_name || currentUser?.email}
                  </span>
                  <StaffRoleBadge role={currentUser?.role} className="shrink-0" />
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/settings')}
                  aria-label="Settings"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
    <TimeoutBanner />
    </>
  );
};

export default Header;
