'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search,
  Ticket,
  RefreshCw,
  Users,
  CheckSquare,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  Calendar,
  Building,
  Plane
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { UmrahVisaBooking, UmrahVisaStatus } from '@/types';
import api, { umrahVisaAPI, voucherAPI } from '@/lib/api';
import { UMRAH_VISA_STATUS_CONFIG } from '@/lib/constants';
import { VoucherPreviewDialog } from '@/components/voucher/VoucherPreviewDialog';
import { ReviewQuickVoucherDialog } from '@/components/voucher/ReviewQuickVoucherDialog';
import NextLink from 'next/link';

export default function VoucherPage() {
  const user = getUser();
  const [activeMainTab, setActiveMainTab] = useState<'bookings' | 'quick-requests'>('bookings');

  // Bookings Waiting For Voucher State
  const [bookingList, setBookingList] = useState<UmrahVisaBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [arrivalDateFrom, setArrivalDateFrom] = useState('');
  const [arrivalDateTo, setArrivalDateTo] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<UmrahVisaBooking[]>([]);
  const [dialogBookings, setDialogBookings] = useState<UmrahVisaBooking[]>([]);

  // Quick Voucher Requests State
  const [quickRequests, setQuickRequests] = useState<any[]>([]);
  const [quickRequestsLoading, setQuickRequestsLoading] = useState(false);
  const [pendingQuickCount, setPendingQuickCount] = useState(0);
  const [quickSearch, setQuickSearch] = useState('');
  const [quickStatusFilter, setQuickStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [quickPagination, setQuickPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<any | null>(null);
  const [showQuickReviewDialog, setShowQuickReviewDialog] = useState(false);
  const [downloadingVoucherId, setDownloadingVoucherId] = useState<string | null>(null);

  const fetchBookings = async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await umrahVisaAPI.getBookings({ 
        limit: pagination.limit,
        page: page,
        search: searchQuery,
        arrivalDateFrom: arrivalDateFrom,
        arrivalDateTo: arrivalDateTo,
        status: 'voucher'
      });
      const data = response.data;
      
      setBookingList(data.bookings || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading bookings waiting for voucher:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuickRequests = async (page = 1) => {
    try {
      setQuickRequestsLoading(true);
      const response = await voucherAPI.getQuickRequests({
        page,
        limit: quickPagination.limit,
        status: quickStatusFilter,
        search: quickSearch,
      });

      setQuickRequests(response.data?.requests || []);
      setQuickPagination(response.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });

      // If viewing pending, update pending badge count
      if (quickStatusFilter === 'pending' || quickStatusFilter === 'all') {
        setPendingQuickCount(response.data?.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error loading quick voucher requests:', error);
      toast.error('Failed to load quick voucher requests');
    } finally {
      setQuickRequestsLoading(false);
    }
  };

  // Fetch pending count initially
  const fetchPendingCount = async () => {
    try {
      const response = await voucherAPI.getQuickRequests({ status: 'pending', limit: 1 });
      setPendingQuickCount(response.data?.pagination?.total || 0);
    } catch (err) {
      // Ignore
    }
  };

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      fetchBookings(pagination.page);
      fetchPendingCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, searchQuery, arrivalDateFrom, arrivalDateTo]);

  useEffect(() => {
    if (user && hasRole(['admin', 'staff']) && activeMainTab === 'quick-requests') {
      fetchQuickRequests(quickPagination.page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMainTab, quickPagination.page, quickPagination.limit, quickStatusFilter, quickSearch]);

  const handleFilterChange = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleQuickFilterChange = () => {
    setQuickPagination(prev => ({ ...prev, page: 1 }));
  };

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const handleGenerateVoucherClick = (booking: UmrahVisaBooking) => {
    if (!booking.id) {
      toast.error('Booking ID not found');
      return;
    }
    if (selectedBookings.length > 1) {
      const otherSelected = selectedBookings.filter(b => b.id !== booking.id);
      setDialogBookings([booking, ...otherSelected]);
    } else {
      setDialogBookings([booking]);
    }
    setShowGenerateDialog(true);
  };

  const handleSelectBooking = (booking: UmrahVisaBooking, checked: boolean) => {
    if (checked) {
      setSelectedBookings(prev => [...prev.filter(b => b.id !== booking.id), booking]);
    } else {
      setSelectedBookings(prev => prev.filter(b => b.id !== booking.id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableBookings = bookingList.filter(b => !b.appendedToVoucherNumber);
      setSelectedBookings(selectableBookings);
    } else {
      setSelectedBookings([]);
    }
  };

  const handleVoucherSuccess = () => {
    setSelectedBookings([]);
    setDialogBookings([]);
    setShowGenerateDialog(false);
    fetchBookings(pagination.page);
    fetchPendingCount();
  };

  const handleQuickReviewSuccess = () => {
    setSelectedRequestForReview(null);
    setShowQuickReviewDialog(false);
    fetchQuickRequests(quickPagination.page);
    fetchPendingCount();
  };

  const handleDownloadVoucherPDF = async (voucherId: string) => {
    try {
      setDownloadingVoucherId(voucherId);
      const response = await voucherAPI.getVoucherById(voucherId);
      const voucher = response.data.voucher;

      const pdfData = {
        voucherNumber: voucher.voucherNumber,
        bookingReference: voucher.bookingReference || '',
        reservationNumber: voucher.voucherNumber,
        reservationDate: voucher.reservationDate ? voucher.reservationDate.split('T')[0] : '',
        guestName: voucher.guestName || '',
        guestMobile: voucher.guestMobile || '',
        groupCode: voucher.groupCode || '',
        paxCount: voucher.paxCount || 0,
        umrahCompany: voucher.umrahCompany || null,
        agentParty: voucher.party || null,
        transportCompany: voucher.transportCompany || null,
        hotelSchedules: (voucher.hotelSchedules || []).map((hs: any) => ({
          number: hs.number || 0,
          location: hs.location || '',
          hotelName: hs.hotelName || '',
          checkIn: hs.checkIn ? hs.checkIn.split('T')[0] : '',
          checkOut: hs.checkOut ? hs.checkOut.split('T')[0] : '',
          days: hs.days || 0,
          brn: hs.brn ? (hs.brn.includes(',') ? hs.brn.split(',').map((s: string) => s.trim()) : [hs.brn]) : [],
        })),
        movementDetails: (voucher.movementDetails || []).map((md: any) => ({
          sr: md.sr || 0,
          route: md.route || '',
          date: md.date ? md.date.split('T')[0] : '',
          time: md.time || '',
          from: md.from || '',
          fromLocation: md.fromLocation || '',
          to: md.to || '',
          toLocation: md.toLocation || '',
          vehicleType: md.vehicleType || voucher.vehicleType || '',
        })),
        flightDetails: (voucher.flightDetails || []).map((fd: any) => ({
          type: fd.type || 'AA',
          carrier: fd.carrier || '',
          number: fd.number || '',
          date: fd.date ? fd.date.split('T')[0] : '',
          from: fd.from || '',
          to: fd.to || '',
          etd: fd.etd || '',
          eta: fd.eta || '',
        })),
      };

      const pdfResponse = await api.post('/umrah-visa/generate-pdf', pdfData, { responseType: 'blob' });
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Voucher-${pdfData.voucherNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Voucher PDF downloaded');
    } catch (error) {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingVoucherId(null);
    }
  };

  const selectableBookings = bookingList.filter(b => !b.appendedToVoucherNumber);
  const isAllSelected = selectableBookings.length > 0 && selectableBookings.every(b => selectedBookings.some(sb => sb.id === b.id));
  const isSomeSelected = selectedBookings.length > 0 && !isAllSelected;
  const totalSelectedPax = selectedBookings.reduce((sum, b) => sum + (b.passengerCount || 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 min-h-screen relative pb-20">
      {/* Top Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Voucher Queue & Requests</h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">Manage system booking vouchers and review agency quick voucher requests</p>
          </div>
          <div className="flex items-center gap-2">
            {activeMainTab === 'bookings' && selectedBookings.length > 1 && (
              <Button 
                onClick={() => {
                  setDialogBookings(selectedBookings);
                  setShowGenerateDialog(true);
                }}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center gap-2 shadow-sm"
              >
                <CheckSquare className="h-4 w-4" />
                <span>Generate Merged Voucher ({selectedBookings.length})</span>
              </Button>
            )}
            <Button 
              onClick={() => {
                if (activeMainTab === 'bookings') fetchBookings(pagination.page);
                else fetchQuickRequests(quickPagination.page);
                fetchPendingCount();
              }} 
              variant="outline" 
              className="flex items-center gap-2 font-bold"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">
        {/* Main Tab Controller */}
        <Tabs value={activeMainTab} onValueChange={(v: any) => setActiveMainTab(v)} className="w-full space-y-4">
          <div className="flex items-center justify-start">
            <TabsList className="bg-white border shadow-sm p-1 h-12 rounded-2xl">
              <TabsTrigger 
                value="bookings" 
                className="data-[state=active]:bg-primary data-[state=active]:text-white font-bold px-6 h-10 rounded-xl transition-all flex items-center gap-2"
              >
                <Ticket className="h-4 w-4" />
                <span>Bookings Waiting for Voucher</span>
                <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary group-data-[state=active]:bg-white group-data-[state=active]:text-primary font-bold text-[10px] px-2 py-0.5 rounded-full">
                  {pagination.total || bookingList.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="quick-requests" 
                className="data-[state=active]:bg-amber-600 data-[state=active]:text-white font-bold px-6 h-10 rounded-xl transition-all flex items-center gap-2"
              >
                <Zap className="h-4 w-4 text-amber-500 group-data-[state=active]:text-white" />
                <span>Pending Quick Voucher Requests</span>
                {pendingQuickCount > 0 && (
                  <Badge className="ml-1 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                    {pendingQuickCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Bookings Waiting for Voucher */}
          <TabsContent value="bookings" className="space-y-4 animate-in fade-in-50 duration-200">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold">Standard Bookings Waiting for Voucher</CardTitle>
                    <CardDescription>Showing {bookingList.length} confirmed bookings ready for voucher generation</CardDescription>
                  </div>
                  {selectedBookings.length > 0 && (
                    <Badge variant="secondary" className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold w-fit">
                      {selectedBookings.length} bookings selected ({totalSelectedPax} Total Pax)
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input placeholder="Search by party, group..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); handleFilterChange(); }} className="pl-10" />
                  </div>
                  <Input type="date" value={arrivalDateFrom} onChange={(e) => { setArrivalDateFrom(e.target.value); handleFilterChange(); }} placeholder="Arrival From" />
                  <Input type="date" value={arrivalDateTo} onChange={(e) => { setArrivalDateTo(e.target.value); handleFilterChange(); }} placeholder="Arrival To" />
                </div>

                <div className="rounded-md border overflow-x-auto bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-[45px] text-center">
                          <Checkbox
                            checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead className="w-[120px]">Visa Type</TableHead>
                        <TableHead className="w-[130px]">Reference</TableHead>
                        <TableHead className="w-[220px]">Group Details</TableHead>
                        <TableHead className="w-[80px]">Qty</TableHead>
                        <TableHead className="w-[180px]">Party Name</TableHead>
                        <TableHead className="w-[140px]">Arrival Date</TableHead>
                        <TableHead className="w-[140px]">Status</TableHead>
                        <TableHead className="w-[180px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : bookingList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">No bookings waiting for voucher generation</TableCell>
                        </TableRow>
                      ) : (
                        bookingList.map((booking) => {
                          const isSelected = selectedBookings.some(b => b.id === booking.id);
                          const isMergedSecondary = !!booking.appendedToVoucherNumber;
                          const hasAppended = booking.appendedBookings && Array.isArray(booking.appendedBookings) && booking.appendedBookings.length > 0;
                          const extraPax = hasAppended 
                            ? (booking.appendedBookings as any[]).reduce((acc: number, b: any) => acc + (b.passengerCount || 0), 0)
                            : 0;

                          return (
                            <TableRow key={booking.id} className={isSelected ? 'bg-purple-50/50' : ''}>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={isSelected}
                                  disabled={isMergedSecondary}
                                  onCheckedChange={(checked) => handleSelectBooking(booking, !!checked)}
                                  aria-label={`Select booking ${booking.bookingReference}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant={booking.visaType === 'group_visa' ? 'default' : 'secondary'} className="text-xs">
                                  {booking.visaType === 'group_visa' ? 'Group Visa' : 'Individual Visa'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <span className="font-bold text-primary text-xs whitespace-nowrap block">
                                    {booking.bookingReference || 'N/A'}
                                  </span>
                                  {hasAppended && (
                                    <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] font-bold">
                                      🔗 Merged (+{extraPax} Pax)
                                    </Badge>
                                  )}
                                  {isMergedSecondary && (
                                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium">
                                      Merged in #{booking.appendedToVoucherNumber}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-semibold text-xs text-gray-900">{booking.groupNumber || 'N/A'}</div>
                                  <div className="text-xs text-gray-500 truncate max-w-[200px]">{booking.groupName || 'No group'}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                                  {booking.passengerCount || 0}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-xs text-gray-900">{booking.party?.partyName || 'N/A'}</div>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs text-gray-700">
                                  {(() => {
                                    const mainTravel = booking.travelDetails?.find(t => !t.isAlternate);
                                    return mainTravel?.arrivalDateTime ? formatDate(mainTravel.arrivalDateTime) : 'N/A';
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${UMRAH_VISA_STATUS_CONFIG[booking.status || 'voucher']?.color || 'bg-gray-100 text-gray-800'} text-[11px]`}>
                                  {UMRAH_VISA_STATUS_CONFIG[booking.status || 'voucher']?.label || booking.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {isMergedSecondary ? (
                                  <span className="text-xs text-gray-400 font-medium italic">Already Merged</span>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleGenerateVoucherClick(booking)} 
                                    className="h-8 text-xs font-semibold gap-1"
                                  >
                                    <Ticket className="h-3 w-3" />
                                    Generate Voucher
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center space-x-4">
                    <p className="text-sm text-gray-500">
                      Showing {pagination.total > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} results
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Show</span>
                      <Select
                        value={String(pagination.limit)}
                        onValueChange={(val) => {
                          const newLimit = parseInt(val);
                          setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
                        }}
                      >
                        <SelectTrigger className="h-8 w-16 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-gray-500">per page</span>
                    </div>
                  </div>
                  
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1}>
                        Previous
                      </Button>
                      <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.totalPages}>
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Pending Quick Voucher Requests */}
          <TabsContent value="quick-requests" className="space-y-4 animate-in fade-in-50 duration-200">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      Agency Quick Voucher Requests
                    </CardTitle>
                    <CardDescription>
                      Review, edit, and approve incoming transport voucher requests submitted by agencies
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={quickStatusFilter}
                      onValueChange={(v: any) => {
                        setQuickStatusFilter(v);
                        setQuickPagination(prev => ({ ...prev, page: 1 }));
                      }}
                    >
                      <SelectTrigger className="h-9 w-36 text-xs font-bold bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending" className="text-xs font-bold text-amber-600">Pending Approval</SelectItem>
                        <SelectItem value="approved" className="text-xs font-bold text-emerald-600">Approved</SelectItem>
                        <SelectItem value="rejected" className="text-xs font-bold text-rose-600">Rejected</SelectItem>
                        <SelectItem value="all" className="text-xs font-bold">All Requests</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input 
                      placeholder="Search request #, guest, mobile, group code, agency..." 
                      value={quickSearch} 
                      onChange={(e) => { setQuickSearch(e.target.value); handleQuickFilterChange(); }} 
                      className="pl-9 h-9 text-xs" 
                    />
                  </div>
                </div>

                <div className="rounded-md border overflow-x-auto bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-[140px] text-xs font-bold uppercase">Request #</TableHead>
                        <TableHead className="w-[180px] text-xs font-bold uppercase">Guest / Mobile</TableHead>
                        <TableHead className="w-[140px] text-xs font-bold uppercase">Group Code</TableHead>
                        <TableHead className="w-[80px] text-xs font-bold uppercase">Pax</TableHead>
                        <TableHead className="w-[180px] text-xs font-bold uppercase">Agency (Party)</TableHead>
                        <TableHead className="w-[130px] text-xs font-bold uppercase">Date</TableHead>
                        <TableHead className="w-[100px] text-xs font-bold uppercase">Movements</TableHead>
                        <TableHead className="w-[110px] text-xs font-bold uppercase">Status</TableHead>
                        <TableHead className="w-[200px] text-right text-xs font-bold uppercase">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quickRequestsLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-10 text-xs text-slate-500">
                            Loading quick voucher requests...
                          </TableCell>
                        </TableRow>
                      ) : quickRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-slate-600">No {quickStatusFilter !== 'all' ? quickStatusFilter : ''} quick voucher requests found</p>
                              <p className="text-xs text-slate-400">Agency requests submitted via Quick Voucher form will appear here for review.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        quickRequests.map((req) => {
                          const moveCount = req.movementDetails && Array.isArray(req.movementDetails) ? req.movementDetails.length : 0;
                          return (
                            <TableRow key={req.id} className="hover:bg-slate-50/50">
                              <TableCell>
                                <div className="space-y-0.5">
                                  <span className="font-mono font-bold text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                                    {req.requestNumber}
                                  </span>
                                  {req.voucher && (
                                    <span className="block text-[10px] text-emerald-700 font-bold font-mono">
                                      Voucher: #{req.voucher.voucherNumber}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <p className="font-bold text-xs text-slate-900">{req.guestName}</p>
                                  <p className="text-[11px] text-slate-500 font-mono">{req.guestMobile || '—'}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-xs font-semibold text-slate-700">
                                  {req.groupCode || '—'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                                  {req.paxCount} PAX
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <p className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{req.party?.partyName || 'N/A'}</p>
                                  <p className="text-[10px] text-slate-400">{req.party?.city || ''}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-slate-600">
                                  {req.reservationDate ? formatDate(req.reservationDate) : 'N/A'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] font-bold">
                                  {moveCount} Segments
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {req.status === 'pending' && (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                                    <Clock className="h-3 w-3 text-amber-600" /> Pending Review
                                  </Badge>
                                )}
                                {req.status === 'approved' && (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Approved
                                  </Badge>
                                )}
                                {req.status === 'rejected' && (
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold flex items-center gap-1 w-fit" title={req.rejectionReason || ''}>
                                    <XCircle className="h-3 w-3 text-rose-600" /> Rejected
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {req.status === 'pending' ? (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedRequestForReview(req);
                                        setShowQuickReviewDialog(true);
                                      }}
                                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8 shadow-sm flex items-center gap-1"
                                    >
                                      <Zap className="h-3.5 w-3.5" />
                                      Review & Approve
                                    </Button>
                                  ) : req.status === 'approved' && req.voucher ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDownloadVoucherPDF(req.voucher.id)}
                                        disabled={downloadingVoucherId === req.voucher.id}
                                        className="h-8 text-xs font-bold text-slate-700 border-slate-300 flex items-center gap-1"
                                      >
                                        <FileText className="h-3.5 w-3.5 text-primary" />
                                        PDF
                                      </Button>
                                      <NextLink href={`/dashboard/services/voucher/view/${req.voucher.id}`}>
                                        <Button
                                          size="sm"
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 flex items-center gap-1"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                          View Voucher
                                        </Button>
                                      </NextLink>
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedRequestForReview(req);
                                        setShowQuickReviewDialog(true);
                                      }}
                                      className="h-8 text-xs text-slate-500 hover:text-slate-900"
                                    >
                                      View Details
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-500">
                    Showing {quickPagination.total > 0 ? ((quickPagination.page - 1) * quickPagination.limit) + 1 : 0} to{' '}
                    {Math.min(quickPagination.page * quickPagination.limit, quickPagination.total)} of{' '}
                    {quickPagination.total} requests
                  </p>
                  {quickPagination.totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setQuickPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={quickPagination.page === 1}>
                        Previous
                      </Button>
                      <span className="text-sm text-gray-500">Page {quickPagination.page} of {quickPagination.totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setQuickPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={quickPagination.page === quickPagination.totalPages}>
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Bar when bookings are selected */}
      {activeMainTab === 'bookings' && selectedBookings.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-700 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-white text-xs font-bold">
              {selectedBookings.length}
            </span>
            <div className="text-xs">
              <p className="font-bold text-white">
                {selectedBookings.length} {selectedBookings.length === 1 ? 'Booking' : 'Bookings'} Selected
              </p>
              <p className="text-slate-400">
                Total {totalSelectedPax} Passengers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedBookings([])}
              className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-8"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setDialogBookings(selectedBookings);
                setShowGenerateDialog(true);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-4 shadow-md flex items-center gap-1.5"
            >
              <Ticket className="h-3.5 w-3.5" />
              {selectedBookings.length === 1 ? 'Generate Voucher' : `Generate Merged Voucher (${selectedBookings.length})`}
            </Button>
          </div>
        </div>
      )}

      {/* Dialog for Standard Voucher Generation */}
      {showGenerateDialog && (
        <VoucherPreviewDialog
          open={showGenerateDialog}
          onOpenChange={(open) => {
            setShowGenerateDialog(open);
            if (!open) {
              setDialogBookings([]);
            }
          }}
          selectedBookings={dialogBookings}
          onSuccess={handleVoucherSuccess}
        />
      )}

      {/* Dialog for Reviewing and Approving Quick Voucher Request */}
      {showQuickReviewDialog && selectedRequestForReview && (
        <ReviewQuickVoucherDialog
          open={showQuickReviewDialog}
          onOpenChange={(open) => {
            setShowQuickReviewDialog(open);
            if (!open) {
              setSelectedRequestForReview(null);
            }
          }}
          request={selectedRequestForReview}
          onSuccess={handleQuickReviewSuccess}
        />
      )}
    </div>
  );
}
