'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LogOut, 
  User, 
  ChevronDown, 
  Settings, 
  LayoutDashboard, 
  Ticket, 
  FileText, 
  MapPin, 
  PlusCircle, 
  Users, 
  Award,
  Bell,
  Menu,
  Clock,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUser, removeUser } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();
  const [isAppsDropdownOpen, setIsAppsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch (error) {
      // Ignore
    } finally {
      removeUser();
      toast.success('Logged out successfully');
      router.push('/');
    }
  };

  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';
  const isParty = user?.role === 'party';

  const mainTabs = isAdminOrStaff ? [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Tafweej', path: '/dashboard/umrah-visa/daily-overview', icon: Clock },
    { name: 'Voucher Management', path: '/dashboard/services/voucher', icon: Ticket },
    { name: 'Bookings', path: '/dashboard/umrah-visa/bookings', icon: FileText },
    { name: 'Trips', path: '/dashboard/umrah-visa/trip-info', icon: MapPin },
  ] : [
    { name: 'Dashboard', path: '/party/dashboard', icon: LayoutDashboard },
    { name: 'New Individual', path: '/party/umrah-visa', icon: User },
    { name: 'New Group', path: '/party/umrah-visa-group', icon: Users },
  ];

  const appItems = isAdminOrStaff ? [
    { name: 'Assign Group', path: '/dashboard/umrah-visa/assign-group', icon: Users },
    { name: 'Vouchers (Umrah)', path: '/dashboard/umrah-visa/voucher', icon: Award },
    { name: 'Invoices', path: '/dashboard/umrah-visa/invoice', icon: FileText },
  ] : [
    { name: 'Add to Existing', path: '/party/add-to-existing-booking', icon: PlusCircle },
    { name: 'My Profile', path: '/party/settings', icon: Settings },
  ];

  const isActive = (path: string) => pathname === path || (path !== '/dashboard' && path !== '/party/dashboard' && pathname.startsWith(path));

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/80">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Desktop Tabs */}
          <div className="flex items-center space-x-8">
            <div 
              className="flex items-center cursor-pointer group"
              onClick={() => router.push(isAdminOrStaff ? '/dashboard' : '/party/dashboard')}
            >
              <div className="h-9 w-9 bg-secondary rounded-lg flex items-center justify-center mr-2 group-hover:scale-105 transition-transform shadow-md">
                <span className="text-white font-black text-xl">M</span>
              </div>
              <h1 className="text-xl font-black text-secondary tracking-tighter hidden md:block">MOULAVI<span className="text-primary">ERP</span></h1>
            </div>

            {/* Desktop Navigation Tabs */}
            <div className="hidden lg:flex items-center space-x-1">
              {mainTabs.map((tab) => (
                <button
                  key={tab.path}
                  onClick={() => router.push(tab.path)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 flex items-center gap-2",
                    isActive(tab.path)
                      ? "bg-secondary text-white shadow-md shadow-secondary/20"
                      : "text-gray-500 hover:bg-gray-100 hover:text-secondary"
                  )}
                >
                  <tab.icon className={cn("h-4 w-4", isActive(tab.path) ? "text-primary" : "")} />
                  {tab.name}
                </button>
              ))}

              {/* Apps Dropdown */}
              <div className="relative ml-2">
                <button
                  onMouseEnter={() => setIsAppsDropdownOpen(true)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 flex items-center gap-2",
                    isAppsDropdownOpen || appItems.some(i => pathname === i.path)
                      ? "bg-gray-100 text-secondary"
                      : "text-gray-500 hover:bg-gray-100 hover:text-secondary"
                  )}
                >
                  Download/Upload
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isAppsDropdownOpen && "rotate-180")} />
                </button>

                {isAppsDropdownOpen && (
                  <div 
                    className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-[60]"
                    onMouseLeave={() => setIsAppsDropdownOpen(false)}
                  >
                    {appItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          router.push(item.path);
                          setIsAppsDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2 text-sm font-bold flex items-center gap-3 transition-colors",
                          pathname === item.path ? "text-primary bg-primary/5" : "text-gray-600 hover:bg-gray-50 hover:text-secondary"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 md:space-x-4">
            <NotificationDropdown />
            
            <button
              onClick={() => router.push(isAdminOrStaff ? '/dashboard/settings' : '/party/settings')}
              className={cn(
                "p-2 rounded-full transition-colors",
                (pathname === '/dashboard/settings' || pathname === '/party/settings') ? "bg-primary/10 text-primary" : "text-gray-500 hover:bg-gray-100"
              )}
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>

            {/* User Profile Dropdown / Mobile Menu */}
            <div className="flex items-center pl-2 md:pl-4 border-l border-gray-100">
              <div className="hidden md:flex flex-col items-end mr-3">
                <span className="text-xs font-black text-secondary uppercase tracking-tighter">{user?.name}</span>
                <span className="text-[10px] text-primary font-bold uppercase">{user?.role}</span>
              </div>
              
              <Sheet>
                <SheetTrigger asChild>
                  <button className="h-10 w-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform ring-2 ring-white ring-offset-2">
                    <User className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="rounded-l-3xl border-l-0">
                  <SheetHeader className="pb-6 border-b">
                    <SheetTitle className="flex items-center gap-3 pt-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white shadow-xl">
                        <User className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-black text-secondary uppercase tracking-tight">{user?.name}</p>
                        <p className="text-xs text-primary font-bold uppercase">{user?.role}</p>
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="py-6 space-y-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Navigation</p>
                      {mainTabs.map((tab) => (
                        <button
                          key={tab.path}
                          onClick={() => router.push(tab.path)}
                          className={cn(
                            "w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-bold transition-all",
                            isActive(tab.path) ? "bg-primary/10 text-secondary" : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          <tab.icon className="h-5 w-5" />
                          {tab.name}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Quick Actions</p>
                      <div className="grid grid-cols-2 gap-2 px-2">
                        {appItems.map((item) => (
                          <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 hover:bg-primary/5 transition-colors group"
                          >
                            <item.icon className="h-5 w-5 text-gray-400 group-hover:text-primary mb-2" />
                            <span className="text-[10px] font-bold text-gray-600 text-center">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 space-y-3 px-2">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start rounded-xl font-bold h-12"
                        onClick={() => router.push(isAdminOrStaff ? '/dashboard/settings' : '/party/settings')}
                      >
                        <Settings className="h-5 w-5 mr-3 text-primary" />
                        Settings
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="w-full justify-start rounded-xl font-bold h-12 bg-primary hover:bg-primary"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Logout
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
