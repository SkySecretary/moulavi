'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw,
  AlertCircle,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI } from '@/lib/api';
import { DatePicker } from '@/components/ui/date-picker';
import { fromDisplayDate, toDisplayDate } from '@/lib/umrah/validation';
import { PartyLayout } from '@/components/layouts/PartyLayout';

export default function PartyMissingBRNPage() {
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    setUser(getUser());
  }, []);

  const [activeTab, setActiveTab] = useState<'missing' | 'history'>('missing');
  const [bookings, setBookings] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingBrn, setSavingBrn] = useState<string | null>(null);
  const [brnInputs, setBrnInputs] = useState<Record<string, string>>({});
  
  // Filters
  const [arrivalDateFrom, setArrivalDateFrom] = useState('');
  const [arrivalDateTo, setArrivalDateTo] = useState('');
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchBookings = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const params: any = {
        page: page.toString(),
        limit: '50',
      };
      if (arrivalDateFrom) params.arrivalDateFrom = arrivalDateFrom;
      if (arrivalDateTo) params.arrivalDateTo = arrivalDateTo;
      
      const response = await umrahVisaAPI.getMissingBrnBookings(params);
      
      const partyBookings = response.data.bookings || [];
      setBookings(partyBookings);
      setPagination(response.data.pagination);

      // Initialize local BRN state ONLY if it's empty to prevent re-triggering loops
      setBrnInputs(prev => {
        const newState = { ...prev };
        partyBookings.forEach((booking: any) => {
          booking.hotelBookings?.forEach((hotel: any) => {
            if (!(hotel.id in newState)) {
              let currentBrn = '';
              if (Array.isArray(hotel.brn)) {
                currentBrn = hotel.brn.join(', ');
              } else if (hotel.brn) {
                currentBrn = hotel.brn;
              }
              newState[hotel.id] = currentBrn;
            }
          });
        });
        return newState;
      });

    } catch (error) {
      console.error('Error fetching missing BRN bookings:', error);
      toast.error('Failed to load missing BRN bookings');
    } finally {
      setIsLoading(false);
    }
  }, [arrivalDateFrom, arrivalDateTo]);

  // Separate function just to refresh the list without touching brnInputs if possible, or handling it carefully
  const refreshBookingsOnly = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const params: any = {
        page: page.toString(),
        limit: '50',
      };
      if (arrivalDateFrom) params.arrivalDateFrom = arrivalDateFrom;
      if (arrivalDateTo) params.arrivalDateTo = arrivalDateTo;
      
      const response = await umrahVisaAPI.getMissingBrnBookings(params);
      setBookings(response.data.bookings || []);
      setPagination(response.data.pagination);
    } catch (error) {
       console.error('Error refreshing bookings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [arrivalDateFrom, arrivalDateTo]);

  const handleUpdateBrn = async (hotelBookingId: string) => {
    try {
      setSavingBrn(hotelBookingId);
      const brnValue = brnInputs[hotelBookingId] || '';
      const brnArray = brnValue.split(',').map(s => s.trim()).filter(Boolean);
      
      await umrahVisaAPI.updateHotelBrn(hotelBookingId, brnArray);
      toast.success('BRN updated successfully');
      
      await refreshBookingsOnly(pagination.page);
    } catch (error) {
      console.error('Error updating BRN:', error);
      toast.error('Failed to update BRN');
    } finally {
      setSavingBrn(null);
    }
  };

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const params = {
        page: page.toString(),
        limit: '50',
      };
      
      const response = await umrahVisaAPI.getBrnUpdateHistory(params);
      setHistoryLogs(response.data.history || []);
      setHistoryPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching BRN update history:', error);
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !hasRole(['party'])) return;
    
    if (activeTab === 'missing') {
      fetchBookings(pagination.page);
    } else {
      fetchHistory(historyPagination.page);
    }
    // Only fetch when tab or page changes, or dates change.
    // fetchBookings and fetchHistory are stable via useCallback.
  }, [pagination.page, historyPagination.page, activeTab, arrivalDateFrom, arrivalDateTo, fetchBookings, fetchHistory, user?.id]);

  if (!user || !hasRole(['party'])) {
    return null;
  }

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

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatBrnDisplay = (brn: any) => {
    if (!brn) return <span className="text-gray-400 italic">None</span>;
    if (Array.isArray(brn)) return brn.length > 0 ? brn.join(', ') : <span className="text-gray-400 italic">None</span>;
    if (typeof brn === 'string') return brn.trim() || <span className="text-gray-400 italic">None</span>;
    return JSON.stringify(brn);
  };

  const currentPagination = activeTab === 'missing' ? pagination : historyPagination;
  const setPage = (page: number) => {
    if (activeTab === 'missing') setPagination(p => ({ ...p, page }));
    else setHistoryPagination(p => ({ ...p, page }));
  };

  return (
    <PartyLayout title="BRN Alert" subtitle="Identify and provide missing hotel BRN details">
      <div className="flex-1 flex flex-col h-full bg-gray-50/50 p-4 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              BRN Alert
            </h1>
            <p className="text-sm text-gray-500 font-medium">Identify group hotel bookings missing BRN details.</p>
          </div>
          <Button onClick={() => activeTab === 'missing' ? fetchBookings(pagination.page) : fetchHistory(historyPagination.page)} variant="outline" className="font-bold">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <TabsList className="bg-white border w-fit">
              <TabsTrigger value="missing" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 font-bold px-6">
                <AlertCircle className="h-4 w-4 mr-2" />
                Missing BRNs
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 font-bold px-6">
                <History className="h-4 w-4 mr-2" />
                Update History
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'missing' && (
              <div className="flex items-center gap-2 bg-white border p-1 rounded-lg shadow-sm">
                <span className="text-xs font-bold text-gray-500 px-2 uppercase tracking-wider">Arrival Date:</span>
                <div className="flex items-center gap-2">
                  <DatePicker 
                    value={toDisplayDate(arrivalDateFrom)} 
                    onChange={(v) => {
                      setArrivalDateFrom(fromDisplayDate(v));
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }} 
                    className="w-32 h-8 text-xs" 
                  />
                  <span className="text-gray-400">to</span>
                  <DatePicker 
                    value={toDisplayDate(arrivalDateTo)} 
                    onChange={(v) => {
                      setArrivalDateTo(fromDisplayDate(v));
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }} 
                    className="w-32 h-8 text-xs" 
                  />
                </div>
              </div>
            )}
          </div>

          <TabsContent value="missing" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
            <Card className="flex-1 flex flex-col border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <TableRow className="border-b border-gray-100">
                      <TableHead className="font-black text-gray-500 uppercase tracking-wider text-[11px]">Voucher / Group</TableHead>
                      <TableHead className="font-black text-gray-500 uppercase tracking-wider text-[11px]">Arrival</TableHead>
                      <TableHead className="font-black text-gray-500 uppercase tracking-wider text-[11px] min-w-[350px]">Hotels & BRNs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <div className="flex justify-center"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
                        </TableCell>
                      </TableRow>
                    ) : bookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12">
                          <p className="text-gray-500 font-medium">You have no group hotel bookings missing BRNs.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      bookings.map((booking) => {
                        const voucherRef = booking.groupNumber || booking.bookingReference || booking.id.slice(0, 8);
                        const arrivalDate = booking.travelDetails?.[0]?.arrivalDateTime ? formatDate(booking.travelDetails[0].arrivalDateTime) : 'N/A';
                        
                        return (
                          <TableRow key={booking.id} className="hover:bg-gray-50/50">
                            <TableCell className="font-bold text-secondary">
                              {voucherRef} <br/>
                              <span className="text-xs text-gray-400 font-medium">{booking.passengerCount} PAX</span>
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
                                        {isMissing ? (
                                          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">MISSING BRN</span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">PROVIDED</span>
                                        )}
                                      </div>
                                      <div className="flex gap-2 text-xs">
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
                                          {savingBrn === hotel.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Save'}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
            <Card className="flex-1 flex flex-col border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <TableRow className="border-b border-gray-100">
                      <TableHead className="font-black text-gray-500 uppercase tracking-wider text-[11px]">Updated At</TableHead>
                      <TableHead className="font-black text-gray-500 uppercase tracking-wider text-[11px]">Voucher / Group</TableHead>
                      <TableHead className="font-black text-gray-500 uppercase tracking-wider text-[11px]">Hotel</TableHead>
                      <TableHead className="font-black text-gray-500 uppercase tracking-wider text-[11px]">Old BRN</TableHead>
                      <TableHead className="font-black text-gray-500 uppercase tracking-wider text-[11px]">New BRN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex justify-center"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
                        </TableCell>
                      </TableRow>
                    ) : historyLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <p className="text-gray-500 font-medium">No BRN update history found.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      historyLogs.map((log) => {
                        const voucherRef = log.booking?.groupNumber || log.booking?.bookingReference || 'Unknown';
                        
                        return (
                          <TableRow key={log.id} className="hover:bg-gray-50/50">
                            <TableCell className="font-medium text-gray-900 whitespace-nowrap">
                              {formatDateTime(log.updatedAt)}
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-secondary">{voucherRef}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900">{log.hotelBooking?.city?.name}</span>
                                <span className="text-xs text-gray-500">Check-in: {formatDate(log.hotelBooking?.checkInDate)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-red-600 font-mono text-xs max-w-[150px] truncate" title={Array.isArray(log.oldBrn) ? log.oldBrn.join(', ') : log.oldBrn}>
                              {formatBrnDisplay(log.oldBrn)}
                            </TableCell>
                            <TableCell className="text-emerald-600 font-mono text-xs font-bold max-w-[150px] truncate" title={Array.isArray(log.newBrn) ? log.newBrn.join(', ') : log.newBrn}>
                              {formatBrnDisplay(log.newBrn)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {currentPagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t bg-gray-50/50 mt-4 rounded-xl shadow-sm">
              <div className="text-sm text-gray-500 font-medium">
                Showing {((currentPagination.page - 1) * currentPagination.limit) + 1} to {Math.min(currentPagination.page * currentPagination.limit, currentPagination.total)} of {currentPagination.total} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(currentPagination.page - 1)}
                  disabled={currentPagination.page === 1}
                  className="font-bold"
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: currentPagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPagination.page ? "default" : "outline"}
                      size="sm"
                      className={`w-8 h-8 p-0 font-bold ${pageNum === currentPagination.page ? 'bg-secondary' : ''}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(currentPagination.page + 1)}
                  disabled={currentPagination.page === currentPagination.totalPages}
                  className="font-bold"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Tabs>
      </div>
    </PartyLayout>
  );
}