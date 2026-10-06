'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { nusukAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Clock,
  User,
  Hash,
  Loader2,
  Users,
  Building2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  ExternalLink,
  ShieldAlert,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface ConsulateReviewPassenger {
  id: string;
  fullName: string;
  passportNumber: string;
  nationality: string | null;
  mofaNumber: string | null;
  mutamerStatus: string | null;
  visaNumber: string | null;
  bookingId?: string;
  bookingReference?: string | null;
  groupNumber?: string | null;
  groupName?: string | null;
  partyId?: string;
  partyName?: string;
  umrahCompanyName?: string | null;
  eaName?: string | null;
  subEAName?: string | null;
  mofaIssueDate?: string | null;
  age?: number | null;
  updatedAt: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ConsulateReviewPage() {
  const router = useRouter();
  const user = getUser();
  
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState<ConsulateReviewPassenger[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedUmrahCompany, setSelectedUmrahCompany] = useState<string>('all');
  const [selectedEACode, setSelectedEACode] = useState<string>('all');

  const [filterOptions, setFilterOptions] = useState<{
    umrahCompanies: string[];
    externalAgents: { eaName: string; eaCode: number }[];
  }>({
    umrahCompanies: [],
    externalAgents: [],
  });

  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadFilterOptions = async () => {
    try {
      const res = await nusukAPI.getFilters();
      if (res.data) {
        setFilterOptions({
          umrahCompanies: res.data.umrahCompanies || [],
          externalAgents: res.data.externalAgents || [],
        });
      }
    } catch (err) {
      console.warn('Failed to load filter options:', err);
    }
  };

  const loadPassengers = async () => {
    try {
      setLoading(true);
      const response = await nusukAPI.getConsulateReview({
        page: currentPage,
        limit: pageSize,
        umrahCompany: selectedUmrahCompany !== 'all' ? selectedUmrahCompany : undefined,
        eaCode: selectedEACode !== 'all' ? selectedEACode : undefined,
        search: debouncedSearch || undefined,
      });
      
      if (response.data) {
        setPassengers(response.data.passengers || []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      }
    } catch (error: any) {
      console.error('Failed to load consulate review list:', error);
      toast.error('Failed to load Consulate Review records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    loadFilterOptions();
  }, []);

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      loadPassengers();
    }
  }, [currentPage, pageSize, selectedUmrahCompany, selectedEACode, debouncedSearch]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 space-y-6 p-4 lg:p-8 max-w-7xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
            <ShieldAlert className="h-8 w-8 text-amber-600 shrink-0" />
            Consulate Review Applications
          </h1>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">
            Pilgrims under Consulate Review, Visa Not Issued, or Pending MOFA status in Nusuk Masar
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/umrah-visa/overstay-85-days">
            <Button variant="outline" size="sm" className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Over 85 Days Stay Alert
            </Button>
          </Link>
          <Button
            onClick={loadPassengers}
            disabled={loading}
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by Passport, Name, MOFA #, Group Code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            {/* Umrah Company Filter */}
            <div>
              <select
                value={selectedUmrahCompany}
                onChange={e => {
                  setSelectedUmrahCompany(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Umrah Companies</option>
                {filterOptions.umrahCompanies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* External Agent Filter */}
            <div>
              <select
                value={selectedEACode}
                onChange={e => {
                  setSelectedEACode(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All External Agents</option>
                {filterOptions.externalAgents.map(ea => (
                  <option key={ea.eaCode} value={String(ea.eaCode)}>{ea.eaName} ({ea.eaCode})</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b py-3 px-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">
              Found {pagination.total} Consulate Review Cases
            </span>
            <span className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              <p className="text-sm font-medium">Loading Consulate Review records...</p>
            </div>
          ) : passengers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="font-medium">No Consulate Review applications found.</p>
              <p className="text-xs text-gray-400 mt-1">All applications are either issued or clear.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Pilgrim Name / Passport</th>
                    <th className="py-3 px-4">MOFA # / Issue Date</th>
                    <th className="py-3 px-4">Nusuk Status</th>
                    <th className="py-3 px-4">Umrah Company</th>
                    <th className="py-3 px-4">External Agent / Sub-Agent</th>
                    <th className="py-3 px-4">Group Code / Name</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {passengers.map(p => (
                    <tr key={p.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{p.fullName}</div>
                        <div className="font-mono text-xs text-indigo-700 font-bold mt-0.5">
                          {p.passportNumber}
                          {p.nationality ? ` (${p.nationality})` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-gray-700">
                        <div>MOFA: <span className="font-semibold text-gray-900">{p.mofaNumber || 'N/A'}</span></div>
                        <div className="text-gray-500 text-[11px]">
                          {p.mofaIssueDate ? new Date(p.mofaIssueDate).toLocaleDateString() : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          {p.mutamerStatus || 'Consulate Review'}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-xs text-gray-900 font-medium">
                        {p.umrahCompanyName || 'N/A'}
                      </td>

                      <td className="py-3 px-4 text-xs text-gray-700">
                        <div className="font-medium text-gray-900">{p.eaName || 'N/A'}</div>
                        {p.subEAName && (
                          <div className="text-indigo-700 text-[11px] font-semibold">
                            Sub: {p.subEAName}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs text-gray-700 max-w-[200px] truncate">
                        <div className="font-mono text-gray-900">{p.groupNumber || 'N/A'}</div>
                        <div className="text-gray-500 text-[11px] truncate">{p.groupName || ''}</div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {p.bookingId ? (
                          <Link href={`/dashboard/umrah-visa/visa-management/view/${p.bookingId}`}>
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-indigo-600 gap-1">
                              View Booking
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="gap-1 text-xs"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-xs text-gray-500">
            Page {currentPage} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= pagination.totalPages || loading}
            className="gap-1 text-xs"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
