'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { 
  RefreshCw,
  Send,
  Save,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI } from '@/lib/api';

export default function MissingBRNPage() {
  const router = useRouter();
  const user = getUser();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);
  const [savingBrn, setSavingBrn] = useState<string | null>(null);
  
  // Local state for inline BRN editing
  // Map of hotelBookingId -> BRN value
  const [brnInputs, setBrnInputs] = useState<Record<string, string>>({});

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  useEffect(() => {
    fetchBookings(pagination.page);
  }, [pagination.page]);

  const fetchBookings = async (page = 1) => {
    try {
      setIsLoading(true);
      const params = {
        page: page.toString(),
        limit: '50',
      };
      
      const response = await umrahVisaAPI.getMissingBrnBookings(params);
      setBookings(response.data.bookings || []);
      setPagination(response.data.pagination);
      
      // Initialize local BRN state
      const initialBrnState: Record<string, string> = {};
      (response.data.bookings || []).forEach((booking: any) => {
        booking.hotelBookings?.forEach((hotel: any) => {
          let currentBrn = '';
          if (Array.isArray(hotel.brn)) {
            currentBrn = hotel.brn.join(', ');
          } else if (hotel.brn) {
            currentBrn = hotel.brn;
          }
          initialBrnState[hotel.id] = currentBrn;
        });
      });
      setBrnInputs(initialBrnState);
      
    } catch (error) {
      console.error('Error fetching missing BRN bookings:', error);
      toast.error('Failed to load missing BRN bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNotification = async (bookingId: string) => {
    try {
      setSendingNotification(bookingId);
      await umrahVisaAPI.notifyMissingBrn(bookingId);
      toast.success('Notification sent via WhatsApp');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setSendingNotification(null);
    }
  };

  const handleUpdateBrn = async (hotelBookingId: string) => {
    try {
      setSavingBrn(hotelBookingId);
      const brnValue = brnInputs[hotelBookingId] || '';
      const brnArray = brnValue.split(',').map(s => s.trim()).filter(Boolean);
      
      await umrahVisaAPI.updateHotelBrn(hotelBookingId, brnArray);
      toast.success('BRN updated successfully');
      
      // Refreshing the list keeps it accurate.
      await fetchBookings(pagination.page);
    } catch (error) {
      console.error('Error updating BRN:', error);
      toast.error('Failed to update BRN');
    } finally {
      setSavingBrn(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-amber-500" />
            Missing BRN Tracking
          </h1>
          <p className="text-sm text-gray-500 font-medium">Identify group hotel bookings missing BRN details and notify agents.</p>
        </div>
        <Button onClick={() => fetchBookings(pagination.page)} variant="outline" className="font-bold">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="flex-1 flex flex-col border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <TableRow className="border-b border-gray-100">
                <TableHead className="font-black text-gray-500 uppercase tracking-wider text-[11px]">Voucher / Group</TableHead>
                <TableHead className="font-black text-gray-500 uppercase tracking-wider text-[11px]">Agent</TableHead>
                <TableHead className="font-black text-gray-500 uppercase tracking-wider text-[11px]">Arrival</TableHead>
                <TableHead className="font-black text-gray-500 uppercase tracking-wider text-[11px] min-w-[350px]">Hotels & BRNs</TableHead>
                <TableHead className="font-black text-gray-500 uppercase tracking-wider text-[11px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex justify-center"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
                  </TableCell>
                </TableRow>
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <p className="text-gray-500 font-medium">All group hotel bookings have BRNs assigned.</p>
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => {
                  const agentName = booking.party?.partyName || 'Unknown Agent';
                  const voucherRef = booking.groupNumber || booking.bookingReference || booking.id.slice(0, 8);
                  const arrivalDate = booking.travelDetails?.[0]?.arrivalDateTime ? formatDate(booking.travelDetails[0].arrivalDateTime) : 'N/A';
                  
                  return (
                    <TableRow key={booking.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-bold text-secondary">
                        {voucherRef} <br/>
                        <span className="text-xs text-gray-400 font-medium">{booking.passengerCount} PAX</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{agentName}</span>
                          <span className="text-xs text-gray-500">{booking.party?.contactNumber || 'No phone'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {arrivalDate}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-3">
                          {booking.hotelBookings?.map((hotel: any) => {
                            const isMissing = !hotel.brn || (Array.isArray(hotel.brn) && hotel.brn.length === 0) || (typeof hotel.brn === 'string' && hotel.brn.trim() === '');
                            return (
                              <div key={hotel.id} className="flex flex-col gap-1.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-gray-700">
                                    {hotel.city?.name || 'Unknown City'} - Check-in: {formatDate(hotel.checkInDate)}
                                  </span>
                                  {isMissing && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">MISSING BRN</span>}
                                </div>
                                <div className="flex gap-2">
                                  <Input 
                                    size={1}
                                    placeholder="Enter BRN (comma separated)"
                                    value={brnInputs[hotel.id] || ''}
                                    onChange={(e) => setBrnInputs(prev => ({ ...prev, [hotel.id]: e.target.value }))}
                                    className={`h-8 text-xs ${isMissing ? 'border-amber-300 bg-amber-50/30 focus-visible:ring-amber-500' : ''}`}
                                  />
                                  <Button 
                                    size="sm" 
                                    variant="secondary"
                                    onClick={() => handleUpdateBrn(hotel.id)}
                                    disabled={savingBrn === hotel.id || brnInputs[hotel.id] === (Array.isArray(hotel.brn) ? hotel.brn.join(', ') : (hotel.brn || ''))}
                                    className="h-8 shrink-0 font-bold"
                                  >
                                    {savingBrn === hotel.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendNotification(booking.id)}
                          disabled={sendingNotification === booking.id || !booking.party?.contactNumber}
                          className="font-bold text-primary border-primary/20 hover:bg-primary/5"
                        >
                          {sendingNotification === booking.id ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Send Reminder
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t bg-gray-50/50">
            <div className="text-sm text-gray-500 font-medium">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="font-bold"
              >
                Previous
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.page ? "default" : "outline"}
                    size="sm"
                    className={`w-8 h-8 p-0 font-bold ${pageNum === pagination.page ? 'bg-secondary' : ''}`}
                    onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                  >
                    {pageNum}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="font-bold"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
