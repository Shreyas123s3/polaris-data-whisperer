
import React from 'react';
import { Button } from '@/components/ui/button';
import { Database, Menu, Bell } from 'lucide-react';

const Navbar = () => {
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
          <Button variant="outline" size="sm" className="hidden md:flex">
            Sign In
          </Button>
          <Button className="btn-primary">
            Get Started
          </Button>
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
