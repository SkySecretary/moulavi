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
  RefreshCw
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
  bookingId: string;
  bookingReference: string | null;
  groupNumber: string | null;
  groupName: string | null;
  partyId: string;
  partyName: string;
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
  
  // State
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState<ConsulateReviewPassenger[]>([]);
  
  // Search query & debounced search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedAgency, setSelectedAgency] = useState<string>('all');
  const [agencies, setAgencies] = useState<{ id: string; partyName: string }[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });

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

  const loadPassengers = async () => {
    try {
      setLoading(true);
      const response = await nusukAPI.getConsulateReview({
        page: currentPage,
        limit: pageSize,
        partyId: selectedAgency,
        search: debouncedSearch || undefined
      });
      
      if (response.data) {
        setPassengers(response.data.passengers || []);
        if (response.data.pagination) {
          setPagination({
            total: response.data.pagination.total,
            page: response.data.pagination.page,
            limit: response.data.pagination.limit,
            totalPages: response.data.pagination.totalPages
          });
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
    loadAgencies();
  }, []);

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      loadPassengers();
    }
  }, [currentPage, pageSize, selectedAgency, debouncedSearch]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 space-y-6 p-4 lg:p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 flex items-center gap-2.5 tracking-tight">
            <ShieldAlert className="h-8 w-8 text-rose-600 shrink-0" />
            Consulate Review Applications
          </h1>
          <p className="text-xs lg:text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">
            Pilgrims without visa numbers in Nusuk report
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <Card className="border-none shadow-sm bg-white rounded-2xl">
        <CardContent className="p-4 lg:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search name, passport, mofa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl text-xs font-semibold"
              />
            </div>

            {/* Agency Selection */}
            <div className="flex items-center gap-2 min-w-[240px]">
              <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="w-full">
                <SearchableSelect
                  placeholder="All Agencies"
                  options={[
                    { value: 'all', label: 'All Agencies' },
                    ...agencies.map((agency) => ({
                      value: agency.id,
                      label: agency.partyName
                    }))
                  ]}
                  value={selectedAgency}
                  onValueChange={(val) => {
                    setSelectedAgency(val);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPassengers}
              className="h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Passenger Table List */}
      <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fetching consulate applications...</span>
            </div>
          ) : passengers.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <FileText className="h-12 w-12 text-slate-350 mx-auto" />
              <div className="text-sm font-bold text-slate-650 uppercase tracking-wide">No consulate review applications found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No active passengers without visa numbers were identified in the latest Nusuk reports.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6">Mutamer Name</th>
                    <th className="py-4 px-6">Passport Number</th>
                    <th className="py-4 px-6">MoFA Number</th>
                    <th className="py-4 px-6">Nationality</th>
                    <th className="py-4 px-6">Group Info</th>
                    <th className="py-4 px-6">Agency / Client</th>
                    <th className="py-4 px-6">Status / Time</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {passengers.map((passenger) => (
                    <tr
                      key={passenger.id}
                      className="border-b border-slate-100 hover:bg-slate-50/40 transition duration-150"
                    >
                      {/* Name */}
                      <td className="py-4.5 px-6 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-indigo-650 shrink-0" />
                          <span>{passenger.fullName}</span>
                        </div>
                      </td>

                      {/* Passport */}
                      <td className="py-4.5 px-6 font-mono font-bold text-slate-700">
                        {passenger.passportNumber}
                      </td>

                      {/* MoFA Number */}
                      <td className="py-4.5 px-6 font-mono font-bold text-slate-700">
                        {passenger.mofaNumber || '-'}
                      </td>

                      {/* Nationality */}
                      <td className="py-4.5 px-6 font-medium text-slate-500">
                        {passenger.nationality || '-'}
                      </td>

                      {/* Group Details */}
                      <td className="py-4.5 px-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono font-semibold text-indigo-650 text-[10px]">
                            {passenger.groupNumber || 'No Group'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {passenger.groupName || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Agency */}
                      <td className="py-4.5 px-6 font-medium text-slate-650">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{passenger.partyName}</span>
                        </div>
                      </td>

                      {/* Status / Timestamp */}
                      <td className="py-4.5 px-6">
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-[9px] w-fit font-bold uppercase tracking-tight bg-rose-50 text-rose-700 border-rose-100">
                            {passenger.mutamerStatus || 'Consulate Review'}
                          </Badge>
                          <span className="text-[9px] text-slate-400 font-mono flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(passenger.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4.5 px-6 text-right">
                        <Link
                          href={`/dashboard/umrah-visa/visa-management/edit/${passenger.bookingId}`}
                          target="_blank"
                          passHref
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold text-xs inline-flex items-center gap-1 h-8 px-3 rounded-lg"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Edit Booking
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && passengers.length > 0 && (
            <div className="border-t border-slate-100 py-4 px-6 flex items-center justify-between bg-slate-50/20 text-xs">
              <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                Showing {passengers.length} of {pagination.total} records
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-bold text-slate-700">
                  Page {currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === pagination.totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
