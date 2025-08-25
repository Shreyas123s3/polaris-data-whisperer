
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Database, Menu, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    console.log('Sign Out clicked');
    await signOut();
    navigate('/');
  };

  const handleSignInClick = () => {
    console.log('Sign In button clicked - navigating to /auth');
    navigate('/auth');
  };

  const handleGetStartedClick = () => {
    console.log('Get Started button clicked - navigating to /auth');
    navigate('/auth');
  };

  console.log('Navbar render - user:', user, 'loading:', loading);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-morphic border-b border-polaris-purple/20">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-polaris-purple flex items-center justify-center">
            <Database className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">AI Data Analyst</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-foreground hover:text-primary transition-colors duration-300 font-medium">
            Features
          </a>
          <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors duration-300 font-medium">
            How it Works
          </a>
          <a href="#pricing" className="text-foreground hover:text-primary transition-colors duration-300 font-medium">
            Pricing
          </a>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="live-indicator"></div>
            <span className="text-sm text-muted-foreground hidden md:block">Updates</span>
            <div className="w-6 h-6 bg-polaris-purple text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
              2
            </div>
          </div>
          
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/analyze')}>
                  Analyze Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/datasets')}>
                  Datasets
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden md:flex" 
                onClick={handleSignInClick}
                type="button"
              >
                Sign In
              </Button>
              <Button 
                className="btn-primary" 
                onClick={handleGetStartedClick}
                type="button"
              >
                Get Started
              </Button>
            </>
          )}
          
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
