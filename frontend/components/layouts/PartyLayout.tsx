'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getUser, removeUser } from '@/lib/auth';
import { toast } from 'sonner';
import { 
  Building, 
  User, 
  LogOut, 
  FileText, 
  Plane, 
  Users,
  Settings,
  Menu,
  X,
  Clock,
  AlertCircle
} from 'lucide-react';

interface PartyLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showHeader?: boolean;
}

export const PartyLayout: React.FC<PartyLayoutProps> = ({
  children,
  title,
  subtitle,
  showHeader = true,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    setUser(currentUser);
    
    // Enforce email verification for party users
    if (currentUser && currentUser.role === 'party' && !currentUser.emailVerified) {
      router.push('/verify-email');
    }
    
    // Prevent inactive party users from accessing their dashboard
    if (currentUser && currentUser.role === 'party' && currentUser.isActive === false) {
      router.push('/party/inactive');
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      // Logout should continue even if API call fails
    } finally {
      removeUser();
      toast.success('Logged out successfully');
      router.push('/');
    }
  };

  const dashboardItems = [
    {
      id: 'dashboard',
      label: 'Overview',
      description: 'Dashboard home',
      icon: FileText,
      href: '/party/dashboard',
      isActive: pathname === '/party/dashboard',
    },
    {
      id: 'bookings',
      label: 'My Bookings',
      description: 'Manage all your bookings',
      icon: FileText,
      href: '/party/bookings',
      isActive: pathname === '/party/bookings',
    },
  ];

  const umrahVisaItems = [
    {
      id: 'tafweej',
      label: 'Tafweej',
      description: 'Daily operational overview',
      icon: Clock,
      href: '/party/tafweej',
      isActive: pathname === '/party/tafweej',
    },
    {
      id: 'individual',
      label: 'Individual Umrah Visa',
      description: 'Apply for individual visa',
      icon: Plane,
      href: '/party/umrah-visa',
      isActive: pathname === '/party/umrah-visa',
    },
    {
      id: 'group',
      label: 'Group Umrah Visa',
      description: 'Apply for group visa',
      icon: Users,
      href: '/party/umrah-visa-group',
      isActive: pathname === '/party/umrah-visa-group',
    },
    {
      id: 'add-to-existing',
      label: 'Add to Existing Booking',
      description: 'Add group to existing booking',
      icon: Users,
      href: '/party/add-to-existing-booking',
      isActive: pathname === '/party/add-to-existing-booking',
    },
    {
      id: 'missing-brn',
      label: 'BRN Alert',
      description: 'Track missing hotel BRNs',
      icon: AlertCircle,
      href: '/party/missing-brn',
      isActive: pathname === '/party/missing-brn',
    },
  ];

  if (!mounted || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-64 bg-white shadow-xl border-r border-gray-100 flex flex-col fixed h-screen z-50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-md">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-secondary truncate w-32">{user.name}</h1>
                <p className="text-xs text-primary font-medium">Agency Portal</p>
              </div>
            </div>
            {/* Close button for mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 p-4 overflow-y-auto">
          <nav className="space-y-6">
            {/* Dashboard Section */}
            <div className="space-y-1">
              <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Main Menu
              </div>
              
              {dashboardItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      router.push(item.href);
                      setSidebarOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left rounded-lg transition-all duration-200 ${
                      item.isActive
                        ? 'bg-primary/20 text-secondary shadow-sm border-l-2 border-secondary font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 ${
                        item.isActive ? 'text-secondary' : 'text-gray-500'
                      }`} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Umrah Visa Section */}
            <div className="space-y-1">
              <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Services
              </div>
              
              {umrahVisaItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      router.push(item.href);
                      setSidebarOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left rounded-lg transition-all duration-200 ${
                      item.isActive
                        ? 'bg-primary/20 text-secondary shadow-sm border-l-2 border-secondary font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 ${
                        item.isActive ? 'text-secondary' : 'text-gray-500'
                      }`} />
                      <div>
                        <div className="text-sm">{item.label}</div>
                        <div className="text-[10px] opacity-60">{item.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center space-x-3 mb-4 p-2 bg-gray-50 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-secondary truncate">{user.name}</div>
              <div className="text-[10px] text-gray-500 truncate">{user.email}</div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              router.push('/party/settings');
              setSidebarOpen(false);
            }}
            className={`w-full justify-start text-gray-600 hover:bg-primary/10 hover:text-secondary ${
              pathname === '/party/settings' ? 'bg-primary/10 text-secondary font-bold' : ''
            }`}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout} 
            className="w-full justify-start text-gray-600 hover:bg-destructive/5 hover:text-primary"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Top Header */}
        {showHeader && (
          <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-secondary">{title}</h2>
                {subtitle && <p className="text-xs text-gray-500 font-medium">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1 bg-primary/10 text-secondary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wider">
                {user.role}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto relative bg-gray-50/30">
          {children}
        </div>
      </div>
    </div>
  );
};
