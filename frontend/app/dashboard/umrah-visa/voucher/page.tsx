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
import { 
  Search,
  Ticket,
  RefreshCw
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
  const [filteredData, setFilteredData] = useState<UmrahVisaBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [arrivalDateFrom, setArrivalDateFrom] = useState('');
  const [arrivalDateTo, setArrivalDateTo] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<UmrahVisaBooking | null>(null);

  const fetchBookings = async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await umrahVisaAPI.getBookings({ 
        limit: 10,
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
  }, [pagination.page, searchQuery, arrivalDateFrom, arrivalDateTo]);

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
    setSelectedBooking(booking);
    setShowGenerateDialog(true);
  };

  const handleVoucherSuccess = () => {
    setSelectedBooking(null);
    fetchBookings();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 min-h-screen">
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Book Voucher</h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">Generate transport vouchers for bookings</p>
          </div>
          <Button onClick={fetchBookings} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8">
          <Card>
            <CardHeader>
              <CardTitle>Book Voucher</CardTitle>
              <CardDescription>Showing {filteredData.length} of {bookingList.length} bookings</CardDescription>
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

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Visa Type</TableHead>
                      <TableHead className="w-[130px]">Reference</TableHead>
                      <TableHead className="w-[200px]">Group Details</TableHead>
                      <TableHead className="w-[180px]">Party Name</TableHead>
                      <TableHead className="w-[150px]">Arrival Date</TableHead>
                      <TableHead className="w-[150px]">Status</TableHead>
                      <TableHead className="w-[200px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : bookingList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">No bookings found</TableCell>
                      </TableRow>
                    ) : (
                      bookingList.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <Badge variant={booking.visaType === 'group_visa' ? 'default' : 'secondary'} className="text-xs">
                              {booking.visaType === 'group_visa' ? 'Group Visa' : 'Individual Visa'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-primary text-xs whitespace-nowrap">
                              {booking.bookingReference || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-semibold">{booking.groupNumber || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{booking.groupName || 'No group'}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{booking.party?.partyName || 'N/A'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {(() => {
                                const mainTravel = booking.travelDetails?.find(t => !t.isAlternate);
                                return mainTravel?.arrivalDateTime ? formatDate(mainTravel.arrivalDateTime) : 'N/A';
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${UMRAH_VISA_STATUS_CONFIG[booking.status || 'voucher'].color} text-xs`}>
                              {UMRAH_VISA_STATUS_CONFIG[booking.status || 'voucher'].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => handleGenerateVoucherClick(booking)} className="flex items-center gap-1">
                              <Ticket className="h-3 w-3" />
                              Generate Voucher
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-500">
                  Showing {pagination.total > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </p>
                
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

      {selectedBooking && selectedBooking.id && (
        <VoucherPreviewDialog
          open={showGenerateDialog}
          onOpenChange={setShowGenerateDialog}
          bookingId={selectedBooking.id}
          onSuccess={handleVoucherSuccess}
        />
      )}
    </div>
  );
}
