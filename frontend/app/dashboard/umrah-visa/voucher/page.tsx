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
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<UmrahVisaBooking | null>(null);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const response = await umrahVisaAPI.getBookings({ limit: 1000 });
      const data = response.data;
      
      const bookingsData = data.bookings
        .filter((booking: any) => booking.status === 'voucher')
        .map((booking: any) => booking);

      setBookingList(bookingsData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = bookingList.filter(booking => booking.status === 'voucher');

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.party?.partyName?.toLowerCase().includes(query) ||
        booking.groupNumber?.toLowerCase().includes(query) ||
        booking.groupName?.toLowerCase().includes(query)
      );
    }

    setFilteredData(filtered);
  };

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      fetchBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, bookingList]);

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input placeholder="Search by party name, group number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
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
                        <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">No bookings found</TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((booking) => (
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
