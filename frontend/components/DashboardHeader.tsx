'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { getUser, hasRole, removeUser } from '@/lib/auth';
import { authAPI, nusukAPI, umrahVisaAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { Menu, LogOut, User as UserIcon, Search, X, Loader2, FileText, Edit2, Building, ArrowUpRight } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

  // Debounced search
  useEffect(() => {
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

      {/* Fullscreen Autocomplete Search Dialog Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-sm text-slate-100 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Search className="h-5 w-5" />
              <span className="font-semibold text-lg text-slate-250">Global Passport Search</span>
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
                        className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 hover:bg-slate-850 hover:border-slate-600 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md"
                      >
                        {/* Left Details Block */}
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-white">{result.fullName}</span>
                            <span className="bg-indigo-950 text-indigo-300 border border-indigo-900 text-[11px] font-mono font-bold px-2 py-0.5 rounded">
                              {result.passportNumber}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5 ${
                              result.currentlyInKingdom === 'Yes' 
                                ? 'bg-emerald-950 text-emerald-355 border border-emerald-900' 
                                : 'bg-slate-900 text-slate-450 border border-slate-800'
                            }`}>
                              {result.currentlyInKingdom === 'Yes' ? 'In KSA' : 'Out of KSA'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-1.5 gap-x-4 text-xs text-slate-300">
                            <div className="flex items-center space-x-1">
                              <Building className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                              <span className="text-slate-400">Agency:</span>
                              <span className="font-semibold text-slate-200 truncate">{result.booking.party.partyName}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400">Booking:</span>
                              <span className="font-semibold text-indigo-300 font-mono">{result.booking.bookingReference}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400">Voucher:</span>
                              {result.booking.voucher ? (
                                <span className="font-semibold text-emerald-400 font-mono">
                                  {result.booking.voucher.voucherNumber}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">No Voucher</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 sm:col-span-2">
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
                              <Building className="h-3 w-3 mr-1 text-slate-400" />
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
    </>
  );
}
