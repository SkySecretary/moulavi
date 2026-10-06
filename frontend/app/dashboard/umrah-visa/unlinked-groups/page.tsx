'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { nusukAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  FolderX,
  ExternalLink,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  Plane
} from 'lucide-react';
import Link from 'next/link';

interface SampleMutamer {
  fullName: string;
  passportNumber: string;
  visaNumber?: string | null;
  mofaNumber?: string | null;
  mutamerStateName?: string | null;
  entryDate?: string | null;
  exitDate?: string | null;
}

interface UnmatchedGroup {
  groupNumber: string;
  groupName: string;
  eaName: string;
  eaCode: number;
  subEAName: string;
  subEACode?: number | null;
  umrahCompanyName: string;
  totalPax: number;
  visasIssued: number;
  inKsa: number;
  firstDate?: string | null;
  sampleMutamers: SampleMutamer[];
}

export default function UnlinkedGroupsPage() {
  const router = useRouter();
  const user = getUser();

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<UnmatchedGroup[]>([]);
  const [totalUnmatchedGroups, setTotalUnmatchedGroups] = useState(0);
  const [totalUnmatchedPax, setTotalUnmatchedPax] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const [totalPages, setTotalPages] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadUnmatchedGroups = async () => {
    try {
      setLoading(true);
      const res = await nusukAPI.getUnmatchedGroups({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
      });

      if (res.data) {
        setGroups(res.data.unmatchedGroups || []);
        setTotalUnmatchedGroups(res.data.totalUnmatchedGroups || 0);
        setTotalUnmatchedPax(res.data.totalUnmatchedPax || 0);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
        }
      }
    } catch (error: any) {
      console.error('Error fetching unmatched Nusuk groups:', error);
      toast.error('Failed to load unlinked groups from Nusuk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    loadUnmatchedGroups();
  }, [currentPage, pageSize, debouncedSearch]);

  if (!user) return null;

  return (
    <div className="flex-1 pb-16">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FolderX className="h-6 w-6 text-indigo-600" />
              Unlinked Nusuk Groups
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
              Groups present in Nusuk Masar that are not yet linked to any booking in your system.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => loadUnmatchedGroups()}
              variant="outline"
              size="sm"
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/dashboard/umrah-visa-group">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm">
                <PlusCircle className="h-4 w-4" />
                Create Group Booking
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-indigo-100 bg-indigo-50/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Unlinked Groups</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{totalUnmatchedGroups.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <FolderX className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Nusuk groups with no matching system booking</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Total Unlinked Mutamers</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{totalUnmatchedPax.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Users className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Pilgrims registered under these unlinked groups</p>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Quick Action</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">Assign Group Numbers</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <PlusCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <Link
                href="/dashboard/umrah-visa/assign-group"
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 mt-2 inline-flex items-center gap-1"
              >
                Go to Assign Group Page →
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search group number, group name, EA..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              <div className="text-xs text-gray-500">
                Showing {groups.length} of {totalUnmatchedGroups} unlinked groups
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Groups Listing */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm">Fetching unlinked Nusuk groups...</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-base font-semibold text-gray-800">All Nusuk Groups Linked!</p>
                <p className="text-xs text-gray-500 mt-1">Every group from Nusuk Masar is matched with a booking in the system.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 border-b text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Group Number / Name</th>
                      <th className="py-3 px-4">External Agent (EA)</th>
                      <th className="py-3 px-4">Sub-EA / Agency</th>
                      <th className="py-3 px-4">Umrah Company</th>
                      <th className="py-3 px-4 text-center">Total Pax</th>
                      <th className="py-3 px-4 text-center">Visas</th>
                      <th className="py-3 px-4 text-center">In KSA</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {groups.map(group => {
                      const isExpanded = expandedGroup === group.groupNumber;
                      return (
                        <>
                          <tr key={group.groupNumber} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-medium text-gray-900">
                              <div className="flex flex-col">
                                <span className="font-mono text-sm font-bold text-indigo-700">
                                  #{group.groupNumber}
                                </span>
                                <span className="text-xs text-gray-600 truncate max-w-xs" title={group.groupName}>
                                  {group.groupName}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-gray-700">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 truncate max-w-xs">{group.eaName}</span>
                                <span className="text-gray-400 font-mono text-[10px]">EA Code: {group.eaCode}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-gray-600">
                              {group.subEAName && group.subEAName !== 'N/A' ? (
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-800 truncate max-w-xs">{group.subEAName}</span>
                                  {group.subEACode && <span className="text-gray-400 font-mono text-[10px]">Sub-EA: {group.subEACode}</span>}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-gray-600 truncate max-w-xs">
                              {group.umrahCompanyName}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                              <Badge variant="outline" className="font-mono font-bold bg-slate-50">
                                {group.totalPax}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-center font-medium text-emerald-700">
                              {group.visasIssued}
                            </td>
                            <td className="py-3.5 px-4 text-center font-medium text-indigo-600">
                              {group.inKsa > 0 ? (
                                <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
                                  {group.inKsa}
                                </Badge>
                              ) : (
                                <span className="text-gray-400">0</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedGroup(isExpanded ? null : group.groupNumber)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 h-7 px-2"
                              >
                                {isExpanded ? 'Hide Pilgrims' : 'View Pilgrims'}
                              </Button>
                              <Link href={`/dashboard/umrah-visa/assign-group?search=${group.groupNumber}`}>
                                <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                                  Assign
                                </Button>
                              </Link>
                            </td>
                          </tr>

                          {/* Expanded Mutamers View */}
                          {isExpanded && (
                            <tr key={`${group.groupNumber}-expanded`} className="bg-indigo-50/30">
                              <td colSpan={8} className="p-4">
                                <div className="rounded-lg border border-indigo-100 bg-white p-4 shadow-inner">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                      <Users className="h-4 w-4 text-indigo-600" />
                                      Pilgrims in Group #{group.groupNumber} (Showing up to {group.sampleMutamers.length} of {group.totalPax})
                                    </h4>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
                                        <tr>
                                          <th className="py-2 px-3">Name</th>
                                          <th className="py-2 px-3">Passport #</th>
                                          <th className="py-2 px-3">Visa #</th>
                                          <th className="py-2 px-3">MOFA #</th>
                                          <th className="py-2 px-3">Status</th>
                                          <th className="py-2 px-3">Entry Date</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {group.sampleMutamers.map((m, idx) => (
                                          <tr key={idx} className="hover:bg-gray-50">
                                            <td className="py-2 px-3 font-medium text-gray-900">{m.fullName}</td>
                                            <td className="py-2 px-3 font-mono text-gray-700">{m.passportNumber}</td>
                                            <td className="py-2 px-3 font-mono text-emerald-700">{m.visaNumber || '—'}</td>
                                            <td className="py-2 px-3 font-mono text-gray-500">{m.mofaNumber || '—'}</td>
                                            <td className="py-2 px-3 text-gray-600">{m.mutamerStateName || '—'}</td>
                                            <td className="py-2 px-3 text-gray-600">
                                              {m.entryDate ? new Date(m.entryDate).toLocaleDateString() : '—'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
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
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <div className="text-xs text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || loading}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || loading}
                    className="h-8 px-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
