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
  ArrowRight,
  ArrowLeft,
  Layers,
  CheckCircle2,
  Search
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { TimePicker } from '@/components/ui/time-picker';

type MissingTabType = 'return_only' | 'onward_only' | 'both';

// Update Flight Details Modal Component
interface UpdateFlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  airports: any[];
  mode: MissingTabType;
  onSuccess: () => void;
}

function UpdateFlightModal({ isOpen, onClose, booking, airports, mode, onSuccess }: UpdateFlightModalProps) {
  // Arrival / Onward states
  const [arrivalAirportId, setArrivalAirportId] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('12:00');
  const [arrivalFlightNumber, setArrivalFlightNumber] = useState('');
  const [onwardTicketFile, setOnwardTicketFile] = useState<File | null>(null);

  // Departure / Return states
  const [departureAirportId, setDepartureAirportId] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('12:00');
  const [departureFlightNumber, setDepartureFlightNumber] = useState('');
  const [returnTicketFile, setReturnTicketFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggingOnward, setDraggingOnward] = useState(false);
  const [draggingReturn, setDraggingReturn] = useState(false);
  
  const onwardFileInputRef = useRef<HTMLInputElement>(null);
  const returnFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (booking) {
      // Reset
      setArrivalAirportId('');
      setArrivalDate('');
      setArrivalTime('12:00');
      setArrivalFlightNumber('');
      setOnwardTicketFile(null);

      setDepartureAirportId('');
      setDepartureDate('');
      setDepartureTime('12:00');
      setDepartureFlightNumber('');
      setReturnTicketFile(null);

      const travel = booking.travelDetails?.[0];
      if (travel) {
        // Arrival pre-fills
        setArrivalAirportId(travel.arrivalAirportId || '');
        if (travel.arrivalFlightNumber && travel.arrivalFlightNumber !== 'NT-0000') {
          setArrivalFlightNumber(travel.arrivalFlightNumber);
        }
        if (travel.arrivalDateTime) {
          const arrDateObj = new Date(travel.arrivalDateTime);
          setArrivalDate(arrDateObj.toISOString().substring(0, 10));
          setArrivalTime(arrDateObj.toTimeString().substring(0, 5) || '12:00');
        }

        // Departure pre-fills
        setDepartureAirportId(travel.departureAirportId || travel.arrivalAirportId || '');
        if (travel.departureFlightNumber && travel.departureFlightNumber !== 'OW-9999' && travel.departureFlightNumber !== 'NT-0000') {
          setDepartureFlightNumber(travel.departureFlightNumber);
        }
        if (travel.departureDateTime && travel.departureFlightNumber !== 'OW-9999' && travel.departureFlightNumber !== 'NT-0000') {
          const depDateObj = new Date(travel.departureDateTime);
          setDepartureDate(depDateObj.toISOString().substring(0, 10));
          setDepartureTime(depDateObj.toTimeString().substring(0, 5) || '12:00');
        } else if (travel.arrivalDateTime) {
          const arrDateObj = new Date(travel.arrivalDateTime);
          setDepartureDate(arrDateObj.toISOString().substring(0, 10));
          setDepartureTime('12:00');
        }
      }
    }
  }, [booking, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const needOnward = mode === 'onward_only' || mode === 'both';
    const needReturn = mode === 'return_only' || mode === 'both';

    if (needOnward) {
      if (!arrivalAirportId) {
        toast.error('Please select arrival airport');
        return;
      }
      if (!arrivalDate) {
        toast.error('Please enter arrival date');
        return;
      }
      if (!arrivalFlightNumber) {
        toast.error('Please enter arrival flight number');
        return;
      }
    }

    if (needReturn) {
      if (!departureAirportId) {
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
    }

    try {
      setIsSubmitting(true);

      // Upload Onward Ticket file if provided
      if (onwardTicketFile) {
        await uploadAPI.uploadDocument(booking.id, onwardTicketFile, 'ticket');
      }

      // Upload Return Ticket file if provided
      if (returnTicketFile) {
        await uploadAPI.uploadDocument(booking.id, returnTicketFile, 'return_ticket');
      }

      // Payload building
      const payload: any = {};

      if (mode === 'return_only') {
        payload.isOneWay = false;
        payload.isWithoutTicket = false;
        payload.departureAirportId = departureAirportId;
        payload.departureDate = departureDate;
        payload.departureTime = departureTime;
        payload.departureFlightNumber = departureFlightNumber;
      } else if (mode === 'onward_only') {
        payload.isWithoutTicket = false;
        payload.arrivalAirportId = arrivalAirportId;
        payload.arrivalDate = arrivalDate;
        payload.arrivalTime = arrivalTime;
        payload.arrivalFlightNumber = arrivalFlightNumber;
      } else if (mode === 'both') {
        payload.isWithoutTicket = false;
        payload.isOneWay = false;
        payload.arrivalAirportId = arrivalAirportId;
        payload.arrivalDate = arrivalDate;
        payload.arrivalTime = arrivalTime;
        payload.arrivalFlightNumber = arrivalFlightNumber;
        payload.departureAirportId = departureAirportId;
        payload.departureDate = departureDate;
        payload.departureTime = departureTime;
        payload.departureFlightNumber = departureFlightNumber;
      }

      await umrahVisaAPI.updateTravelDetails(booking.id, payload);

      toast.success(
        mode === 'return_only'
          ? 'Return ticket details updated successfully'
          : mode === 'onward_only'
          ? 'Onward ticket details updated successfully'
          : 'Flight details updated successfully'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating flight details:', err);
      toast.error(err.response?.data?.error || 'Failed to update flight details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = mode === 'return_only'
    ? 'Update Return Ticket'
    : mode === 'onward_only'
    ? 'Update Onward Ticket'
    : 'Update Flight Transport Details (Both Tickets)';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", mode === 'both' ? "sm:max-w-[700px]" : "sm:max-w-[500px]")}>
        <DialogHeader>
          <DialogTitle className="text-indigo-950 font-bold text-xl flex items-center gap-2">
            <Plane className="h-5 w-5 text-indigo-600" />
            {modalTitle}
          </DialogTitle>
          <DialogDescription>
            Enter flight information and upload ticket documents for Group/Voucher{' '}
            <span className="font-bold text-slate-800">
              {booking?.groupNumber || booking?.bookingReference || booking?.id?.slice(0, 8)}
            </span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Onward / Arrival Section */}
          {(mode === 'onward_only' || mode === 'both') && (
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                <Plane className="h-4 w-4 text-indigo-600 rotate-45" />
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Onward / Arrival Flight Details</span>
              </div>

              {/* Arrival Airport */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arrival Airport</label>
                <Select value={arrivalAirportId} onValueChange={setArrivalAirportId}>
                  <SelectTrigger className="h-10 text-sm font-medium border-slate-200 bg-white">
                    <SelectValue placeholder="Select Arrival Airport" />
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
                {/* Arrival Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arrival Date</label>
                  <Input
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    className="h-10 text-sm font-medium border-slate-200 bg-white"
                    required
                  />
                </div>

                {/* Arrival Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arrival Time</label>
                  <TimePicker
                    value={arrivalTime}
                    onChange={setArrivalTime}
                    className="h-10 bg-white"
                  />
                </div>
              </div>

              {/* Arrival Flight Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arrival Flight Number</label>
                <Input
                  type="text"
                  placeholder="e.g. SV-802 / AI-965"
                  value={arrivalFlightNumber}
                  onChange={(e) => setArrivalFlightNumber(e.target.value)}
                  className="h-10 text-sm font-medium border-slate-200 bg-white"
                  required
                />
              </div>

              {/* Onward Ticket Document */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Onward Ticket Document</label>
                {onwardTicketFile ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-emerald-600" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-emerald-950 truncate max-w-[200px]">{onwardTicketFile.name}</span>
                        <span className="text-[10px] text-emerald-600 font-medium">{(onwardTicketFile.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setOnwardTicketFile(null)}
                      className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/50 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDraggingOnward(true); }}
                    onDragLeave={() => setDraggingOnward(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDraggingOnward(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setOnwardTicketFile(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => onwardFileInputRef.current?.click()}
                    className={cn(
                      "relative group overflow-hidden rounded-xl border-2 border-dashed transition-all cursor-pointer p-3.5 flex flex-col items-center justify-center min-h-[85px] bg-white",
                      draggingOnward
                        ? "bg-indigo-50 border-indigo-400"
                        : "border-slate-200 hover:bg-white hover:border-indigo-300"
                    )}
                  >
                    <input
                      ref={onwardFileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setOnwardTicketFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <UploadCloud className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 mb-1 transition-all" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide group-hover:text-indigo-600">
                      Upload Onward Ticket
                    </p>
                    <p className="text-[8px] text-slate-400">PDF, PNG, JPG (max 5MB)</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Return / Departure Section */}
          {(mode === 'return_only' || mode === 'both') && (
            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-purple-100 pb-2">
                <Plane className="h-4 w-4 text-purple-600 -rotate-45" />
                <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">Return / Departure Flight Details</span>
              </div>

              {/* Departure Airport Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Departure Airport</label>
                <Select value={departureAirportId} onValueChange={setDepartureAirportId}>
                  <SelectTrigger className="h-10 text-sm font-medium border-slate-200 bg-white">
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
                    className="h-10 text-sm font-medium border-slate-200 bg-white"
                    required
                  />
                </div>

                {/* Departure Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Departure Time</label>
                  <TimePicker
                    value={departureTime}
                    onChange={setDepartureTime}
                    className="h-10 bg-white"
                  />
                </div>
              </div>

              {/* Departure Flight Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Departure Flight Number</label>
                <Input
                  type="text"
                  placeholder="e.g. AI-966 / SV-803"
                  value={departureFlightNumber}
                  onChange={(e) => setDepartureFlightNumber(e.target.value)}
                  className="h-10 text-sm font-medium border-slate-200 bg-white"
                  required
                />
              </div>

              {/* Return Ticket File Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Return Ticket Document</label>
                {returnTicketFile ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-emerald-600" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-emerald-950 truncate max-w-[200px]">{returnTicketFile.name}</span>
                        <span className="text-[10px] text-emerald-600 font-medium">{(returnTicketFile.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setReturnTicketFile(null)}
                      className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/50 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDraggingReturn(true); }}
                    onDragLeave={() => setDraggingReturn(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDraggingReturn(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setReturnTicketFile(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => returnFileInputRef.current?.click()}
                    className={cn(
                      "relative group overflow-hidden rounded-xl border-2 border-dashed transition-all cursor-pointer p-3.5 flex flex-col items-center justify-center min-h-[85px] bg-white",
                      draggingReturn
                        ? "bg-purple-50 border-purple-400"
                        : "border-slate-200 hover:bg-white hover:border-purple-300"
                    )}
                  >
                    <input
                      ref={returnFileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setReturnTicketFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <UploadCloud className="h-5 w-5 text-slate-400 group-hover:text-purple-500 mb-1 transition-all" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide group-hover:text-purple-600">
                      Upload Return Ticket
                    </p>
                    <p className="text-[8px] text-slate-400">PDF, PNG, JPG (max 5MB)</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="font-bold">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Save Flight Details
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MissingFlightTransportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<MissingTabType>('return_only');
  const [bookings, setBookings] = useState<any[]>([]);
  const [airports, setAirports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [arrivalDateFrom, setArrivalDateFrom] = useState('');
  const [arrivalDateTo, setArrivalDateTo] = useState('');

  const [tabCounts, setTabCounts] = useState({
    return_only: 0,
    onward_only: 0,
    both: 0,
  });

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

  const fetchBookings = useCallback(async (page = 1, currentTab = activeTab) => {
    try {
      setIsLoading(true);
      const params: any = {
        page: page.toString(),
        limit: pagination.limit.toString(),
        missingFlightType: currentTab,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (arrivalDateFrom) params.arrivalDateFrom = arrivalDateFrom;
      if (arrivalDateTo) params.arrivalDateTo = arrivalDateTo;
      
      const response = await umrahVisaAPI.getMissingReturnTicketsBookings(params);
      setBookings(response.data.bookings || []);
      setPagination(response.data.pagination);

      // Update badge counts from backend stats if available
      if (response.data.stats) {
        setTabCounts({
          return_only: response.data.stats.missingReturnCount ?? response.data.stats.onwardTicketCount ?? 0,
          onward_only: response.data.stats.missingOnwardCount ?? 0,
          both: response.data.stats.missingBothCount ?? response.data.stats.withoutTicketCount ?? 0,
        });
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load flight bookings');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit, activeTab, searchQuery, arrivalDateFrom, arrivalDateTo]);

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
      fetchBookings(pagination.page, activeTab);
    }
  }, [pagination.page, activeTab, fetchBookings, user]);

  const handleTabChange = (newTab: string) => {
    const tab = newTab as MissingTabType;
    setActiveTab(tab);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSendNotification = async (bookingId: string) => {
    try {
      setSendingNotification(bookingId);
      const notifType = activeTab === 'onward_only' ? 'onward' : (activeTab === 'both' ? 'both' : 'return');
      await umrahVisaAPI.notifyMissingFlight(bookingId, notifType);
      toast.success('Flight reminder sent via WhatsApp & Email');
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-indigo-950 tracking-tight flex items-center gap-2">
            <Plane className="h-6 w-6 text-indigo-600" />
            Missing Flight Transport
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Manage bookings with missing flight tickets: Return tickets, Onward tickets, or Bookings created Without Tickets.
          </p>
        </div>
        <Button onClick={() => fetchBookings(pagination.page, activeTab)} variant="outline" className="font-bold border-slate-200">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mb-4">
        <TabsList className="bg-white p-1 border border-slate-200 rounded-xl grid grid-cols-3 max-w-2xl h-auto">
          <TabsTrigger 
            value="return_only"
            className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg transition-all"
          >
            <Plane className="h-3.5 w-3.5 -rotate-45" />
            <span>Return Ticket only</span>
            <span className={cn(
              "px-1.5 py-0.5 text-[10px] rounded-full font-bold",
              activeTab === 'return_only' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            )}>
              {tabCounts.return_only}
            </span>
          </TabsTrigger>

          <TabsTrigger 
            value="onward_only"
            className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg transition-all"
          >
            <Plane className="h-3.5 w-3.5 rotate-45" />
            <span>Onward Ticket only</span>
            <span className={cn(
              "px-1.5 py-0.5 text-[10px] rounded-full font-bold",
              activeTab === 'onward_only' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            )}>
              {tabCounts.onward_only}
            </span>
          </TabsTrigger>

          <TabsTrigger 
            value="both"
            className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg transition-all"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Both / Without Ticket</span>
            <span className={cn(
              "px-1.5 py-0.5 text-[10px] rounded-full font-bold",
              activeTab === 'both' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            )}>
              {tabCounts.both}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search group, ref, agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPagination(p => ({ ...p, page: 1 }));
                  fetchBookings(1, activeTab);
                }
              }}
              className="pl-9 h-9 text-xs border-slate-200 bg-white rounded-xl"
            />
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
            <span className="text-xs font-bold text-slate-500 px-1 uppercase tracking-wider">Date:</span>
            <div className="flex items-center gap-2">
              <DatePicker 
                value={toDisplayDate(arrivalDateFrom)} 
                onChange={(v) => {
                  setArrivalDateFrom(fromDisplayDate(v));
                  setPagination(prev => ({ ...prev, page: 1 }));
                }} 
                className="w-36 h-9" 
              />
              <span className="text-slate-400 text-xs font-semibold">to</span>
              <DatePicker 
                value={toDisplayDate(arrivalDateTo)} 
                onChange={(v) => {
                  setArrivalDateTo(fromDisplayDate(v));
                  setPagination(prev => ({ ...prev, page: 1 }));
                }} 
                className="w-36 h-9" 
              />
              {(arrivalDateFrom || arrivalDateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setArrivalDateFrom('');
                    setArrivalDateTo('');
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Description Tag */}
        <div className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm self-start lg:self-auto">
          {activeTab === 'return_only' && 'Showing bookings missing Return flight details'}
          {activeTab === 'onward_only' && 'Showing bookings missing Onward/Arrival flight details'}
          {activeTab === 'both' && 'Showing bookings booked Without Tickets (both legs missing)'}
        </div>
      </div>

      {/* Bookings Table */}
      <Card className="flex-1 flex flex-col border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 sticky top-0 z-10 border-b border-slate-100">
              <TableRow className="border-b border-slate-100">
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Group / Booking Ref</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Voucher No</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Qty</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Agent / Party</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">
                  {activeTab === 'return_only' ? 'Arrival Flight Confirmed' : activeTab === 'onward_only' ? 'Departure Flight Confirmed' : 'Scheduled Stay Period'}
                </TableHead>
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
                      <span className="text-xs text-slate-400 font-semibold">Loading flight bookings...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="h-10 w-10 text-slate-300" />
                      <p className="text-slate-500 font-bold">
                        {activeTab === 'return_only' && 'No bookings with missing return tickets found'}
                        {activeTab === 'onward_only' && 'No bookings with missing onward tickets found'}
                        {activeTab === 'both' && 'No bookings without tickets found'}
                      </p>
                      <p className="text-xs text-slate-400">All bookings in this category have complete flight details.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => {
                  const agentName = booking.party?.partyName || 'Unknown Agent';
                  const groupRef = booking.groupNumber || booking.bookingReference || booking.id.slice(0, 8);
                  const voucherNumber = booking.vouchers?.[0]?.voucherNumber || booking.voucher?.voucherNumber;
                  const travel = booking.travelDetails?.[0];
                  
                  const arrivalDate = travel?.arrivalDateTime ? formatDate(travel.arrivalDateTime) : 'N/A';
                  const arrivalAirport = travel?.arrivalAirport?.code || 'N/A';
                  const arrivalFlight = travel?.arrivalFlightNumber || '';

                  const departureDate = travel?.departureDateTime ? formatDate(travel.departureDateTime) : 'N/A';
                  const departureAirport = travel?.departureAirport?.code || 'N/A';
                  const departureFlight = travel?.departureFlightNumber || '';
                  
                  return (
                    <TableRow key={booking.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                      <TableCell className="font-bold text-slate-900 py-3.5">
                        <div className="flex flex-col">
                          <span>{groupRef}</span>
                          {booking.isWithoutTicket && (
                            <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-tight">Without Ticket</span>
                          )}
                          {!booking.isWithoutTicket && booking.isOneWay && (
                            <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-tight">Onward Only</span>
                          )}
                        </div>
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

                      {/* Flight / Travel Details Column based on Active Tab */}
                      <TableCell className="py-3.5">
                        {activeTab === 'return_only' && (
                          <div className="flex flex-col space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded">{arrivalAirport}</span>
                              <span className="text-slate-400"><ArrowRight className="h-3 w-3" /></span>
                              <span className="font-semibold text-slate-800 text-xs">{arrivalDate}</span>
                            </div>
                            {arrivalFlight && arrivalFlight !== 'NT-0000' && (
                              <span className="text-[10px] text-slate-500 font-medium">Flight: {arrivalFlight}</span>
                            )}
                          </div>
                        )}

                        {activeTab === 'onward_only' && (
                          <div className="flex flex-col space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded">{departureAirport}</span>
                              <span className="text-slate-400"><ArrowRight className="h-3 w-3" /></span>
                              <span className="font-semibold text-slate-800 text-xs">{departureDate}</span>
                            </div>
                            {departureFlight && departureFlight !== 'NT-0000' && departureFlight !== 'OW-9999' && (
                              <span className="text-[10px] text-slate-500 font-medium">Flight: {departureFlight}</span>
                            )}
                          </div>
                        )}

                        {activeTab === 'both' && (
                          <div className="flex flex-col space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-700 text-xs bg-purple-100 text-purple-900 px-2 py-0.5 rounded">
                                {arrivalDate}
                              </span>
                              <span className="text-slate-400"><ArrowRight className="h-3 w-3" /></span>
                              <span className="font-semibold text-slate-800 text-xs">{departureDate}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Stay: {booking.accommodationType ? booking.accommodationType.toUpperCase() : 'STANDARD'}
                            </span>
                          </div>
                        )}
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
                          {activeTab === 'return_only' ? 'Update Return' : activeTab === 'onward_only' ? 'Update Onward' : 'Update Flight'}
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

      <UpdateFlightModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        booking={selectedBooking}
        airports={airports}
        mode={activeTab}
        onSuccess={() => fetchBookings(pagination.page, activeTab)}
      />
    </div>
  );
}
