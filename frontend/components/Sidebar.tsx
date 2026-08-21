'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  Database,
  MapPin,
  Building2,
  FileType,
  Tag,
  CreditCard,
  Award,
  Plane,
  Receipt,
  TrendingUp,
  XCircle,
  DollarSign,
  ChevronsLeft,
  ChevronsRight,
  Building,
  Shield,
  Truck,
  Car,
  Route,
  Ticket,
  Calendar
} from 'lucide-react';
import { getUser, removeUser } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import { toast } from 'sonner';

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed = false, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const [mastersOpen, setMastersOpen] = useState(false);
  const [umrahVisaOpen, setUmrahVisaOpen] = useState(false);

  // Auto-expand Masters tab when on any masters page
  useEffect(() => {
    if (pathname.startsWith('/dashboard/masters/')) {
      setMastersOpen(true);
    }
  }, [pathname]);

  // Auto-expand Umrah Visa tab when on any umrah-visa page
  useEffect(() => {
    if (pathname.startsWith('/dashboard/umrah-visa/')) {
      setUmrahVisaOpen(true);
    }
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch (error) {
      // Logout should continue even if API call fails
      // Error handling is done by the API interceptor
    } finally {
      removeUser();
      toast.success('Logged out successfully');
      router.push('/');
    }
  };

  const masterItems = [
    { name: 'User Master', icon: User, path: '/dashboard/masters/user' },
    { name: 'Country Master', icon: MapPin, path: '/dashboard/masters/country' },
    { name: 'City Master', icon: Building2, path: '/dashboard/masters/city' },
    { name: 'Currency Master', icon: DollarSign, path: '/dashboard/masters/currency' },
    { name: 'Location Master', icon: Database, path: '/dashboard/masters/location' },
    { name: 'Vehicle Type Master', icon: Car, path: '/dashboard/masters/vehicle-type' },
    { name: 'Party Master', icon: Users, path: '/dashboard/masters/party' },
    { name: 'Transport Route Master', icon: Route, path: '/dashboard/masters/transport-route' },
    { name: 'Transport Master', icon: Truck, path: '/dashboard/masters/transport' },
    { name: 'Pricing Master', icon: Tag, path: '/dashboard/masters/pricing' },
    { name: 'Expense Master', icon: Receipt, path: '/dashboard/masters/expense' },
    { name: 'Income Master', icon: TrendingUp, path: '/dashboard/masters/income' },
    { name: 'Umrah Visa Master', icon: Calendar, path: '/dashboard/masters/umrah-visa' },
  ];

  // Umrah Visa items organized into two sections
  const umrahVisaCreateItems = [
    { name: 'Create Individual Booking', icon: FileText, path: '/dashboard/umrah-visa/create-individual' },
    { name: 'Create Group Booking', icon: Users, path: '/dashboard/umrah-visa/create-group' },
    { name: 'Create Re-Entry Booking', icon: FileText, path: '/dashboard/umrah-visa/create-re-entry' },
    { name: 'Add to Existing Booking', icon: Users, path: '/dashboard/umrah-visa/add-to-existing-booking' },
  ];

  const umrahVisaManagementItems = [
    { name: 'Booking', icon: FileText, path: '/dashboard/umrah-visa/bookings' },
    { name: 'Assign Group', icon: Users, path: '/dashboard/umrah-visa/assign-group' },
    { name: 'Trip Info', icon: MapPin, path: '/dashboard/umrah-visa/trip-info' },
    { name: 'Voucher', icon: Award, path: '/dashboard/umrah-visa/voucher' },
    { name: 'Invoice', icon: FileText, path: '/dashboard/umrah-visa/invoice' },
  ];

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      onClick: () => router.push('/dashboard'),
    },
    {
      name: 'Voucher Management',
      icon: Ticket,
      path: '/dashboard/services/voucher',
      onClick: () => router.push('/dashboard/services/voucher'),
    },
  ];

  return (
    <div className={cn(
      "flex h-screen flex-col border-r bg-white transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* User Info & Toggle */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary text-white flex-shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary text-white">
              <User className="h-5 w-5" />
            </div>
          </div>
        )}
        <button
          onClick={() => onCollapsedChange?.(!collapsed)}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronsLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {/* Main Menu Items */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            
            return (
              <button
                key={item.name}
                onClick={item.onClick}
                className={cn(
                  'flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  collapsed ? 'justify-center' : 'space-x-3',
                  isActive
                    ? 'bg-primary/20 text-secondary shadow-sm border-l-2 border-secondary'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </button>
            );
          })}

          {/* Umrah Visa Section */}
          <div className="pt-2">
            <button
              onClick={() => {
                if (collapsed) {
                  toast.info('Expand sidebar to access Umrah Visa');
                } else {
                  setUmrahVisaOpen(!umrahVisaOpen);
                }
              }}
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                collapsed ? 'justify-center' : 'justify-between',
                pathname.startsWith('/dashboard/umrah-visa/')
                  ? 'bg-primary/20 text-secondary shadow-sm border-l-2 border-secondary'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                umrahVisaOpen && !collapsed && !pathname.startsWith('/dashboard/umrah-visa/') && 'bg-gray-50'
              )}
              title={collapsed ? "Umrah Visa" : undefined}
            >
              <div className={cn("flex items-center", collapsed ? '' : 'space-x-3')}>
                <Award className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>Umrah Visa</span>}
              </div>
              {!collapsed && (
                <div className={cn("transition-transform duration-200", umrahVisaOpen && "rotate-90")}>
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </button>

            {/* Umrah Visa Submenu */}
            {(umrahVisaOpen || pathname.startsWith('/dashboard/umrah-visa/')) && !collapsed && (
              <div className="ml-4 mt-1 space-y-3 border-l-2 border-primary/20 pl-2 animate-in slide-in-from-top-2 duration-200">
                {/* Create Section */}
                <div className="space-y-1">
                  <div className="px-3 py-1.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Create</span>
                  </div>
                  {umrahVisaCreateItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;
                    
                    return (
                      <button
                        key={item.name}
                        onClick={() => router.push(item.path)}
                        className={cn(
                          'flex w-full items-center space-x-2 rounded-md px-3 py-2 text-xs font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-secondary border-l-2 border-secondary font-semibold shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-l-2 hover:border-gray-300'
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Management Section */}
                <div className="space-y-1">
                  <div className="px-3 py-1.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Management</span>
                  </div>
                  {umrahVisaManagementItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;
                    
                    return (
                      <button
                        key={item.name}
                        onClick={() => router.push(item.path)}
                        className={cn(
                          'flex w-full items-center space-x-2 rounded-md px-3 py-2 text-xs font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-secondary border-l-2 border-secondary font-semibold shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-l-2 hover:border-gray-300'
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Masters Section */}
          <div className="pt-2">
            <button
              onClick={() => {
                if (collapsed) {
                  // When collapsed, don't expand sidebar, just show toast
                  toast.info('Expand sidebar to access Masters');
                } else {
                  setMastersOpen(!mastersOpen);
                }
              }}
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                collapsed ? 'justify-center' : 'justify-between',
                // Highlight Masters tab when any sub-tab is active
                pathname.startsWith('/dashboard/masters/')
                  ? 'bg-primary/20 text-secondary shadow-sm border-l-2 border-secondary'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                mastersOpen && !collapsed && !pathname.startsWith('/dashboard/masters/') && 'bg-gray-50'
              )}
              title={collapsed ? "Masters" : undefined}
            >
              <div className={cn("flex items-center", collapsed ? '' : 'space-x-3')}>
                <Database className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>Masters</span>}
              </div>
              {!collapsed && (
                <div className={cn("transition-transform duration-200", mastersOpen && "rotate-90")}>
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </button>

            {/* Masters Submenu */}
            {(mastersOpen || pathname.startsWith('/dashboard/masters/')) && !collapsed && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-primary/20 pl-2 animate-in slide-in-from-top-2 duration-200">
                {masterItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        if (item.path === '/dashboard/masters/user' || 
                            item.path === '/dashboard/masters/party' || 
                            item.path === '/dashboard/masters/transport' || 
                            item.path === '/dashboard/masters/transport-route' ||
                            item.path === '/dashboard/masters/fulltrip' || 
                            item.path === '/dashboard/masters/country' || 
                            item.path === '/dashboard/masters/currency' ||
                            item.path === '/dashboard/masters/location' ||
                            item.path === '/dashboard/masters/vehicle-type' ||
                            item.path === '/dashboard/masters/city' ||
                            item.path === '/dashboard/masters/user-role' ||
                            item.path === '/dashboard/masters/airport-route' ||
                            item.path === '/dashboard/masters/pricing' ||
                            item.path === '/dashboard/masters/umrah-visa') {
                          router.push(item.path);
                        } else {
                          toast.info(`${item.name} coming soon`);
                        }
                      }}
                      className={cn(
                        'flex w-full items-center space-x-2 rounded-md px-3 py-2 text-xs font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary/10 text-secondary border-l-2 border-secondary font-semibold shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-l-2 hover:border-gray-300'                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t p-3 space-y-1">
        <button
          onClick={() => toast.info('Settings coming soon')}
          className={cn(
            "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900",
            collapsed ? 'justify-center' : 'space-x-3'
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
        
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-destructive/10 hover:text-destructive",
            collapsed ? 'justify-center' : 'space-x-3'
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
