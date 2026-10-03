'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getUser, hasRole, removeUser } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Menu, LogOut, User as UserIcon, Search } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { GlobalPassportSearchModal } from './GlobalPassportSearchModal';

interface DashboardHeaderProps {
  title: string;
  description?: string;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  children?: React.ReactNode;
}

export default function DashboardHeader({
  title,
  description,
  sidebarCollapsed,
  setSidebarCollapsed,
  mobileMenuOpen,
  setMobileMenuOpen,
  children
}: DashboardHeaderProps) {
  const router = useRouter();
  const user = getUser();

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
      removeUser();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      removeUser();
      router.push('/');
    }
  };

  return (
    <>
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{title}</h1>
              {description && (
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Passport Search Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSearchOpen(true)}
              className="text-slate-700 hover:text-indigo-650 flex items-center space-x-1 border-slate-200 shadow-sm"
            >
              <Search className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline text-xs font-semibold">Search Passport</span>
            </Button>

            {/* Notifications - Only for admin/staff */}
            {hasRole(['admin', 'staff']) && (
              <NotificationDropdown />
            )}
            
            {/* User Info */}
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                <UserIcon className="h-4 w-4" />
                <span>{user?.name}</span>
                <span className="text-gray-400">({user?.role})</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-primary"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:ml-2">Logout</span>
              </Button>
            </div>
            
            {/* Custom actions */}
            {children}
          </div>
        </div>
      </div>

      {/* Global Passport & Passenger Search Modal */}
      <GlobalPassportSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
