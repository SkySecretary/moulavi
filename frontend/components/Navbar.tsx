'use client';

import React, { useState, useRef } from 'react';
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
  X,
  Plane,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  Search,
  Loader2,
  Edit2,
  Building,
  ArrowUpRight
} from 'lucide-react';
import NextLink from 'next/link';
import { Button } from '@/components/ui/button';
import { getUser, removeUser } from '@/lib/auth';
import { nusukAPI, authAPI, umrahVisaAPI } from '@/lib/api';
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

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  const [nusukTokenAlert, setNusukTokenAlert] = useState(false);

  React.useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'staff')) {
      nusukAPI.getSettings()
        .then(response => {
          if (response.data && response.data.isValid === false) {
            setNusukTokenAlert(true);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Focus input on open
  React.useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

  // Debounced search
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setSearching(true);
        const response = await nusukAPI.searchPassengers(searchQuery);
        setSearchResults(response.data || []);
      } catch (error) {
        console.error('Error searching passport:', error);
        toast.error('Search failed');
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleDownloadPDF = async (bookingId: string, bookingRef: string) => {
    try {
      setDownloadingId(bookingId);
      const response = await umrahVisaAPI.generateBookingPDF(bookingId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bookingRef || bookingId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Booking PDF downloaded successfully');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const mainTabs = isAdminOrStaff ? [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Tafweej', path: '/dashboard/umrah-visa/daily-overview', icon: Clock },
    { name: 'Voucher Management', path: '/dashboard/services/voucher', icon: Ticket },
    { name: 'Bookings', path: '/dashboard/umrah-visa/bookings', icon: FileText },
    { name: 'Trips', path: '/dashboard/umrah-visa/trip-info', icon: MapPin },
  ] : [
    { name: 'Dashboard', path: '/party/dashboard', icon: LayoutDashboard },
    { name: 'Tafweej', path: '/party/tafweej', icon: Clock },
    { name: 'Vouchers', path: '/dashboard/services/voucher', icon: Ticket },
    { name: 'New Individual', path: '/party/umrah-visa', icon: User },
    { name: 'New Group', path: '/party/umrah-visa-group', icon: Users },
  ];

  const appItems = isAdminOrStaff ? [
    { name: 'Assign Group', path: '/dashboard/umrah-visa/assign-group', icon: Users },
    { name: 'Missing BRN', path: '/dashboard/umrah-visa/missing-brn', icon: AlertCircle },
    { name: 'Missing Return Tickets', path: '/dashboard/umrah-visa/missing-return-ticket', icon: Plane },
    { name: 'Mismatched Travel', path: '/dashboard/umrah-visa/mismatched-travel', icon: AlertTriangle },
    { name: 'Consulate Review', path: '/dashboard/umrah-visa/consulate-review', icon: ShieldAlert },
    { name: 'Agent Compliance', path: '/dashboard/umrah-visa/agent-compliance', icon: Award },
    { name: 'Vouchers (Umrah)', path: '/dashboard/umrah-visa/voucher', icon: Award },
    { name: 'Invoices', path: '/dashboard/umrah-visa/invoice', icon: FileText },
  ] : [
    { name: 'Missing BRN', path: '/party/missing-brn', icon: AlertCircle },
    { name: 'Missing Return Tickets', path: '/party/missing-return-ticket', icon: Plane },
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
                <span className="text-white font-black text-xl">N</span>
              </div>
              <h1 className="text-xl font-black text-secondary tracking-tighter hidden md:block">NuSync</h1>
            </div>

            {/* Desktop Navigation Tabs */}
            <div className="hidden lg:flex items-center space-x-1">
              {mainTabs.map((tab) => (
                <div key={tab.path} className="flex items-center group/nav">
                  <button
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
                  <button 
                    onClick={(e) => { e.stopPropagation(); window.open(tab.path, '_blank'); }}
                    className="opacity-0 group-hover/nav:opacity-100 p-1.5 -ml-3 mr-1 bg-white rounded-full shadow-sm border border-gray-100 text-gray-400 hover:text-secondary hover:scale-110 transition-all z-10"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
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
                  {isAdminOrStaff ? "Download/Upload" : "Compliance & Tools"}
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isAppsDropdownOpen && "rotate-180")} />
                </button>

                {isAppsDropdownOpen && (
                  <div 
                    className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-[60]"
                    onMouseLeave={() => setIsAppsDropdownOpen(false)}
                  >
                    {appItems.map((item) => (
                      <div key={item.path} className="flex items-center group/dropdown">
                        <button
                          onClick={() => {
                            router.push(item.path);
                            setIsAppsDropdownOpen(false);
                          }}
                          className={cn(
                            "flex-1 text-left px-4 py-2 text-sm font-bold flex items-center gap-3 transition-colors",
                            pathname === item.path ? "text-primary bg-primary/5" : "text-gray-600 hover:bg-gray-50 hover:text-secondary"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.name}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); window.open(item.path, '_blank'); setIsAppsDropdownOpen(false); }}
                          className="opacity-0 group-hover/dropdown:opacity-100 p-1.5 mr-2 text-gray-400 hover:text-secondary hover:bg-gray-100 rounded-lg transition-all"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Passport Search Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-full text-slate-600 hover:bg-slate-100 hover:text-indigo-650 transition-colors flex items-center gap-1.5 border border-transparent hover:border-slate-200"
              title="Search Passport Number"
            >
              <Search className="h-5 w-5" />
              <span className="hidden lg:inline text-xs font-bold text-slate-700">Search Passport</span>
            </button>

            {isAdminOrStaff && nusukTokenAlert && (
              <button
                onClick={() => router.push('/dashboard/masters/nusuk')}
                className="p-2 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 animate-pulse transition-colors"
                title="Nusuk Authentication Failed! Click to fix."
              >
                <AlertTriangle className="h-5.5 w-5.5" />
              </button>
            )}

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
                        <div key={tab.path} className="flex items-center group/mobile-nav">
                          <button
                            onClick={() => router.push(tab.path)}
                            className={cn(
                              "flex-1 text-left px-4 py-3 rounded-xl flex items-center gap-3 font-bold transition-all",
                              isActive(tab.path) ? "bg-primary/10 text-secondary" : "text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            <tab.icon className="h-5 w-5" />
                            {tab.name}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); window.open(tab.path, '_blank'); }}
                            className="p-3 text-gray-400 hover:text-secondary"
                            title="Open in new tab"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Quick Actions</p>
                      <div className="grid grid-cols-2 gap-2 px-2">
                        {appItems.map((item) => (
                          <div key={item.path} className="relative group/mobile-app">
                            <button
                              onClick={() => router.push(item.path)}
                              className="w-full flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 hover:bg-primary/5 transition-colors group"
                            >
                              <item.icon className="h-5 w-5 text-gray-400 group-hover:text-primary mb-2" />
                              <span className="text-[10px] font-bold text-gray-600 text-center">{item.name}</span>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); window.open(item.path, '_blank'); }}
                              className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-secondary opacity-0 group-hover/mobile-app:opacity-100 transition-opacity"
                              title="Open in new tab"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </div>
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

      {/* Fullscreen Autocomplete Search Dialog Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/95 backdrop-blur-sm text-slate-100 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Search className="h-5 w-5" />
              <span className="font-semibold text-lg text-slate-200">Global Passport Search</span>
            </div>
            <button 
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Input Area */}
          <div className="px-6 py-6 border-b border-slate-800 bg-slate-950/40">
            <div className="max-w-4xl mx-auto relative">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type passport number to search..."
                className="w-full bg-slate-800/80 border border-slate-750 rounded-xl py-4 pl-12 pr-12 text-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              {searching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-indigo-450" />
              )}
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {searchQuery.trim() === '' ? (
                <div className="text-center py-20 text-slate-400">
                  <Search className="h-12 w-12 mx-auto mb-4 stroke-1 opacity-40 text-slate-450" />
                  <p className="text-base font-medium">Type a passport number to search passengers globally</p>
                  <p className="text-xs text-slate-500 mt-1">Results match active bookings in the system</p>
                </div>
              ) : searchResults.length === 0 && !searching ? (
                <div className="text-center py-20 text-slate-400">
                  <X className="h-12 w-12 mx-auto mb-4 stroke-1 opacity-40 text-rose-500" />
                  <p className="text-base font-medium">No passengers found matching "{searchQuery}"</p>
                  <p className="text-xs text-slate-500 mt-1">Check the passport number or try another query</p>
                </div>
              ) : (
                <>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Matching Records ({searchResults.length})
                  </div>
                  <div className="space-y-3">
                    {searchResults.map((result) => (
                      <div 
                        key={result.id}
                        className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 hover:bg-slate-850 hover:border-slate-600 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md text-left"
                      >
                        {/* Left Details Block */}
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-white">{result.fullName}</span>
                            <span className="bg-indigo-950 text-indigo-300 border border-indigo-900 text-[11px] font-mono font-bold px-2 py-0.5 rounded text-left">
                              {result.passportNumber}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5 ${
                              result.currentlyInKingdom === 'Yes' 
                                ? 'bg-emerald-950 text-emerald-350 border border-emerald-900' 
                                : 'bg-slate-900 text-slate-450 border border-slate-800'
                            }`}>
                              {result.currentlyInKingdom === 'Yes' ? 'In KSA' : 'Out of KSA'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-1.5 gap-x-4 text-xs text-slate-300 text-left">
                            <div className="flex items-center space-x-1 justify-start">
                              <Building className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                              <span className="text-slate-400">Agency:</span>
                              <span className="font-semibold text-slate-200 truncate">{result.booking.party.partyName}</span>
                            </div>
                            <div className="flex items-center space-x-1 justify-start">
                              <span className="text-slate-400">Booking:</span>
                              <span className="font-semibold text-indigo-300 font-mono">{result.booking.bookingReference}</span>
                            </div>
                            <div className="flex items-center space-x-1 justify-start">
                              <span className="text-slate-400">Voucher:</span>
                              {result.booking.voucher ? (
                                <span className="font-semibold text-emerald-400 font-mono">
                                  {result.booking.voucher.voucherNumber}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">No Voucher</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 sm:col-span-2 justify-start">
                              <span className="text-slate-400">Visa Status:</span>
                              <span className={`font-semibold ${
                                result.mutamerStatus.toLowerCase().includes('review')
                                  ? 'text-rose-400 font-bold'
                                  : 'text-slate-200'
                              }`}>
                                {result.mutamerStatus}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Block */}
                        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end border-t border-slate-700/50 md:border-t-0 pt-3 md:pt-0">
                          <Button
                            onClick={() => handleDownloadPDF(result.booking.id, result.booking.bookingReference)}
                            disabled={downloadingId === result.booking.id}
                            size="sm"
                            className="bg-slate-750 hover:bg-slate-700 border border-slate-650 text-slate-100 h-8 text-xs font-medium"
                          >
                            {downloadingId === result.booking.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <FileText className="h-3 w-3 mr-1 text-slate-400" />
                            )}
                            PDF
                          </Button>

                          <NextLink 
                            href={`/dashboard/umrah-visa/visa-management/edit/${result.booking.id}`}
                            onClick={() => setIsSearchOpen(false)}
                          >
                            <Button
                              size="sm"
                              className="bg-indigo-650 hover:bg-indigo-600 text-white h-8 text-xs font-medium border-0"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </NextLink>

                          {result.booking.voucher && (
                            <NextLink 
                              href={`/dashboard/services/voucher/view/${result.booking.voucher.id}`}
                              onClick={() => setIsSearchOpen(false)}
                            >
                              <Button
                                size="sm"
                                className="bg-emerald-650 hover:bg-emerald-600 text-white h-8 text-xs font-medium border-0"
                              >
                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                Voucher
                              </Button>
                            </NextLink>
                          )}

                          <NextLink 
                            href={`/dashboard/masters/party/${result.booking.party.id}`}
                            onClick={() => setIsSearchOpen(false)}
                          >
                            <Button
                              size="sm"
                              className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 h-8 text-xs font-medium"
                            >
                              <Building className="h-3 w-3 mr-1 text-slate-450" />
                              Agency
                            </Button>
                          </NextLink>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
