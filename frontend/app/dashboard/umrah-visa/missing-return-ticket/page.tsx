'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
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
  Plane,
  AlertCircle,
  Calendar,
  X,
  UploadCloud,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI, umrahVisaMasterAPI, uploadAPI } from '@/lib/api';
import { DatePicker } from '@/components/ui/date-picker';
import { fromDisplayDate, toDisplayDate } from '@/lib/umrah/validation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TimePicker } from '@/components/ui/time-picker';

// Update Return Ticket Modal Component
interface UpdateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  airports: any[];
  onSuccess: () => void;
}

function UpdateTicketModal({ isOpen, onClose, booking, airports, onSuccess }: UpdateTicketModalProps) {
  const [selectedAirportId, setSelectedAirportId] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('12:00');
  const [departureFlightNumber, setDepartureFlightNumber] = useState('');
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (booking) {
      // Reset to defaults first
      setSelectedAirportId('');
      setDepartureFlightNumber('');
      setDepartureDate('');
      setDepartureTime('12:00');
      setTicketFile(null);

      const travel = booking.travelDetails?.[0];
      if (travel) {
        // Pre-fill or default based on travel details
        setSelectedAirportId(travel.departureAirportId || travel.arrivalAirportId || '');
        setDepartureFlightNumber(
          travel.departureFlightNumber && travel.departureFlightNumber !== 'OW-9999' 
            ? travel.departureFlightNumber 
            : ''
        );
        
        if (travel.departureDateTime && travel.departureFlightNumber !== 'OW-9999') {
          const dateObj = new Date(travel.departureDateTime);
          setDepartureDate(dateObj.toISOString().substring(0, 10));
          setDepartureTime(dateObj.toTimeString().substring(0, 5));
        } else if (travel.arrivalDateTime) {
          const dateObj = new Date(travel.arrivalDateTime);
          // Set return date default to same as arrival or arrival + 10 days
          setDepartureDate(dateObj.toISOString().substring(0, 10));
          setDepartureTime('12:00');
        }
      }
    }
  }, [booking]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setTicketFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAirportId) {
      toast.error('Please select departure airport');
      return;
    }
    if (!departureDate) {
      toast.error('Please enter departure date');
      return;
    }
    if (!departureFlightNumber) {
      toast.error('Please enter departure flight number');
      return;
    }
    if (!ticketFile) {
      toast.error('Please upload the return ticket document');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Upload ticket file if provided
      if (ticketFile) {
        await uploadAPI.uploadDocument(booking.id, ticketFile, 'return_ticket');
      }

      // 2. Update travel details
      await umrahVisaAPI.updateTravelDetails(booking.id, {
        isOneWay: false,
        departureAirportId: selectedAirportId,
        departureDate,
        departureTime,
        departureFlightNumber,
      });

      toast.success('Return ticket details updated successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating return ticket:', err);
      toast.error(err.response?.data?.error || 'Failed to update return ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-indigo-950 font-bold text-xl flex items-center gap-2">
            <Plane className="h-5 w-5 text-indigo-600" />
            Update Return Ticket
          </DialogTitle>
          <DialogDescription>
            Enter return flight information and upload ticket copy for Group/Voucher{' '}
            <span className="font-bold text-slate-800">
              {booking?.groupNumber || booking?.bookingReference || booking?.id?.slice(0, 8)}
            </span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Airport Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Departure Airport</label>
            <Select value={selectedAirportId} onValueChange={setSelectedAirportId}>
              <SelectTrigger className="h-10 text-sm font-medium border-slate-200">
                <SelectValue placeholder="Select Departure Airport" />
              </SelectTrigger>
              <SelectContent>
                {airports.map((airport) => (
                  <SelectItem key={airport.id} value={airport.id} className="text-xs font-semibold">
                    {airport.code} - {airport.name || airport.airportName} ({airport.city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Departure Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Departure Date</label>
              <Input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="h-10 text-sm font-medium border-slate-200"
                required
              />
            </div>

            {/* Departure Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Departure Time</label>
              <TimePicker
                value={departureTime}
                onChange={setDepartureTime}
                className="h-10"
              />
            </div>
          </div>

          {/* Flight Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Departure Flight Number</label>
            <Input
              type="text"
              placeholder="e.g. AI-966"
              value={departureFlightNumber}
              onChange={(e) => setDepartureFlightNumber(e.target.value)}
              className="h-10 text-sm font-medium border-slate-200"
              required
            />
          </div>

          {/* Ticket File Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Return Ticket Document (Required)</label>
            {ticketFile ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-emerald-950 truncate max-w-[200px]">{ticketFile.name}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">{(ticketFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setTicketFile(null)}
                  className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/50 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative group overflow-hidden rounded-xl border-2 border-dashed transition-all cursor-pointer p-4 flex flex-col items-center justify-center min-h-[90px]",
                  dragging
                    ? "bg-indigo-50 border-indigo-400"
                    : "bg-gray-50/50 border-slate-200 hover:bg-white hover:border-indigo-300"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setTicketFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <UploadCloud className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 mb-1 transition-all" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide group-hover:text-indigo-600">
                  Drag & drop or click to upload
                </p>
                <p className="text-[8px] text-slate-400">PDF, PNG, JPG (max 5MB)</p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="font-bold">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <SaveIcon className="h-4 w-4 mr-2" />}
              Save Return Details
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SaveIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

export default function MissingReturnTicketPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [airports, setAirports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  
  // Filters
  const [arrivalDateFrom, setArrivalDateFrom] = useState('');
  const [arrivalDateTo, setArrivalDateTo] = useState('');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchAirports = useCallback(async () => {
    try {
      const response = await umrahVisaMasterAPI.getAirports();
      setAirports(response.data?.locationMasters || response.data?.airports || []);
    } catch (error) {
      console.error('Error fetching airports:', error);
    }
  }, []);

  const fetchBookings = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const params: any = {
        page: page.toString(),
        limit: pagination.limit.toString(),
      };
      if (arrivalDateFrom) params.arrivalDateFrom = arrivalDateFrom;
      if (arrivalDateTo) params.arrivalDateTo = arrivalDateTo;
      
      const response = await umrahVisaAPI.getMissingReturnTicketsBookings(params);
      setBookings(response.data.bookings || []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit, arrivalDateFrom, arrivalDateTo]);

  useEffect(() => {
    const activeUser = getUser();
    if (!activeUser || !hasRole(['admin', 'staff'])) {
      router.push('/dashboard');
      return;
    }
    setUser(activeUser);
    fetchAirports();
  }, [router, fetchAirports]);

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      fetchBookings(pagination.page);
    }
  }, [pagination.page, fetchBookings, user]);

  const handleSendNotification = async (bookingId: string) => {
    try {
      setSendingNotification(bookingId);
      await umrahVisaAPI.notifyMissingReturnTicket(bookingId);
      toast.success('Reminder sent via WhatsApp & Email');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setSendingNotification(null);
    }
  };

  const openUpdateModal = (booking: any) => {
    setSelectedBooking(booking);
    setIsUpdateModalOpen(true);
  };

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

  const setPage = (page: number) => {
    setPagination(p => ({ ...p, page }));
  };

  const setLimit = (limit: number) => {
    setPagination(p => ({ ...p, limit, page: 1 }));
  };

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-indigo-950 tracking-tight flex items-center gap-2">
            <Plane className="h-6 w-6 text-indigo-600" />
            Missing Return Tickets
          </h1>
          <p className="text-sm text-slate-500 font-medium">List of one-way/onward-only bookings missing return tickets.</p>
        </div>
        <Button onClick={() => fetchBookings(pagination.page)} variant="outline" className="font-bold border-slate-200">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 bg-white border border-slate-100 p-1.5 rounded-xl shadow-sm">
          <span className="text-xs font-bold text-slate-500 px-2 uppercase tracking-wider">Arrival Date:</span>
          <div className="flex items-center gap-2">
            <DatePicker 
              value={toDisplayDate(arrivalDateFrom)} 
              onChange={(v) => {
                setArrivalDateFrom(fromDisplayDate(v));
                setPagination(prev => ({ ...prev, page: 1 }));
              }} 
              className="w-32 h-8 text-xs border-slate-200" 
            />
            <span className="text-slate-400 text-xs font-medium">to</span>
            <DatePicker 
              value={toDisplayDate(arrivalDateTo)} 
              onChange={(v) => {
                setArrivalDateTo(fromDisplayDate(v));
                setPagination(prev => ({ ...prev, page: 1 }));
              }} 
              className="w-32 h-8 text-xs border-slate-200" 
            />
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 sticky top-0 z-10 border-b border-slate-100">
              <TableRow className="border-b border-slate-100">
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Group / Booking Ref</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Voucher No</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Qty</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Agent / Party</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Arrival Details</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Contact Notice</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] py-3.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex justify-center flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                      <span className="text-xs text-slate-400 font-semibold">Loading bookings...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="h-10 w-10 text-slate-300" />
                      <p className="text-slate-500 font-bold">No bookings with missing return tickets found</p>
                      <p className="text-xs text-slate-400">All bookings have return tickets assigned.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => {
                  const agentName = booking.party?.partyName || 'Unknown Agent';
                  const groupRef = booking.groupNumber || booking.bookingReference || booking.id.slice(0, 8);
                  const voucherNumber = booking.vouchers?.[0]?.voucherNumber;
                  const arrivalTravel = booking.travelDetails?.[0];
                  const arrivalDate = arrivalTravel?.arrivalDateTime ? formatDate(arrivalTravel.arrivalDateTime) : 'N/A';
                  const arrivalAirport = arrivalTravel?.arrivalAirport?.code || 'N/A';
                  
                  return (
                    <TableRow key={booking.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                      <TableCell className="font-bold text-slate-900 py-3.5">
                        {groupRef}
                      </TableCell>
                      <TableCell className="font-bold text-emerald-600 tracking-wider py-3.5">
                        {voucherNumber || '-'}
                      </TableCell>
                      <TableCell className="font-bold text-slate-600 py-3.5">
                        {booking.passengerCount} PAX
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm">{agentName}</span>
                          <span className="text-xs text-slate-400 font-semibold">{booking.party?.email || 'No email'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded">{arrivalAirport}</span>
                          <span className="text-slate-400"><ArrowRight className="h-3 w-3" /></span>
                          <span className="font-semibold text-slate-800 text-xs">{arrivalDate}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        {booking.oneWayContactName ? (
                          <div className="flex flex-col p-1.5 bg-indigo-50/50 border border-indigo-100/50 rounded-lg">
                            <span className="text-[10px] font-bold text-indigo-900">{booking.oneWayContactName}</span>
                            <span className="text-[9px] font-semibold text-indigo-700">{booking.oneWayWhatsapp || '-'}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3.5 space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendNotification(booking.id)}
                          disabled={sendingNotification === booking.id || (!booking.party?.contactNumber && !booking.party?.email)}
                          className="font-bold text-indigo-600 border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700 h-8"
                        >
                          {sendingNotification === booking.id ? (
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Send Reminder
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openUpdateModal(booking)}
                          className="font-bold bg-indigo-600 hover:bg-indigo-700 text-white h-8"
                        >
                          <Plane className="h-3.5 w-3.5 mr-1.5" />
                          Update Return
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.total > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
            <div className="flex items-center space-x-4">
              <div className="text-xs text-slate-500 font-semibold">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-semibold">Show</span>
                <Select
                  value={String(pagination.limit)}
                  onValueChange={(val) => setLimit(parseInt(val))}
                >
                  <SelectTrigger className="h-8 w-16 text-xs border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-slate-500 font-semibold">per page</span>
              </div>
            </div>
            
            {pagination.totalPages > 1 && (
              <div className="flex items-center space-x-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="font-bold h-8 text-xs border-slate-200"
                >
                  Previous
                </Button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.page ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "w-8 h-8 p-0 text-xs font-bold border-slate-200",
                      pageNum === pagination.page ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''
                    )}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="font-bold h-8 text-xs border-slate-200"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <UpdateTicketModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        booking={selectedBooking}
        airports={airports}
        onSuccess={() => fetchBookings(pagination.page)}
      />
    </div>
  );
}
