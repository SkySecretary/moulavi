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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search,
  Ticket,
  RefreshCw,
  Users,
  CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { UmrahVisaBooking, UmrahVisaStatus } from '@/types';
import { umrahVisaAPI } from '@/lib/api';
import { UMRAH_VISA_STATUS_CONFIG } from '@/lib/constants';
import { VoucherPreviewDialog } from '@/components/voucher/VoucherPreviewDialog';

export default function VoucherPage() {
  const user = getUser();
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
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      fetchBookings(pagination.page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, searchQuery, arrivalDateFrom, arrivalDateTo]);

  const handleFilterChange = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
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
    setSelectedBookings([booking]);
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
      // Only select bookings that haven't been merged into another voucher
      const selectableBookings = bookingList.filter(b => !b.appendedToVoucherNumber);
      setSelectedBookings(selectableBookings);
    } else {
      setSelectedBookings([]);
    }
  };

  const handleVoucherSuccess = () => {
    setSelectedBookings([]);
    fetchBookings(pagination.page);
  };

  const selectableBookings = bookingList.filter(b => !b.appendedToVoucherNumber);
  const isAllSelected = selectableBookings.length > 0 && selectableBookings.every(b => selectedBookings.some(sb => sb.id === b.id));
  const isSomeSelected = selectedBookings.length > 0 && !isAllSelected;
  const totalSelectedPax = selectedBookings.reduce((sum, b) => sum + (b.passengerCount || 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 min-h-screen relative pb-20">
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Book Voucher</h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">Generate transport vouchers for individual and merged bookings</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedBookings.length > 1 && (
              <Button 
                onClick={() => setShowGenerateDialog(true)}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center gap-2 shadow-sm"
              >
                <CheckSquare className="h-4 w-4" />
                <span>Generate Merged Voucher ({selectedBookings.length})</span>
              </Button>
            )}
            <Button onClick={() => fetchBookings(pagination.page)} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle>Book Voucher</CardTitle>
                  <CardDescription>Showing {bookingList.length} bookings ready for voucher generation</CardDescription>
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
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">No bookings found</TableCell>
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
        </div>
      </div>

      {/* Floating Action Bar when bookings are selected */}
      {selectedBookings.length > 0 && (
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
              onClick={() => setShowGenerateDialog(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-4 shadow-md flex items-center gap-1.5"
            >
              <Ticket className="h-3.5 w-3.5" />
              {selectedBookings.length === 1 ? 'Generate Voucher' : `Generate Merged Voucher (${selectedBookings.length})`}
            </Button>
          </div>
        </div>
      )}

      {showGenerateDialog && (
        <VoucherPreviewDialog
          open={showGenerateDialog}
          onOpenChange={(open) => {
            setShowGenerateDialog(open);
            if (!open) {
              // keep selection until user closes or succeeds
            }
          }}
          selectedBookings={selectedBookings}
          onSuccess={handleVoucherSuccess}
        />
      )}
    </div>
  );
}
