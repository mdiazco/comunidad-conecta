import React from 'react';
import { Menu, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function TopBar({ onMenuClick, unreadCount, user }) {
  return (
    <header className="h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={onMenuClick}>
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Link to="/notifications">
          <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-lg">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        {/* User pill */}
        {user && (
          <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-border">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {(user.full_name || user.email || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-foreground leading-tight">
                {user.full_name || user.email}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}