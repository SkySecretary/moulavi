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
  AlertTriangle,
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
  RefreshCw,
  Calendar,
  Plane,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface OverstayRecord {
  id: string;
  fullName: string;
  passportNumber: string;
  nationalityName: string | null;
  visaNumber: string | null;
  mofaNumber: string | null;
  groupNumber: string | null;
  groupName: string | null;
  umrahCompanyName: string | null;
  eaName: string | null;
  subEAName: string | null;
  entryDate: string | null;
  entryCarrierNumber: string | null;
  entryPortName: string | null;
  totalResidencyDays: number;
  remainingResidencyDays: number;
  daysInKsa: number;
  isOver85Days: boolean;
  mutamerAge?: number | null;
  mutamerGender?: string | null;
  syncedAt: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function Overstay85DaysPage() {
  const router = useRouter();
  const user = getUser();
  
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<OverstayRecord[]>([]);
  
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

  const loadRecords = async () => {
    try {
      setLoading(true);
      const response = await nusukAPI.getOverstay85Days({
        page: currentPage,
        limit: pageSize,
        umrahCompany: selectedUmrahCompany !== 'all' ? selectedUmrahCompany : undefined,
        eaCode: selectedEACode !== 'all' ? selectedEACode : undefined,
        search: debouncedSearch || undefined,
      });
      
      if (response.data) {
        setRecords(response.data.records || []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      }
    } catch (error: any) {
      console.error('Failed to load overstay records:', error);
      toast.error('Failed to load 85+ Days Overstay records');
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
      loadRecords();
    }
  }, [currentPage, pageSize, selectedUmrahCompany, selectedEACode, debouncedSearch]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 pb-16">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
              Over 85 Days Stay in KSA (Critical Overstay Risk)
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
              Live monitoring of pilgrims approaching or exceeding 90-day maximum residency limit in Saudi Arabia
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/umrah-visa/consulate-review">
              <Button variant="outline" size="sm" className="text-xs gap-1">
                Consulate Review
              </Button>
            </Link>
            <Button
              onClick={loadRecords}
              disabled={loading}
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh List
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* Warning Banner */}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <p className="font-semibold">Urgent Operational Action Required</p>
            <p className="mt-0.5 text-rose-800/90">
              The pilgrims listed below have spent 85 or more days inside the Kingdom of Saudi Arabia without a confirmed departure recorded in Nusuk.
              Immediate repatriation or exit travel confirmation must be coordinated with the respective Sub-Agents and Umrah Companies.
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by Passport, Pilgrim Name, Visa #, MOFA #, Group Code..."
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
                Found {pagination.total} Critical Overstay Risks
              </span>
              <span className="text-xs text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
                <p className="text-sm font-medium">Scanning Nusuk records for overstay risks...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="font-medium">No pilgrims found matching over 85 days stay in KSA.</p>
                <p className="text-xs text-gray-400 mt-1">All active pilgrims are within compliant residency limits.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 border-b text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Pilgrim Name / Passport</th>
                      <th className="py-3 px-4">Visa & MOFA #</th>
                      <th className="py-3 px-4">Entry Date / Port</th>
                      <th className="py-3 px-4 text-center">Days in KSA</th>
                      <th className="py-3 px-4 text-center">Remaining Days</th>
                      <th className="py-3 px-4">Umrah Company</th>
                      <th className="py-3 px-4">External Agent / Sub-Agent</th>
                      <th className="py-3 px-4">Group Code / Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {records.map(rec => {
                      const isExpired = rec.daysInKsa >= 90 || rec.remainingResidencyDays <= 0;
                      const isCritical = rec.daysInKsa >= 88 || rec.remainingResidencyDays <= 2;

                      return (
                        <tr key={rec.id} className="hover:bg-rose-50/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-900">{rec.fullName}</div>
                            <div className="font-mono text-xs text-indigo-700 font-bold mt-0.5">
                              {rec.passportNumber}
                              {rec.nationalityName ? ` (${rec.nationalityName})` : ''}
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono text-xs text-gray-700">
                            <div>Visa: <span className="font-semibold text-gray-900">{rec.visaNumber || 'N/A'}</span></div>
                            <div className="text-gray-500">MOFA: {rec.mofaNumber || 'N/A'}</div>
                          </td>

                          <td className="py-3 px-4 text-xs text-gray-700">
                            <div className="flex items-center gap-1 font-medium">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              {rec.entryDate ? new Date(rec.entryDate).toLocaleDateString() : 'Date N/A'}
                            </div>
                            <div className="text-gray-500 text-[11px] flex items-center gap-1 mt-0.5">
                              <Plane className="h-3 w-3 text-gray-400" />
                              {rec.entryCarrierNumber || ''} {rec.entryPortName ? `(${rec.entryPortName})` : ''}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <Badge className={isExpired ? 'bg-rose-600 text-white' : isCritical ? 'bg-orange-500 text-white' : 'bg-amber-100 text-amber-900'}>
                              {rec.daysInKsa} Days
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-center">
                            {isExpired ? (
                              <span className="font-bold text-rose-700 text-xs uppercase tracking-wider">
                                EXPIRED ({Math.abs(rec.remainingResidencyDays)}d ago)
                              </span>
                            ) : (
                              <span className="font-semibold text-amber-800 text-xs">
                                {rec.remainingResidencyDays} Days Left
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-xs text-gray-900 font-medium">
                            {rec.umrahCompanyName || 'N/A'}
                          </td>

                          <td className="py-3 px-4 text-xs text-gray-700">
                            <div className="font-medium text-gray-900">{rec.eaName || 'N/A'}</div>
                            {rec.subEAName && (
                              <div className="text-indigo-700 text-[11px] font-semibold">
                                Sub: {rec.subEAName}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-xs text-gray-700 max-w-[200px] truncate">
                            <div className="font-mono text-gray-900">{rec.groupNumber || 'N/A'}</div>
                            <div className="text-gray-500 text-[11px] truncate">{rec.groupName || ''}</div>
                          </td>
                        </tr>
                      );
                    })}
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
    </div>
  );
}
