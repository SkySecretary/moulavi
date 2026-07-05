'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  RefreshCw,
  Eye,
  Download,
  Loader2,
  Plane,
  Printer,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import api, { umrahVisaAPI, voucherAPI } from '@/lib/api';
import { UMRAH_VISA_STATUS_CONFIG } from '@/lib/constants';
import { DatePicker } from '@/components/ui/date-picker';
import { fromDisplayDate, toDisplayDate, extractDateFromISO } from '@/lib/umrah/validation';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import ViewUmrahVisaDialog from '@/components/ViewUmrahVisaDialog';

export default function PartyBookingsPage() {
  const router = useRouter();
  const user = getUser();
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingVoucherId, setDownloadingVoucherId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedVisaType, setSelectedVisaType] = useState<string>('all');
  const [arrivalDateFrom, setArrivalDateFrom] = useState('');
  const [arrivalDateTo, setArrivalDateTo] = useState('');
  const [filterMissingReturn, setFilterMissingReturn] = useState(false);
  const [missingReturnCount, setMissingReturnCount] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !hasRole('party')) {
      router.push('/');
      return;
    }
    fetchBookings(pagination.page);
    fetchMissingReturnCount();
  }, [pagination.page, pagination.limit, searchQuery, selectedStatus, selectedVisaType, arrivalDateFrom, arrivalDateTo, filterMissingReturn]);

  const fetchMissingReturnCount = async () => {
    try {
      const response = await umrahVisaAPI.getBookings({
        page: '1',
        limit: '1',
        missingReturnTicket: 'true',
      });
      setMissingReturnCount(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching missing return tickets count:', error);
    }
  };

  const fetchBookings = async (page = 1) => {
    try {
      setIsLoading(true);
      const params: any = {
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: searchQuery,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        visaType: selectedVisaType === 'all' ? undefined : selectedVisaType,
        arrivalDateFrom,
        arrivalDateTo,
      };

      if (filterMissingReturn) {
        params.missingReturnTicket = 'true';
      }
      
      const response = await umrahVisaAPI.getBookings(params);
      const flattenedBookings = (response.data.bookings || []).map((b: any) => {
        const mainTravel = b.travelDetails?.find((t: any) => !t.isAlternate);
        if (mainTravel) {
          b.arrivalDate = mainTravel.arrivalDateTime;
          b.departureDate = mainTravel.departureDateTime;
          b.arrivalFlightNumber = mainTravel.arrivalFlightNumber;
        }
        return b;
      });
      setBookings(flattenedBookings);
      setPagination(response.data.pagination);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching party bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'status') setSelectedStatus(value);
    else if (key === 'visaType') setSelectedVisaType(value);
    else if (key === 'search') setSearchQuery(value);
    else if (key === 'dateFrom') setArrivalDateFrom(value);
    else if (key === 'dateTo') setArrivalDateTo(value);
    
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewDetails = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setViewDialogOpen(true);
  };

  const downloadAllDocuments = async (bookingId: string, groupNumber: string) => {
    try {
      setDownloadingId(bookingId);
      toast.info('Generating ZIP archive containing all uploaded passenger files...');
      
      const response = await umrahVisaAPI.downloadAllDocuments(bookingId);
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Booking-Documents-${groupNumber || bookingId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('ZIP downloaded successfully!');
    } catch (error) {
      console.error('Error downloading files:', error);
      toast.error('Failed to generate files archive');
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadVoucherPDF = async (voucherId: string) => {
    try {
      setDownloadingVoucherId(voucherId);
      toast.info('Generating Voucher PDF...');
      const response = await voucherAPI.getVoucherById(voucherId);
      const voucher = response.data.voucher;
      
      const pdfData = {
        voucherNumber: voucher.voucherNumber,
        bookingReference: voucher.bookingReference || '',
        reservationNumber: voucher.voucherNumber,
        reservationDate: voucher.reservationDate ? extractDateFromISO(voucher.reservationDate) : '',
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
          checkIn: hs.checkIn ? extractDateFromISO(hs.checkIn) : '',
          checkOut: hs.checkOut ? extractDateFromISO(hs.checkOut) : '',
          days: hs.days || 0,
          brn: hs.brn ? (hs.brn.includes(',') ? hs.brn.split(',').map((s: string) => s.trim()) : [hs.brn]) : [],
        })),
        movementDetails: (voucher.movementDetails || []).map((md: any) => ({
          sr: md.sr || 0,
          route: md.route || '',
          date: md.date ? extractDateFromISO(md.date) : '',
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
          date: fd.date ? extractDateFromISO(fd.date) : '',
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
      toast.success('Voucher PDF downloaded successfully!');
    } catch (error: any) {
      console.error('Failed to download voucher PDF:', error);
      toast.error('Failed to download Voucher PDF');
    } finally {
      setDownloadingVoucherId(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    const config = UMRAH_VISA_STATUS_CONFIG[status];
    return config ? config.color : 'bg-gray-100 text-gray-800';
  };

  if (!user) return null;

  return (
    <PartyLayout 
      title="Booking Directory" 
      subtitle="Manage and track your Umrah visa applications"
    >
      <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto pb-24 animate-in fade-in duration-300">
        {missingReturnCount > 0 && (
          <Card className="border-rose-200 bg-rose-50 shadow-md rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5 shadow-sm">
                  <ShieldAlert className="h-5 w-5 animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black text-rose-950 uppercase italic tracking-wider">Protocol Violation Warning</h4>
                  <p className="text-xs text-rose-900/80 leading-relaxed font-semibold">
                    You have <span className="underline font-black text-rose-700">{missingReturnCount} one-way bookings</span> without a departure flight ticket copy uploaded.
                  </p>
                  <p className="text-[10px] text-rose-700/70">
                    ⚠️ Failure to upload return tickets will result in immediate system blocks and severe financial penalties.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant={filterMissingReturn ? "secondary" : "destructive"}
                onClick={() => {
                  setFilterMissingReturn(!filterMissingReturn);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="font-black uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-rose-600/10 shrink-0 h-10 px-5"
              >
                {filterMissingReturn ? "Show All Bookings" : "Filter Missing Tickets"}
              </Button>
            </CardContent>
          </Card>
        )}
        <Card className="shadow-sm border border-gray-100">
          <CardHeader className="pb-3 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Application Management</CardTitle>
              <CardDescription className="text-xs">
                Track status updates, upload schedules, and download vouchers for your groups.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchBookings(pagination.page)}
              className="text-xs font-bold w-full md:w-auto"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Search and Filters grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="relative col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search group reference..."
                  value={searchQuery}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9 h-10 text-xs font-semibold"
                />
              </div>

              <Select value={selectedVisaType} onValueChange={(val) => handleFilterChange('visaType', val)}>
                <SelectTrigger className="h-10 text-xs font-semibold">
                  <SelectValue placeholder="Visa Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visa Types</SelectItem>
                  <SelectItem value="individual_visa">Individual Visa</SelectItem>
                  <SelectItem value="group_visa">Group Visa</SelectItem>
                </SelectContent>
              </Select>

              <DatePicker
                value={arrivalDateFrom}
                onChange={(val) => handleFilterChange('dateFrom', fromDisplayDate(val))}
                placeholder="Arrival From"
              />

              <DatePicker
                value={arrivalDateTo}
                onChange={(val) => handleFilterChange('dateTo', fromDisplayDate(val))}
                placeholder="Arrival To"
              />
            </div>

            {/* Status filtering row */}
            <div className="flex flex-wrap gap-2 pb-6 border-b border-gray-100">
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('status', 'all')}
                className="text-xs font-bold"
              >
                All {stats ? `(${stats.total})` : ''}
              </Button>
              {Object.entries(UMRAH_VISA_STATUS_CONFIG).map(([status, config]) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('status', status)}
                  className="text-xs font-bold"
                >
                  {config.label} {stats ? `(${stats[status] || 0})` : ''}
                </Button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs font-bold">Retrieving bookings data...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-24 border rounded-xl border-dashed border-gray-200 mt-6">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-gray-800">No applications found</h3>
                <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <div className="overflow-x-auto mt-4 rounded-xl border border-gray-200">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] uppercase w-28 text-gray-600">Ref / Creation Date</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-gray-600">Group Number / Name</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-gray-600 w-24">Visa Type</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-gray-600 w-16 text-center">Pax</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-gray-600">Travel Details (Arr / Dep)</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-gray-600 w-32">Status</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-gray-600 w-44">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {bookings.map((booking) => (
                      <TableRow key={booking.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-bold text-gray-900">
                          <div>{booking.bookingReference || 'N/A'}</div>
                          <div className="text-[10px] font-normal text-gray-400 mt-0.5">
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-gray-900">{booking.groupNumber || 'Not Assigned'}</div>
                          <div className="text-gray-500 mt-0.5">{booking.groupName || '—'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={booking.visaType === 'group_visa' ? 'info' : 'outline'} className="text-[9px] font-bold px-1.5 uppercase">
                            {booking.visaType === 'group_visa' ? 'GROUP' : 'INDIVIDUAL'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold text-gray-900">{booking.passengerCount}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-gray-650">
                            <span className="flex items-center gap-1">
                              <Plane className="h-3.5 w-3.5 text-indigo-500 shrink-0" style={{ transform: 'rotate(45deg)' }} />
                              Arr: {booking.arrivalDate ? new Date(booking.arrivalDate).toLocaleString() : 'N/A'}
                            </span>
                            <span className="flex items-center gap-1 mt-1">
                              <Plane className="h-3.5 w-3.5 text-emerald-500 shrink-0" style={{ transform: 'rotate(135deg)' }} />
                              Dep: {booking.departureDate ? new Date(booking.departureDate).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusBadgeVariant(booking.status)} text-[10px] px-2.5 py-0.5 font-semibold border-none`}>
                            {booking.status?.toUpperCase()?.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetails(booking.id)}
                              className="h-8 w-8 text-gray-500 rounded-lg hover:bg-gray-100"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => downloadAllDocuments(booking.id, booking.groupNumber)}
                              disabled={downloadingId === booking.id}
                              className="h-8 w-8 text-indigo-600 rounded-lg hover:bg-indigo-50"
                              title="Download document ZIP"
                            >
                              {downloadingId === booking.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            {booking.voucher && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => downloadVoucherPDF(booking.voucher.id)}
                                disabled={downloadingVoucherId === booking.voucher.id}
                                className="h-8 w-8 text-emerald-600 rounded-lg hover:bg-emerald-50"
                                title="Download Voucher PDF"
                              >
                                {downloadingVoucherId === booking.voucher.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Printer className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="text-xs font-bold"
                >
                  Previous
                </Button>
                <span className="text-xs text-gray-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="text-xs font-bold"
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Booking Details Dialog */}
      <ViewUmrahVisaDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        bookingId={selectedBookingId || ''}
      />
    </PartyLayout>
  );
}
