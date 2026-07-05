'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { nusukAPI, partyAPI } from '@/lib/api';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  PlaneTakeoff,
  PlaneLanding,
  User,
  Hash,
  Clock,
  MapPin,
  Calendar,
  Loader2,
  Users,
  Building2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import Link from 'next/link';

interface MismatchDetails {
  mutamerName?: string;
  passportNumber?: string;
  groupNumber: string;
  expected?: number;
  actual?: number;
  entry?: {
    mismatched: boolean;
    dateTime?: { db: string; excel: string; mismatch: boolean };
    flight?: { db: string; excel: string; mismatch: boolean };
    port?: { db: string; excel: string; mismatch: boolean };
  };
  exit?: {
    mismatched: boolean;
    dateTime?: { db: string; excel: string; mismatch: boolean };
    flight?: { db: string; excel: string; mismatch: boolean };
    port?: { db: string; excel: string; mismatch: boolean };
  };
}

interface MismatchItem {
  id: string;
  bookingId: string;
  passengerId: string | null;
  mismatchType: 'entry' | 'exit' | 'both' | 'pax_count';
  details: MismatchDetails;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  booking: {
    id: string;
    bookingReference: string;
    groupNumber: string | null;
    groupName: string | null;
    status: string;
    party: {
      partyName: string;
    };
  };
  passenger?: {
    fullName: string;
    passportNumber: string;
  };
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function MismatchedTravelPage() {
  const router = useRouter();
  const user = getUser();
  
  // State
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [mismatches, setMismatches] = useState<MismatchItem[]>([]);
  const [filter, setFilter] = useState<'active' | 'resolved'>('active');
  
  // Search query & debounced search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mismatchType, setMismatchType] = useState<string>('all');
  const [selectedAgency, setSelectedAgency] = useState<string>('all');
  const [agencies, setAgencies] = useState<{ id: string; partyName: string }[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });
  
  // Expanded rows tracking
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadAgencies = async () => {
    try {
      const response = await partyAPI.getAll({ is_customer: 'true', limit: 1000 });
      if (response.data && response.data.parties) {
        setAgencies(response.data.parties);
      }
    } catch (error) {
      console.error('Error loading agencies:', error);
    }
  };

  const loadMismatches = async () => {
    try {
      setLoading(true);
      const response = await nusukAPI.getMismatches({
        resolved: filter === 'resolved',
        page: currentPage,
        limit: pageSize,
        mismatchType: mismatchType,
        partyId: selectedAgency,
        search: debouncedSearch || undefined
      });
      
      const data = response.data || { mismatches: [], pagination: { total: 0, page: 1, limit: pageSize, totalPages: 1 } };
      setMismatches(data.mismatches || []);
      setPagination(data.pagination || { total: 0, page: 1, limit: pageSize, totalPages: 1 });
    } catch (error) {
      console.error('Error loading mismatches:', error);
      toast.error('Failed to load travel mismatches');
    } finally {
      setLoading(false);
    }
  };

  // Load agencies on mount
  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    loadAgencies();
  }, []);

  // Reload mismatches when filters, search query or pages change
  useEffect(() => {
    if (user) {
      loadMismatches();
    }
  }, [filter, currentPage, pageSize, mismatchType, selectedAgency, debouncedSearch]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      toast.info('Triggering sync from Nusuk...');
      const response = await nusukAPI.triggerSync();
      toast.success(`Sync completed! ${response.data.mismatchesCount} discrepancies detected.`);
      setCurrentPage(1); // reset to page 1
      loadMismatches();
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast.error(error.response?.data?.error || error.message || 'Synchronization failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleResolve = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent row toggle
    try {
      setResolvingId(id);
      await nusukAPI.resolveMismatch(id);
      toast.success('Mismatch resolved successfully');
      // If we resolved, reload current page data
      loadMismatches();
    } catch (error: any) {
      console.error('Resolve failed:', error);
      toast.error(error.response?.data?.error || 'Failed to resolve mismatch');
    } finally {
      setResolvingId(null);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }) + ' ' + date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMismatchBadge = (type: string) => {
    switch (type) {
      case 'entry':
        return <Badge className="bg-sky-50 text-sky-700 hover:bg-sky-50 border-sky-200">Arrival Mismatch</Badge>;
      case 'exit':
        return <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-50 border-purple-200">Departure Mismatch</Badge>;
      case 'both':
        return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200">Arrival & Departure</Badge>;
      case 'pax_count':
        return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200">Count Mismatch</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getPageNumbers = () => {
    const totalPages = pagination.totalPages;
    const current = currentPage;
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    pages.push(1);

    let start = Math.max(2, current - 1);
    let end = Math.min(totalPages - 1, current + 1);

    if (current <= 2) {
      end = 4;
    } else if (current >= totalPages - 1) {
      start = totalPages - 3;
    }

    if (start > 2) {
      pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) {
      pages.push('...');
    }

    pages.push(totalPages);
    return pages;
  };

  if (!user) return null;

  return (
    <div className="flex-1">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              Mismatched Travel Details
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
              Review and correct booking flight info that does not match the Nusuk Portal report
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              onClick={handleSync}
              disabled={syncing || loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs lg:text-sm shadow-sm"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing Nusuk...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Report Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-8 space-y-4">
        {/* Navigation Tabs & Active Filter bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => { setFilter('active'); setCurrentPage(1); }}
              className={`pb-2 px-4 text-sm font-semibold border-b-2 transition-all ${
                filter === 'active'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Active Discrepancies
            </button>
            <button
              onClick={() => { setFilter('resolved'); setCurrentPage(1); }}
              className={`pb-2 px-4 text-sm font-semibold border-b-2 transition-all ${
                filter === 'resolved'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Resolved History
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="relative flex items-center bg-gray-50 border rounded-lg px-2.5 py-1.5 w-full sm:max-w-[240px] shadow-sm">
              <Search className="h-3.5 w-3.5 text-gray-400 mr-1.5 shrink-0" />
              <Input
                type="text"
                placeholder="Search Booking No or Passport..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-5 w-full border-none bg-transparent p-0 text-xs text-gray-800 placeholder-gray-400 focus-visible:ring-0 shadow-none focus-visible:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-gray-50 border rounded-lg px-2.5 py-1.5 shadow-sm">
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-500 font-medium">Type:</span>
              <select
                value={mismatchType}
                onChange={(e) => { setMismatchType(e.target.value); setCurrentPage(1); }}
                className="bg-transparent border-none text-gray-800 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="entry">Arrival Mismatches</option>
                <option value="exit">Departure Mismatches</option>
                <option value="both">Both (Arr & Dep)</option>
                <option value="pax_count">Count Mismatches</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-50 border rounded-lg px-2.5 py-1.5 shadow-sm min-w-[200px] max-w-[280px]">
              <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="text-gray-500 font-medium whitespace-nowrap">Agency:</span>
              <SearchableSelect
                options={[
                  { value: 'all', label: 'All Agencies' },
                  ...agencies.map((agency) => ({
                    value: agency.id,
                    label: agency.partyName
                  }))
                ]}
                value={selectedAgency}
                onValueChange={(val) => { setSelectedAgency(val); setCurrentPage(1); }}
                placeholder="All Agencies"
                searchPlaceholder="Search agency..."
                className="h-5 border-none bg-transparent hover:bg-transparent p-0 text-xs font-bold text-gray-800 shadow-none flex items-center justify-between focus-visible:ring-0 focus:ring-0 w-full"
              />
            </div>
          </div>
        </div>

        {/* Mismatches List Container */}
        {loading ? (
          <div className="space-y-3">
            <div className="h-10 bg-gray-50 animate-pulse rounded-lg" />
            <div className="h-12 bg-gray-50 animate-pulse rounded-lg" />
            <div className="h-12 bg-gray-50 animate-pulse rounded-lg" />
            <div className="h-12 bg-gray-50 animate-pulse rounded-lg" />
          </div>
        ) : mismatches.length === 0 ? (
          <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-3">
              <CheckCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-base font-bold text-gray-900">All Clear</CardTitle>
            <CardDescription className="max-w-xs mt-1">
              No matching travel discrepancies found for the selected filters.
            </CardDescription>
          </Card>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-3 w-10"></th>
                    <th className="p-3">Booking Ref</th>
                    <th className="p-3">Agency</th>
                    <th className="p-3">Group No</th>
                    <th className="p-3">Mutamer Details</th>
                    <th className="p-3">Mismatch Type</th>
                    <th className="p-3">Detected</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mismatches.map((item) => {
                    const isExpanded = !!expandedRows[item.id];
                    return (
                      <>
                        {/* Main Summary Row */}
                        <tr 
                          key={item.id} 
                          onClick={() => toggleRow(item.id)}
                          className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                            isExpanded ? 'bg-slate-50/50' : ''
                          }`}
                        >
                          <td className="p-3 text-center text-gray-400">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </td>
                          <td className="p-3 font-semibold text-indigo-600 font-mono">
                            {item.booking.bookingReference}
                          </td>
                          <td className="p-3 text-gray-700 font-medium max-w-[150px] truncate" title={item.booking.party.partyName}>
                            {item.booking.party.partyName}
                          </td>
                          <td className="p-3 text-gray-600 font-mono">
                            {item.booking.groupNumber || 'N/A'}
                          </td>
                          <td className="p-3">
                            {item.mismatchType === 'pax_count' ? (
                              <span className="text-rose-600 font-semibold flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                Expected: {item.details.expected} vs Actual: {item.details.actual}
                              </span>
                            ) : (
                              <div>
                                <div className="font-semibold text-gray-800">{item.details.mutamerName}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{item.details.passportNumber}</div>
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            {getMismatchBadge(item.mismatchType)}
                          </td>
                          <td className="p-3 text-gray-500 font-mono whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href={`/dashboard/umrah-visa/visa-management/edit/${item.bookingId}`} target="_blank" passHref>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] bg-white">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Booking
                                </Button>
                              </Link>
                              {filter === 'active' && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={(e) => handleResolve(item.id, e)}
                                  disabled={resolvingId === item.id}
                                  className="h-7 px-2 text-[10px] bg-green-600 hover:bg-green-700 text-white font-medium"
                                >
                                  {resolvingId === item.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Resolve
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded Compare Panel Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={8} className="p-4 border-t border-b">
                              <div className="space-y-4 max-w-4xl mx-auto py-1">
                                {/* Extra info header */}
                                {item.mismatchType !== 'pax_count' && (
                                  <div className="flex flex-wrap gap-4 text-xs bg-amber-50/30 p-2.5 rounded-lg border border-amber-100/50">
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                      <User className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                      <span>Mutamer: <strong className="text-gray-900">{item.details.mutamerName}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                      <Hash className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                      <span>Passport: <strong className="text-gray-900 font-mono">{item.details.passportNumber}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                      <Calendar className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                      <span>Nusuk Group No: <strong className="text-gray-900 font-mono">{item.details.groupNumber}</strong></span>
                                    </div>
                                  </div>
                                )}

                                {/* Entry Discrepancy details */}
                                {item.details.entry?.mismatched && (
                                  <div className="space-y-2">
                                    <h4 className="text-[11px] font-bold text-red-600 flex items-center gap-1.5 uppercase tracking-wider">
                                      <PlaneLanding className="h-3.5 w-3.5" />
                                      Arrival details comparison
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="bg-white border rounded-lg p-3 shadow-sm">
                                        <div className="text-[11px] font-bold text-slate-800 border-b pb-1 mb-2">Local Booking System</div>
                                        <div className="space-y-1.5 text-xs text-slate-700">
                                          <div className="flex justify-between">
                                            <span className="text-gray-500">Date/Time:</span>
                                            <span className="font-semibold text-slate-800">{formatDateTime(item.details.entry?.dateTime?.db)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-500">Flight:</span>
                                            <span className="font-semibold text-slate-800">{item.details.entry?.flight?.db || 'N/A'}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-500">Port Name:</span>
                                            <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]">{item.details.entry?.port?.db || 'N/A'}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="bg-red-50/30 border border-red-100 rounded-lg p-3 shadow-sm">
                                        <div className="text-[11px] font-bold text-red-800 border-b border-red-100 pb-1 mb-2">Nusuk Excel Report</div>
                                        <div className="space-y-1.5 text-xs text-slate-700">
                                          <div className="flex justify-between">
                                            <span className="text-gray-500">Date/Time:</span>
                                            <span className={`font-semibold ${item.details.entry?.dateTime?.mismatch ? 'text-red-600 bg-red-50 px-1 rounded border border-red-100' : 'text-slate-800'}`}>
                                              {formatDateTime(item.details.entry?.dateTime?.excel)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-500">Flight:</span>
                                            <span className={`font-semibold ${item.details.entry?.flight?.mismatch ? 'text-red-600 bg-red-50 px-1 rounded border border-red-100' : 'text-slate-800'}`}>
                                              {item.details.entry?.flight?.excel || 'N/A'}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-500">Port Name:</span>
                                            <span className={`font-semibold ${item.details.entry?.port?.mismatch ? 'text-red-600 bg-red-50 px-1 rounded border border-red-100 text-right truncate max-w-[200px]' : 'text-slate-800 text-right truncate max-w-[200px]'}`}>
                                              {item.details.entry?.port?.excel || 'N/A'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Exit Discrepancy details */}
                                {item.details.exit?.mismatched && (
                                  <div className="space-y-2">
                                    <h4 className="text-[11px] font-bold text-red-600 flex items-center gap-1.5 uppercase tracking-wider">
                                      <PlaneTakeoff className="h-3.5 w-3.5" />
                                      Departure details comparison
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="bg-white border rounded-lg p-3 shadow-sm">
                                        <div className="text-[11px] font-bold text-slate-800 border-b pb-1 mb-2">Local Booking System</div>
                                        <div className="space-y-1.5 text-xs text-slate-700">
                                          <div className="flex justify-between">
                                            <span className="text-gray-500">Date/Time:</span>
                                            <span className="font-semibold text-slate-800">{formatDateTime(item.details.exit?.dateTime?.db)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-500">Flight:</span>
                                            <span className="font-semibold text-slate-800">{item.details.exit?.flight?.db || 'N/A'}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-500">Port Name:</span>
                                            <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]">{item.details.exit?.port?.db || 'N/A'}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="bg-red-50/30 border border-red-100 rounded-lg p-3 shadow-sm">
                                        <div className="text-[11px] font-bold text-red-800 border-b border-red-100 pb-1 mb-2">Nusuk Excel Report</div>
                                        <div className="space-y-1.5 text-xs text-slate-700">
                                          <div className="flex justify-between">
                                            <span className="text-gray-500">Date/Time:</span>
                                            <span className={`font-semibold ${item.details.exit?.dateTime?.mismatch ? 'text-red-600 bg-red-50 px-1 rounded border border-red-100' : 'text-slate-800'}`}>
                                              {formatDateTime(item.details.exit?.dateTime?.excel)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-500">Flight:</span>
                                            <span className={`font-semibold ${item.details.exit?.flight?.mismatch ? 'text-red-600 bg-red-50 px-1 rounded border border-red-100' : 'text-slate-800'}`}>
                                              {item.details.exit?.flight?.excel || 'N/A'}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-500">Port Name:</span>
                                            <span className={`font-semibold ${item.details.exit?.port?.mismatch ? 'text-red-600 bg-red-50 px-1 rounded border border-red-100 text-right truncate max-w-[200px]' : 'text-slate-800 text-right truncate max-w-[200px]'}`}>
                                              {item.details.exit?.port?.excel || 'N/A'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Passenger count discrepancy details */}
                                {item.mismatchType === 'pax_count' && (
                                  <div className="bg-rose-50/30 border border-rose-100 rounded-lg p-3 shadow-sm">
                                    <div className="text-[11px] font-bold text-rose-800 border-b border-rose-100 pb-1 mb-2">Passenger Count Mismatch Details</div>
                                    <p className="text-xs text-slate-700 leading-relaxed">
                                      The local booking has been configured to expect <strong className="text-slate-900">{item.details.expected}</strong> passengers. However, the synced report from the Nusuk portal currently maps to <strong className="text-rose-600">{item.details.actual}</strong> successfully processed mutamers.
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-2">
                                      Check if passengers were added/removed from this booking or if group records on Nusuk are out of date.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="bg-slate-50 border-t px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }}
                  className="bg-white border rounded px-1.5 py-1 text-gray-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span>entries per page</span>
              </div>

              <div>
                Showing{' '}
                <span className="font-semibold text-gray-900">
                  {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-gray-900">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-gray-900">{pagination.total}</span>{' '}
                discrepancies
              </div>

              <div className="flex items-center gap-1 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  className="h-7 w-7 p-0 bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {getPageNumbers().map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`ell-${idx}`} className="px-1.5 text-gray-400 font-bold text-xs select-none">
                        ...
                      </span>
                    );
                  }
                  return (
                    <Button
                      key={p}
                      variant={currentPage === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(p as number)}
                      disabled={loading}
                      className={`h-7 w-7 p-0 font-medium ${
                        currentPage === p ? 'bg-indigo-600 text-white' : 'bg-white'
                      }`}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                  disabled={currentPage === pagination.totalPages || loading}
                  className="h-7 w-7 p-0 bg-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
