'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  X,
  Loader2,
  Copy,
  Check,
  FileText,
  Edit2,
  Building2,
  Calendar,
  Compass,
  MapPin,
  Plane,
  User,
  ShieldCheck,
  AlertCircle,
  Hash,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Download,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';
import { nusukAPI, umrahVisaAPI, voucherAPI } from '@/lib/api';
import { generateVoucherPDF } from '@/lib/pdf/voucherPdfGenerator';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function PassportSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_ksa' | 'out_ksa' | 'visa_issued' | 'review'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'days'>('recent');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedPassport, setCopiedPassport] = useState<string | null>(null);

  // Sync with URL param
  useEffect(() => {
    if (queryParam) {
      setSearchQuery(queryParam);
      performSearch(queryParam);
    }
  }, [queryParam]);

  const performSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await nusukAPI.searchPassengers(trimmed);
      setResults(response.data || []);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Failed to search passengers');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push(`/dashboard/passport-search?q=${encodeURIComponent(trimmed)}`);
      performSearch(trimmed);
    }
  };

  const handleCopyPassport = (passportNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!passportNumber) return;
    navigator.clipboard.writeText(passportNumber);
    setCopiedPassport(passportNumber);
    toast.success(`Copied "${passportNumber}" to clipboard`);
    setTimeout(() => setCopiedPassport(null), 2000);
  };

  const handleDownloadBookingPDF = async (bookingId: string, bookingRef: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloadingId(`booking-${bookingId}`);
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
      toast.success('Booking PDF downloaded');
    } catch (err) {
      console.error('Error downloading booking PDF:', err);
      toast.error('Failed to download booking PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadVoucherPDF = async (voucherId: string, voucherNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloadingId(`voucher-${voucherId}`);
      const response = await voucherAPI.getVoucherById(voucherId);
      if (response.data?.voucher) {
        generateVoucherPDF(response.data.voucher);
        toast.success(`Voucher #${voucherNumber} downloaded`);
      } else {
        toast.error('Voucher details not found');
      }
    } catch (err) {
      console.error('Error downloading voucher PDF:', err);
      toast.error('Failed to download voucher PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  // Filter & Sort
  const filteredResults = results
    .filter((p) => {
      if (activeFilter === 'in_ksa') return p.currentlyInKingdom === 'Yes';
      if (activeFilter === 'out_ksa') return p.currentlyInKingdom !== 'Yes';
      if (activeFilter === 'visa_issued') return !!p.visaNumber || (p.mutamerStatus && !p.mutamerStatus.toLowerCase().includes('review'));
      if (activeFilter === 'review') return p.isConsulateReview || (p.mutamerStatus && p.mutamerStatus.toLowerCase().includes('review'));
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
      if (sortBy === 'days') return (b.daysInKingdom || 0) - (a.daysInKingdom || 0);
      return 0; // Default: recent by DB order
    });

  const countTotal = results.length;
  const countInKSA = results.filter((p) => p.currentlyInKingdom === 'Yes').length;
  const countVisaIssued = results.filter((p) => !!p.visaNumber || (p.mutamerStatus && !p.mutamerStatus.toLowerCase().includes('review'))).length;
  const countReview = results.filter((p) => p.isConsulateReview || (p.mutamerStatus && p.mutamerStatus.toLowerCase().includes('review'))).length;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header Banner */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Search className="h-5 w-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Global Passport & Passenger Search
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Lookup any passenger across bookings by passport number, name, visa number, or reference code.
              </p>
            </div>

            {/* Quick action info */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => performSearch(searchQuery)}
                disabled={searching || !searchQuery.trim()}
                className="h-9 text-xs font-bold border-gray-200 hover:bg-gray-100 gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${searching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Big Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mt-4">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter passport number (e.g. W0055252), passenger name, visa number, border number, booking ref..."
                className="w-full pl-12 pr-32 py-3.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-300 focus:border-indigo-600 rounded-xl text-base font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-xs"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setResults([]);
                      router.push('/dashboard/passport-search');
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={searching || !searchQuery.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-4 rounded-lg shadow-sm"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stat Cards */}
        {countTotal > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="bg-white border-gray-200/80 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Matches</p>
                  <p className="text-xl font-black text-gray-900">{countTotal}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200/80 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">In Kingdom</p>
                  <p className="text-xl font-black text-emerald-950">{countInKSA}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200/80 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Visa Issued</p>
                  <p className="text-xl font-black text-blue-950">{countVisaIssued}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200/80 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Consulate Review</p>
                  <p className="text-xl font-black text-rose-950">{countReview}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter & Sort Controls */}
        {countTotal > 0 && (
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Filter:
              </span>
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Records ({countTotal})
              </button>
              <button
                onClick={() => setActiveFilter('in_ksa')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'in_ksa'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                In KSA ({countInKSA})
              </button>
              <button
                onClick={() => setActiveFilter('out_ksa')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'out_ksa'
                    ? 'bg-gray-800 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Out of KSA ({countTotal - countInKSA})
              </button>
              <button
                onClick={() => setActiveFilter('visa_issued')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'visa_issued'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                Visa Issued ({countVisaIssued})
              </button>
              {countReview > 0 && (
                <button
                  onClick={() => setActiveFilter('review')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeFilter === 'review'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Under Review ({countReview})
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <ArrowUpDown className="h-3.5 w-3.5" /> Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="recent">Most Recent</option>
                <option value="name">Name (A-Z)</option>
                <option value="days">Days in KSA</option>
              </select>
            </div>
          </div>
        )}

        {/* Results List */}
        {searchQuery.trim() === '' ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-200 shadow-xs px-4">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-indigo-100">
              <Search className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Search Across All Global Records</h2>
            <p className="text-sm text-gray-500 mt-1.5 max-w-md mx-auto">
              Quickly find any passenger, their booking, hotels, flight schedules, visa status, and associated transport vouchers.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-md font-semibold">
                Passport #
              </span>
              <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-md font-semibold">
                Passenger Name
              </span>
              <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-md font-semibold">
                Visa Number
              </span>
              <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-md font-semibold">
                Booking Reference
              </span>
              <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-md font-semibold">
                Group Code
              </span>
            </div>
          </div>
        ) : searching ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-200 shadow-xs">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">Searching Global Database...</h3>
            <p className="text-xs text-gray-500 mt-1">Checking passenger records, visas, and vouchers</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-300 shadow-xs px-4">
            <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <X className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-gray-800">No Matching Records Found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              We couldn't find any passenger matching "{searchQuery}". Please verify the passport number or try searching by passenger name or booking reference.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
              <span>Matching Passengers ({filteredResults.length})</span>
            </div>

            {filteredResults.map((passenger) => {
              const booking = passenger.booking || {};
              const voucher = booking.voucher || null;
              const isCopied = copiedPassport === passenger.passportNumber;

              return (
                <div
                  key={passenger.id}
                  className="bg-white border border-gray-200 hover:border-indigo-300 rounded-2xl p-5 sm:p-6 transition-all shadow-xs hover:shadow-md"
                >
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          {passenger.fullName.charAt(0)}
                        </div>
                        <span className="text-lg font-black text-gray-900">
                          {passenger.fullName}
                        </span>
                      </div>

                      {passenger.isLeadPassenger && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold">
                          Lead Passenger
                        </Badge>
                      )}

                      {passenger.isConsulateReview && (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-bold flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Consulate Review
                        </Badge>
                      )}

                      {/* Passport number badge with copy button */}
                      {passenger.passportNumber ? (
                        <button
                          onClick={(e) => handleCopyPassport(passenger.passportNumber, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold transition-all shadow-2xs group/btn"
                          title="Click to copy passport number"
                        >
                          <Hash className="h-3.5 w-3.5 text-indigo-400" />
                          <span>{passenger.passportNumber}</span>
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-indigo-400 group-hover/btn:text-indigo-700 transition-colors" />
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No Passport</span>
                      )}

                      {passenger.nationality && (
                        <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2.5 py-0.5 rounded-md">
                          {passenger.nationality}
                        </span>
                      )}

                      {passenger.gender && (
                        <span className="text-xs text-gray-500 font-medium">
                          ({passenger.gender})
                        </span>
                      )}
                    </div>

                    {/* Status / KSA Badge */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                          passenger.currentlyInKingdom === 'Yes'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            passenger.currentlyInKingdom === 'Yes' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                          }`}
                        />
                        {passenger.currentlyInKingdom === 'Yes'
                          ? `In Kingdom (${passenger.daysInKingdom || 0} days)`
                          : 'Out of Kingdom'}
                      </span>
                    </div>
                  </div>

                  {/* Grid Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4 text-xs text-gray-600">
                    {/* Agency & Umrah Provider */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Agency / Umrah Co</span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm truncate" title={booking.party?.partyName}>
                        {booking.party?.partyName || 'N/A'}
                      </p>
                      <p className="text-gray-500 truncate">
                        Provider: <span className="font-semibold text-gray-700">{booking.umrahCompany || 'N/A'}</span>
                      </p>
                    </div>

                    {/* Booking & Group Code */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <Compass className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Booking Reference</span>
                      </div>
                      <p className="font-bold text-indigo-600 font-mono text-sm">
                        {booking.bookingReference || 'N/A'}
                      </p>
                      <p className="text-gray-500">
                        Group Code: <span className="font-semibold text-gray-800 font-mono">{booking.groupNumber || 'N/A'}</span>
                      </p>
                    </div>

                    {/* Voucher Information */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <FileText className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Transport Voucher</span>
                      </div>
                      {voucher ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded font-mono text-xs">
                              #{voucher.voucherNumber}
                            </span>
                            {voucher.isQuickVoucher && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                ⚡ Quick
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 truncate">
                            {voucher.transportCompanyName || 'Transport Assigned'}
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-400 italic">No Voucher Generated</p>
                      )}
                    </div>

                    {/* Visa & Border Number */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Visa & Border Info</span>
                      </div>
                      <p className="text-gray-900 font-medium">
                        Visa: <span className="font-mono font-bold text-gray-900">{passenger.visaNumber || 'N/A'}</span>
                      </p>
                      <p className="text-gray-500">
                        Border: <span className="font-mono font-medium">{passenger.borderNumber || 'N/A'}</span>
                      </p>
                    </div>

                    {/* Hotels */}
                    <div className="space-y-1 sm:col-span-2">
                      <div className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Hotels (Makkah & Madinah)</span>
                      </div>
                      <p className="text-gray-800 truncate">
                        🕋 <span className="font-semibold text-gray-900">{booking.makkaHotel || 'N/A'}</span>
                      </p>
                      <p className="text-gray-800 truncate">
                        🕌 <span className="font-semibold text-gray-900">{booking.madinaHotel || 'N/A'}</span>
                      </p>
                    </div>

                    {/* Flight or Iqama Details */}
                    <div className="space-y-1 sm:col-span-2">
                      {booking.travel ? (
                        <>
                          <div className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                            <Plane className="h-3.5 w-3.5 text-indigo-500" />
                            <span>Flight Schedules</span>
                          </div>
                          <p className="text-gray-800 truncate">
                            Arr: <span className="font-semibold">{booking.travel.arrivalFlightNumber || 'N/A'}</span> ({booking.travel.arrivalAirport})
                          </p>
                          <p className="text-gray-800 truncate">
                            Dep: <span className="font-semibold">{booking.travel.departureFlightNumber || 'N/A'}</span> ({booking.travel.departureAirport})
                          </p>
                        </>
                      ) : booking.iqama ? (
                        <>
                          <div className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                            <User className="h-3.5 w-3.5 text-indigo-500" />
                            <span>Iqama Sponsor Info</span>
                          </div>
                          <p className="text-gray-800 truncate">
                            Host: <span className="font-semibold">{booking.iqama.hostName}</span>
                          </p>
                          <p className="text-gray-500">
                            IQ#: <span className="font-mono">{booking.iqama.iqamaNumber}</span>
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                            <span>Mutamer Status</span>
                          </div>
                          <p className="text-gray-800 font-semibold">
                            {passenger.mutamerStatus || 'Pending'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>Booking Status:</span>
                      <span className="font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                        {booking.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Booking PDF */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleDownloadBookingPDF(booking.id, booking.bookingReference, e)}
                        disabled={downloadingId === `booking-${booking.id}`}
                        className="h-8 text-xs font-bold border-gray-200 hover:bg-gray-100 gap-1.5 text-gray-700"
                      >
                        {downloadingId === `booking-${booking.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-indigo-600" />
                        )}
                        Booking PDF
                      </Button>

                      {/* Voucher PDF */}
                      {voucher && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleDownloadVoucherPDF(voucher.id, voucher.voucherNumber, e)}
                          disabled={downloadingId === `voucher-${voucher.id}`}
                          className="h-8 text-xs font-bold border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 gap-1.5"
                        >
                          {downloadingId === `voucher-${voucher.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-emerald-600" />
                          )}
                          Voucher #{voucher.voucherNumber}
                        </Button>
                      )}

                      {/* Manage Booking */}
                      <Button
                        size="sm"
                        onClick={() => router.push(`/dashboard/umrah-visa/visa-management/edit/${booking.id}`)}
                        className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit Booking
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PassportSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <PassportSearchContent />
    </Suspense>
  );
}
