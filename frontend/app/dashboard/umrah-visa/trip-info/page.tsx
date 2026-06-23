'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getFileUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Users,
  RefreshCw,
  Copy,
  AlertCircle,
  Download,
  Loader2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { UmrahVisaBooking, UmrahVisaStatus } from '@/types';
import { umrahVisaAPI, uploadAPI } from '@/lib/api';
import { UMRAH_VISA_STATUS_CONFIG } from '@/lib/constants';
import { DatePicker } from '@/components/ui/date-picker';
import { fromDisplayDate } from '@/lib/umrah/validation';

export default function TripInfoPage() {
  const router = useRouter();
  const user = getUser();
  const [bookingList, setBookingList] = useState<UmrahVisaBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [arrivalDateFrom, setArrivalDateFrom] = useState('');
  const [arrivalDateTo, setArrivalDateTo] = useState('');
  const [departureDateFrom, setDepartureDateFrom] = useState('');
  const [departureDateTo, setDepartureDateTo] = useState('');
  const [pendingLoadBasis, setPendingLoadBasis] = useState<'arrival' | 'departure'>('arrival');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [activeTab, setActiveTab] = useState<'iqama' | 'hotel'>('iqama');
  const [iqamaSubTab, setIqamaSubTab] = useState<'pending' | 'hosting' | 'completed'>('pending');
  const [hotelSubTab, setHotelSubTab] = useState<'pending' | 'completed'>('pending');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadBookingPDF = async (booking: any) => {
    if (!booking.id) return;
    try {
      setDownloadingId(booking.id);
      const response = await umrahVisaAPI.generateBookingPDF(booking.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `${booking.bookingReference || booking.id.slice(0, 8)}.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate booking PDF');
    } finally {
      setDownloadingId(null);
    }
  };
  const [editingIqama, setEditingIqama] = useState<Record<string, {
    makkahHotelName: string;
    makkahBrn: string;
    madinahHotelName: string;
    madinahBrn: string;
  }>>({});

  const [pendingBrnLoad, setPendingBrnLoad] = useState<Array<{ 
    date: string; 
    count: number; 
    breakdowns?: Array<{ rangeLabel: string; arrivalDate: string; departureDate: string; count: number }>;
  }>>([]);
  const [isLoadingLoad, setIsLoadingLoad] = useState(false);

  const handlePendingLoadClick = (date: string, departureDate?: string) => {
    // Set dates to filter for this specific day
    if (activeTab === 'iqama' && pendingLoadBasis === 'departure') {
      setDepartureDateFrom(date);
      setDepartureDateTo(date);
      setArrivalDateFrom('');
      setArrivalDateTo('');
    } else {
      setArrivalDateFrom(date);
      setArrivalDateTo(date);
      if (activeTab === 'hotel' && departureDate) {
        setDepartureDateFrom(departureDate);
        setDepartureDateTo(departureDate);
      } else {
        setDepartureDateFrom('');
        setDepartureDateTo('');
      }
    }
    // Switch to pending subtab to see the results
    if (activeTab === 'iqama') {
      setIqamaSubTab('pending');
    } else {
      setHotelSubTab('pending');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
    
    if (departureDate) {
      toast.info(`Filtering for arrival: ${new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, departure: ${new Date(departureDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`);
    } else {
      toast.info(`Filtering for ${new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} pending load`);
    }
  };

  // ...

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    fetchBookings(pagination.page);
    fetchPendingLoad();
  }, [pagination.page, pagination.limit, searchQuery, arrivalDateFrom, arrivalDateTo, departureDateFrom, departureDateTo, activeTab, iqamaSubTab, hotelSubTab, pendingLoadBasis]);

  const fetchPendingLoad = async () => {
    try {
      setIsLoadingLoad(true);
      const basis = activeTab === 'iqama' ? pendingLoadBasis : 'arrival';
      const response = await umrahVisaAPI.getPendingBrnLoad(activeTab, basis);
      setPendingBrnLoad(response.data.stats || []);
    } catch (error) {
      console.error('Error fetching pending load:', error);
    } finally {
      setIsLoadingLoad(false);
    }
  };

  const fetchBookings = async (page = 1) => {
  try {
    setIsLoading(true);
    const tripStatus = activeTab === 'iqama' ? iqamaSubTab : hotelSubTab;

    const response = await umrahVisaAPI.getBookings({ 
      limit: pagination.limit,
      page: page,
      search: searchQuery,
      arrivalDateFrom: arrivalDateFrom,
      arrivalDateTo: arrivalDateTo,
      departureDateFrom: departureDateFrom,
      departureDateTo: departureDateTo,
      accommodationType: activeTab,
      status: ['group_assigned', 'voucher', 'bill'],
      tripStatus: tripStatus
    });
    const data = response.data;

    const bookingsData = data.bookings
      .map((booking: any) => {
        const iqama = booking.sponsorIqamaDetails?.[0];
        return {
          ...booking,
          // Map hotel details from sponsorIqamaDetails for Iqama bookings
          makkahHotelName: booking.accommodationType === 'iqama' && iqama?.makkahHotelName || null,
          makkahBrn: booking.accommodationType === 'iqama' && iqama?.makkahBrn || null,
          madinahHotelName: booking.accommodationType === 'iqama' && iqama?.madinahHotelName || null,
          madinahBrn: booking.accommodationType === 'iqama' && iqama?.madinahBrn || null,
        };
      });

    // Initialize editing state for Iqama bookings
    const iqamaEditing: Record<string, any> = {};
    bookingsData.forEach((booking: any) => {
      if (booking.accommodationType === 'iqama') {
        const iqama = booking.sponsorIqamaDetails?.[0];
        iqamaEditing[booking.id] = {
          makkahHotelName: iqama?.makkahHotelName || '',
          makkahBrn: iqama?.makkahBrn || '',
          madinahHotelName: iqama?.madinahHotelName || '',
          madinahBrn: iqama?.madinahBrn || '',
        };
      }
    });
    setEditingIqama(iqamaEditing);

    setBookingList(bookingsData);
    setPagination(data.pagination);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    toast.error('Failed to load bookings');
  } finally {
    setIsLoading(false);
  }
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'search') setSearchQuery(value);
    else if (key === 'dateFrom') setArrivalDateFrom(value);
    else if (key === 'dateTo') setArrivalDateTo(value);
    else if (key === 'depDateFrom') setDepartureDateFrom(value);
    else if (key === 'depDateTo') setDepartureDateTo(value);
    
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleUpdateIqamaHotel = async (bookingId: string) => {
    const data = editingIqama[bookingId];
    if (!data) return;

    try {
      toast.info('Updating hotel details...');
      await umrahVisaAPI.updateAccommodation(bookingId, {
        makkahHotelName: data.makkahHotelName,
        makkahBrn: data.makkahBrn,
        madinahHotelName: data.madinahHotelName,
        madinahBrn: data.madinahBrn,
      });
      toast.success('Hotel details updated successfully');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update hotel details');
    }
  };

  const totalIqamaPassengers = useMemo(() => {
    if (activeTab !== 'iqama') return 0;
    return bookingList.reduce((sum, booking) => {
      return sum + (booking.passengerCount || 0);
    }, 0);
  }, [bookingList, activeTab]);

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

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      const d = date.toLocaleDateString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const t = date.toLocaleTimeString('en-US', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${d} ${t}`;
    } catch {
      return 'N/A';
    }
  };

  const formatRecordDateTimeIST = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      // Ensure the string is treated as UTC if it lacks a timezone designator,
      // preventing the browser from double-converting or misinterpreting it.
      let normalized = dateString;
      if (
        typeof dateString === 'string' &&
        !dateString.includes('Z') &&
        !dateString.includes('GMT') &&
        !/[+-]\d{2}:?\d{2}$/.test(dateString)
      ) {
        if (dateString.includes(':') || dateString.includes('T')) {
          normalized = dateString.endsWith(' ') ? dateString.trim() + 'Z' : dateString + 'Z';
        }
      }

      const date = new Date(normalized);
      if (isNaN(date.getTime())) return 'N/A';
      const d = date.toLocaleDateString('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const t = date.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${d} ${t}`;
    } catch {
      return 'N/A';
    }
  };

  const copyToClipboard = async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label || 'Value'} copied to clipboard`);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleUploadConfirmation = async (booking: UmrahVisaBooking, file: File) => {
    if (!file || !booking.id) {
      toast.error('Please select an image');
      return;
    }

    try {
      toast.info('Uploading confirmation image...');
      
      const uploadResponse = await uploadAPI.uploadDocument(
        booking.id,
        file,
        'confirmation_image'
      );
      
      const imagePath = uploadResponse.data.document.filePath;
      const response = await umrahVisaAPI.uploadConfirmation(booking.id, imagePath);

      toast.success('Confirmation uploaded successfully! Status changed to Booking Success');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload confirmation');
    }
  };

  const handleUpdateTripStatus = async (bookingId: string, status: 'pending' | 'hosting' | 'completed') => {
    try {
      if (status === 'hosting') {
        toast.info('Sending hosting notifications...');
      } else {
        toast.info(`Marking as ${status}...`);
      }
      
      await umrahVisaAPI.updateTripStatus(bookingId, status);
      toast.success(`Status updated to ${status}`);
      fetchBookings();
    } catch (error: any) {
      console.error('Error updating trip status:', error);
      toast.error(error?.response?.data?.error || `Failed to update status to ${status}`);
    }
  };

  const handleMarkReadyForVoucher = async (booking: UmrahVisaBooking) => {
    if (!booking.id) return;

    try {
      toast.info('Marking as completed...');
      // Update trip status to completed
      await umrahVisaAPI.updateTripStatus(booking.id, 'completed');
      
      // Also trigger mark-ready-for-voucher if it's still group_assigned
      if (booking.status === 'group_assigned') {
        await umrahVisaAPI.markReadyForVoucher(booking.id);
      }
      
      toast.success('Trip marked as completed');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark trip as completed');
    }
  };

  const handleCopyAll = async (booking: UmrahVisaBooking) => {
    const mainTravel = booking.travelDetails?.find(t => !t.isAlternate);
    let makkahHotelName = 'N/A';
    let makkahBrn = 'N/A';
    let makkahCheckIn = 'N/A';
    let makkahCheckOut = 'N/A';
    
    let madinahHotelName = 'N/A';
    let madinahBrn = 'N/A';
    let madinahCheckIn = 'N/A';
    let madinahCheckOut = 'N/A';

    let iqamaInfo = '';

    const formatDateShort = (dateStr: string | undefined) => {
      if (!dateStr) return 'N/A';
      return new Date(dateStr).toLocaleDateString('en-US', {
        timeZone: 'UTC',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };

    const brnToString = (brn: any) => {
      if (!brn) return 'N/A';
      if (Array.isArray(brn)) return brn.join(', ');
      return String(brn);
    };

    if (booking.accommodationType === 'hotel') {
      const makkahHotel = booking.hotelBookings?.find(h => (h.city?.name || '').toLowerCase().includes('makkah'));
      const madinahHotel = booking.hotelBookings?.find(h => (h.city?.name || '').toLowerCase().includes('madinah'));
      
      if (makkahHotel) {
        makkahHotelName = makkahHotel.hotel?.name || 'N/A';
        makkahBrn = brnToString(makkahHotel.brn);
        makkahCheckIn = formatDateShort(makkahHotel.checkInDate);
        makkahCheckOut = formatDateShort(makkahHotel.checkOutDate);
      }
      if (madinahHotel) {
        madinahHotelName = madinahHotel.hotel?.name || 'N/A';
        madinahBrn = brnToString(madinahHotel.brn);
        madinahCheckIn = formatDateShort(madinahHotel.checkInDate);
        madinahCheckOut = formatDateShort(madinahHotel.checkOutDate);
      }
    } else if (booking.accommodationType === 'iqama') {
      const mainIqama = booking.sponsorIqamaDetails?.find(i => !i.isAlternate);
      if (mainIqama) {
        makkahHotelName = mainIqama.makkahHotelName || 'N/A';
        makkahBrn = brnToString(mainIqama.makkahBrn);
        
        madinahHotelName = mainIqama.madinahHotelName || 'N/A';
        madinahBrn = brnToString(mainIqama.madinahBrn);

        // Additional Iqama info for copy text
        iqamaInfo = `💳 *Iqama Number:* ${mainIqama.iqamaNumber || 'N/A'}\n`;
        iqamaInfo += `👤 *Iqama Holder:* ${mainIqama.iqamaSponserName || 'N/A'}\n`;
        iqamaInfo += `🎂 *DOB:* ${formatDateShort(mainIqama.sponserDob)}\n`;
        iqamaInfo += `📱 *Phone:* ${mainIqama.sponserMobileNumber || 'N/A'}\n`;
        iqamaInfo += `📍 *Address:* ${mainIqama.sponserNationalShortAddress || 'N/A'}\n\n`;
      }
    }

    let text = `📋 *Group Number:* ${booking.groupNumber || 'N/A'}\n`;
    text += `🏷️ *Group Name:* ${booking.groupName || 'N/A'}\n`;
    text += `👥 *Number of Pilgrims:* ${booking.passengerCount || 0}\n\n`;

    if (iqamaInfo) {
      text += iqamaInfo;
    }

    if (makkahHotelName !== 'N/A') {
      text += `🏨 *Hotel 1:* ${makkahHotelName}\n`;
      text += `📄 *Agreement No.:* ${makkahBrn}\n`;
      if (booking.accommodationType === 'hotel') {
        text += `📅 *Check-in:* ${makkahCheckIn}\n`;
        text += `📅 *Check-out:* ${makkahCheckOut}\n`;
      }
      text += `\n`;
    }

    if (madinahHotelName !== 'N/A') {
      text += `🏨 *Hotel 2:* ${madinahHotelName}\n`;
      text += `📄 *Agreement No.:* ${madinahBrn}\n`;
      if (booking.accommodationType === 'hotel') {
        text += `📅 *Check-in:* ${madinahCheckIn}\n`;
        text += `📅 *Check-out:* ${madinahCheckOut}\n`;
      }
      text += `\n`;
    }

    text += `🛫 *Arrival Flight:* ${mainTravel?.arrivalFlightNumber || 'N/A'}\n`;
    text += `📅 *Arrival Date:* ${formatDateShort(mainTravel?.arrivalDateTime)}\n\n`;

    text += `🛬 *Departure Flight:* ${mainTravel?.departureFlightNumber || 'N/A'}\n`;
    text += `📅 *Departure Date:* ${formatDateShort(mainTravel?.departureDateTime)}\n\n`;

    text += `Kindly issue the visas for all pilgrims at the earliest.\nThank you.`;

    try {
      await navigator.clipboard.writeText(text);
      toast.success('All trip info copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy info');
    }
  };

  const renderActionButton = (booking: UmrahVisaBooking) => {
    const isIqama = booking.accommodationType === 'iqama';
    const currentStatus = booking.tripStatus || 'pending';

    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleCopyAll(booking)}
          className="flex items-center gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          <Copy className="h-3 w-3" />
          Copy All
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDownloadBookingPDF(booking)}
          disabled={downloadingId === booking.id}
          className="flex items-center gap-1 border-gray-200 text-gray-700 hover:bg-gray-50"
          title="Download Booking PDF"
        >
          {downloadingId === booking.id ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          PDF
        </Button>
        
        {isIqama ? (
          <>
            {currentStatus === 'pending' && (
              <Button
                size="sm"
                onClick={() => handleUpdateTripStatus(booking.id!, 'hosting')}
                disabled={!booking.makkahBrn && !booking.madinahBrn}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400"
              >
                Start Hosting
              </Button>
            )}
            {currentStatus === 'hosting' && (
              <Button
                size="sm"
                onClick={() => handleUpdateTripStatus(booking.id!, 'completed')}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                Done
              </Button>
            )}
            {currentStatus === 'pending' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleUpdateIqamaHotel(booking.id!)}
                className="h-8 text-[10px] text-purple-600 border border-purple-100"
              >
                Save Info
              </Button>
            )}
          </>
        ) : (
          <>
            {currentStatus !== 'completed' && (
              <Button
                size="sm"
                onClick={() => handleMarkReadyForVoucher(booking)}
                disabled={!(booking.hotelBookings?.some((h: any) => h.brn && (Array.isArray(h.brn) ? h.brn.length > 0 : String(h.brn).trim() !== '')))}
                className="flex items-center gap-1 whitespace-nowrap bg-green-600 hover:bg-green-700 text-white font-bold disabled:opacity-50 disabled:bg-gray-400"
              >
                Done
              </Button>
            )}
          </>
        )}
      </div>
    );
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trip info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 min-h-screen">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Trip Info Management</h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
              Track and manage all Umrah visa trip information
            </p>
          </div>
          <Button 
            onClick={() => fetchBookings()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8">
          <Card>
            <CardHeader>
              <CardTitle>Trip Information</CardTitle>
              <CardDescription>
                Showing {bookingList.length} of {pagination.total} bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats Card / Date-wise Pending Load */}
              <div className="space-y-4">
                <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Pending BRN Load Summary
                        </CardTitle>
                        <CardDescription className="text-[10px] text-amber-600 font-medium">
                          {activeTab === 'iqama' && pendingLoadBasis === 'departure'
                            ? "Total mutammers in iqama bookings without any hotel BRN saved (by departure date - total beds needed)"
                            : "Total mutammers in bookings without any hotel BRN saved (by arrival date)"}
                        </CardDescription>
                      </div>
                      
                      {activeTab === 'iqama' && (
                        <div className="flex items-center gap-1 bg-white/60 p-0.5 rounded-lg border border-amber-200/50 w-fit">
                          <button
                            onClick={() => setPendingLoadBasis('arrival')}
                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                              pendingLoadBasis === 'arrival'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'text-amber-800 hover:bg-amber-100'
                            }`}
                          >
                            Arrival Based
                          </button>
                          <button
                            onClick={() => setPendingLoadBasis('departure')}
                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                              pendingLoadBasis === 'departure'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'text-amber-800 hover:bg-amber-100'
                            }`}
                          >
                            Departure Based
                          </button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingLoad ? (
                      <div className="flex justify-center py-4"><RefreshCw className="h-5 w-5 animate-spin text-amber-400" /></div>
                    ) : pendingBrnLoad.length === 0 ? (
                      <p className="text-xs text-gray-500 font-medium italic">No pending load found for this category.</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {pendingBrnLoad.map((item) => {
                          const hasBreakdowns = activeTab === 'hotel' && item.breakdowns && item.breakdowns.length > 0;
                          
                          if (hasBreakdowns) {
                            return (
                              <div 
                                key={item.date} 
                                className="flex flex-col bg-white border border-amber-100 rounded-xl p-3 shadow-sm min-w-[150px] transition-all text-center"
                              >
                                {/* Header (Arrival Date Filter) */}
                                <div 
                                  onClick={() => handlePendingLoadClick(item.date)}
                                  className="w-full text-center border-b border-amber-100/70 pb-1.5 mb-1.5 cursor-pointer hover:text-amber-700 select-none group"
                                >
                                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter block group-hover:text-amber-700">{new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Total: {item.count} Pax</span>
                                </div>
                                
                                {/* Breakdowns list */}
                                <div className="w-full space-y-1 text-left">
                                  {item.breakdowns?.map((b, idx) => (
                                    <div 
                                      key={idx}
                                      onClick={() => handlePendingLoadClick(item.date, b.departureDate)}
                                      className="flex items-center justify-between text-[9px] hover:bg-amber-100/50 px-1.5 py-1 rounded cursor-pointer transition-colors border border-transparent hover:border-amber-200/50"
                                      title={`Filter by arrival ${new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} and departure ${new Date(b.departureDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                                    >
                                      <span className="font-semibold text-gray-505 text-gray-500">{b.rangeLabel}</span>
                                      <span className="font-black text-secondary bg-amber-100/60 px-1 py-0.5 rounded text-[8px]">{b.count} Pax</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <button 
                              key={item.date} 
                              onClick={() => handlePendingLoadClick(item.date)}
                              className="flex flex-col items-center bg-white border border-amber-100 rounded-xl p-3 shadow-sm min-w-[100px] hover:border-amber-400 hover:shadow-md transition-all active:scale-95 text-center group"
                            >
                              <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter mb-1 group-hover:text-amber-700">{new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                              <span className="text-xl font-black text-secondary group-hover:scale-110 transition-transform">{item.count}</span>
                              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pilgrims</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Tabs for Accommodation Type */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-1 gap-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => { 
                      setActiveTab('iqama'); 
                      setArrivalDateFrom('');
                      setArrivalDateTo('');
                      setDepartureDateFrom('');
                      setDepartureDateTo('');
                      setPendingLoadBasis('arrival');
                      setPagination(p => ({...p, page: 1})); 
                    }}
                    className={`px-6 py-2 text-sm font-black uppercase tracking-widest border-b-2 transition-colors ${
                      activeTab === 'iqama'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Iqama Trip
                  </button>
                  <button
                    onClick={() => { 
                      setActiveTab('hotel'); 
                      setArrivalDateFrom('');
                      setArrivalDateTo('');
                      setDepartureDateFrom('');
                      setDepartureDateTo('');
                      setPendingLoadBasis('arrival');
                      setPagination(p => ({...p, page: 1})); 
                    }}
                    className={`px-6 py-2 text-sm font-black uppercase tracking-widest border-b-2 transition-colors ${
                      activeTab === 'hotel'
                        ? 'border-emerald-600 text-emerald-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Hotel Trip
                  </button>
                </div>

                {/* Sub-tabs based on active main tab */}
                <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl border w-fit">
                  {activeTab === 'iqama' ? (
                    <>
                      <button 
                        onClick={() => { setIqamaSubTab('pending'); setPagination(p => ({...p, page: 1})); }}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${iqamaSubTab === 'pending' ? 'bg-white text-purple-600 shadow-sm border border-purple-100' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        Pending
                      </button>
                      <button 
                        onClick={() => { setIqamaSubTab('hosting'); setPagination(p => ({...p, page: 1})); }}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${iqamaSubTab === 'hosting' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        Hosting
                      </button>
                      <button 
                        onClick={() => { setIqamaSubTab('completed'); setPagination(p => ({...p, page: 1})); }}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${iqamaSubTab === 'completed' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        Completed
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => { setHotelSubTab('pending'); setPagination(p => ({...p, page: 1})); }}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${hotelSubTab === 'pending' ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        Pending
                      </button>
                      <button 
                        onClick={() => { setHotelSubTab('completed'); setPagination(p => ({...p, page: 1})); }}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${hotelSubTab === 'completed' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        Completed
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Search and Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search by party, group, iqama..."
                    value={searchQuery}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
                <DatePicker
                  placeholder="Arrival Date From"
                  value={arrivalDateFrom}
                  onChange={(val) => handleFilterChange('dateFrom', fromDisplayDate(val))}
                />
                <DatePicker
                  placeholder="Arrival Date To"
                  value={arrivalDateTo}
                  onChange={(val) => handleFilterChange('dateTo', fromDisplayDate(val))}
                />
                <DatePicker
                  placeholder="Departure Date From"
                  value={departureDateFrom}
                  onChange={(val) => handleFilterChange('depDateFrom', fromDisplayDate(val))}
                />
                <DatePicker
                  placeholder="Departure Date To"
                  value={departureDateTo}
                  onChange={(val) => handleFilterChange('depDateTo', fromDisplayDate(val))}
                />
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Visa Type</TableHead>
                      <TableHead className="w-[120px]">Booking Ref</TableHead>
                      <TableHead className="w-[100px] text-center font-black">Qty</TableHead>
                      <TableHead className="w-[200px]">{activeTab === 'hotel' ? 'Party Code/Name' : 'Group Details'}</TableHead>
                      <TableHead className="w-[180px]">Arrival Details</TableHead>
                      <TableHead className="w-[180px]">Departure Details</TableHead>
                      <TableHead className="w-[220px]">{activeTab === 'iqama' ? 'Iqama Details' : 'Hotel Details'}</TableHead>
                      {activeTab === 'hotel' && (
                        <TableHead className="w-[150px]">Visa Provider</TableHead>
                      )}
                      <TableHead className="w-[150px]">Updated By</TableHead>
                      {activeTab === 'hotel' && (
                        <TableHead className="w-[120px]">Booking Date</TableHead>
                      )}
                      {activeTab === 'iqama' && (
                        <TableHead className="w-[180px]">Upload Image</TableHead>
                      )}
                      <TableHead className="w-[280px]">Status & Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookingList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                          {searchQuery 
                            ? 'No trips found matching your search' 
                            : 'No trip information available'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      bookingList.map((booking) => {
                        const iqamaDetails = booking.sponsorIqamaDetails?.find(id => !id.isAlternate);
                        return (
                          <TableRow key={booking.id} className="group">
                            {/* Visa Type */}
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={booking.visaType === 'group_visa' ? 'default' : 'secondary'} className="text-xs">
                                  {booking.visaType === 'group_visa' ? 'Group Visa' : 'Individual Visa'}
                                </Badge>
                                {booking.hasMultipleGroup && (
                                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                                    Add to Existing
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            {/* Booking Ref */}
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-primary font-mono tracking-tighter">
                                    {booking.bookingReference || 'N/A'}
                                  </span>
                                  {booking.bookingReference && (
                                    <button
                                      onClick={() => copyToClipboard(booking.bookingReference!, 'Booking Ref')}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                      title="Copy reference"
                                    >
                                      <Copy className="h-3 w-3 text-gray-500" />
                                    </button>
                                  )}
                                </div>
                                {(booking as any).vouchers?.[0]?.voucherNumber && (
                                  <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-0.5">
                                    Voucher: {(booking as any).vouchers[0].voucherNumber}
                                  </span>
                                )}
                                {booking.createdAt && (
                                  <span className="text-[9px] text-gray-400 mt-1">
                                    C: {formatRecordDateTimeIST(booking.createdAt)}
                                  </span>
                                )}
                                {booking.updatedAt && booking.updatedAt !== booking.createdAt && (
                                  <span className="text-[9px] text-gray-400">
                                    M: {formatRecordDateTimeIST(booking.updatedAt)}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Qty Cell */}
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-black bg-blue-50 text-blue-700 border-blue-100">
                                {booking.passengerCount} PAX
                              </Badge>
                            </TableCell>

                            {/* Group Details / Party Code Name */}
                            <TableCell>
                              {activeTab === 'hotel' ? (
                                <div className="space-y-1">
                                  <div className="font-semibold text-gray-900 flex items-center gap-1">
                                    {booking.party?.partyCode ? `${booking.party.partyCode} - ${booking.party.partyName || 'N/A'}` : booking.party?.partyName || 'N/A'}
                                    <button
                                      onClick={() => copyToClipboard(
                                        booking.party?.partyCode ? `${booking.party.partyCode} - ${booking.party.partyName || 'N/A'}` : booking.party?.partyName || 'N/A',
                                        'Party Code/Name'
                                      )}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                      title="Copy party code/name"
                                    >
                                      <Copy className="h-3 w-3 text-gray-500" />
                                    </button>
                                  </div>
                                  {booking.groupNumber ? (
                                    <>
                                      {(() => {
                                        let groups: Array<{ groupNumber?: string; groupName?: string }> = [];
                                        if (booking.hasMultipleGroup && booking.multipleGroupDetails) {
                                          try {
                                            if (Array.isArray(booking.multipleGroupDetails)) {
                                              groups = booking.multipleGroupDetails as Array<{ groupNumber?: string; groupName?: string }>;
                                            }
                                          } catch (e) {
                                            console.error('Error parsing multipleGroupDetails:', e);
                                          }
                                        }
                                        
                                        if (groups.length > 0) {
                                          const lastIndex = groups.length - 1;
                                          
                                          return (
                                            <div className="text-xs font-medium flex flex-wrap items-center gap-1">
                                              {groups.map((group, idx) => {
                                                const isLast = idx === lastIndex && booking.hasMultipleGroup;
                                                const displayText = `${group.groupNumber || ''}${group.groupName ? ` - ${group.groupName}` : ''}`;
                                                
                                                return (
                                                  <span 
                                                    key={idx} 
                                                    className={`flex items-center gap-1 ${isLast ? 'text-orange-600 font-semibold' : 'text-indigo-600'}`}
                                                  >
                                                    {displayText}
                                                    <button
                                                      onClick={() => copyToClipboard(displayText, 'Group Details')}
                                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                                      title="Copy group details"
                                                    >
                                                      <Copy className="h-3 w-3" />
                                                    </button>
                                                    {idx < groups.length - 1 && <span className={isLast ? 'text-orange-600' : 'text-indigo-600'}>,</span>}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                              {booking.groupNumber} {booking.groupName ? `(${booking.groupName})` : ''}
                                              <button
                                                onClick={() => copyToClipboard(
                                                  `${booking.groupNumber}${booking.groupName ? ` (${booking.groupName})` : ''}`,
                                                  'Group Number'
                                                )}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                                title="Copy group number"
                                              >
                                                <Copy className="h-3 w-3 text-gray-500" />
                                              </button>
                                            </div>
                                          );
                                        }
                                      })()}
                                    </>
                                  ) : (
                                    <div className="text-sm text-gray-400 italic">No group assigned</div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="font-semibold text-gray-900 flex items-center gap-1">
                                    {booking.party?.partyName || 'N/A'}
                                    <button
                                      onClick={() => copyToClipboard(booking.party?.partyName || '', 'Party Name')}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                      title="Copy party name"
                                    >
                                      <Copy className="h-3 w-3 text-gray-500" />
                                    </button>
                                  </div>
                                  {booking.groupNumber ? (
                                    <>
                                      {(() => {
                                        let groups: Array<{ groupNumber?: string; groupName?: string }> = [];
                                        if (booking.hasMultipleGroup && booking.multipleGroupDetails) {
                                          try {
                                            if (Array.isArray(booking.multipleGroupDetails)) {
                                              groups = booking.multipleGroupDetails as Array<{ groupNumber?: string; groupName?: string }>;
                                            }
                                          } catch (e) {
                                            console.error('Error parsing multipleGroupDetails:', e);
                                          }
                                        }
                                        
                                        if (groups.length > 0) {
                                          const lastIndex = groups.length - 1;
                                          
                                          return (
                                            <div className="text-sm font-medium flex flex-wrap items-center gap-1">
                                              {groups.map((group, idx) => {
                                                const isLast = idx === lastIndex && booking.hasMultipleGroup;
                                                const displayText = `${group.groupNumber || ''}${group.groupName ? ` - ${group.groupName}` : ''}`;
                                                
                                                return (
                                                  <span 
                                                    key={idx} 
                                                    className={`flex items-center gap-1 ${isLast ? 'text-orange-600 font-semibold' : 'text-indigo-600'}`}
                                                  >
                                                    {displayText}
                                                    <button
                                                      onClick={() => copyToClipboard(displayText, 'Group Details')}
                                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                                      title="Copy group details"
                                                    >
                                                      <Copy className="h-3 w-3" />
                                                    </button>
                                                    {idx < groups.length - 1 && <span className={isLast ? 'text-orange-600' : 'text-indigo-600'}>,</span>}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <>
                                              <div className="text-sm font-medium text-indigo-600 flex items-center gap-1">
                                                {booking.groupNumber}
                                                <button
                                                  onClick={() => copyToClipboard(booking.groupNumber || '', 'Group Number')}
                                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                                  title="Copy group number"
                                                >
                                                  <Copy className="h-3 w-3 text-gray-500" />
                                                </button>
                                              </div>
                                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                                {booking.groupName}
                                                {booking.groupName && (
                                                  <button
                                                    onClick={() => copyToClipboard(booking.groupName || '', 'Group Name')}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                                    title="Copy group name"
                                                  >
                                                    <Copy className="h-3 w-3 text-gray-500" />
                                                  </button>
                                                )}
                                              </div>
                                            </>
                                          );
                                        }
                                      })()}
                                    </>
                                  ) : (
                                    <div className="text-sm text-gray-400 italic">No group assigned</div>
                                  )}
                                </div>
                              )}
                            </TableCell>

                            {/* Arrival Details */}
                            <TableCell>
                              <div className="space-y-1">
                                {(() => {
                                  const mainTravel = booking.travelDetails?.find(t => !t.isAlternate);
                                  if (activeTab === 'hotel') {
                                    return (
                                      <>
                                        <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                          {mainTravel?.arrivalDateTime ? formatDateTime(mainTravel.arrivalDateTime) : 'N/A'}
                                          {mainTravel?.arrivalDateTime && (
                                            <button
                                              onClick={() => {
                                                const dateTime = mainTravel?.arrivalDateTime;
                                                if (dateTime) {
                                                  copyToClipboard(formatDateTime(dateTime), 'Arrival Date/Time');
                                                }
                                              }}
                                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                              title="Copy arrival date/time"
                                            >
                                              <Copy className="h-3 w-3 text-gray-500" />
                                            </button>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-600 flex items-center gap-1">
                                          Flight: {mainTravel?.arrivalFlightNumber || 'N/A'}
                                          {mainTravel?.arrivalFlightNumber && (
                                            <button
                                              onClick={() => {
                                                const flightNumber = mainTravel?.arrivalFlightNumber;
                                                if (flightNumber) {
                                                  copyToClipboard(flightNumber, 'Arrival Flight');
                                                }
                                              }}
                                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                              title="Copy flight number"
                                            >
                                              <Copy className="h-3 w-3 text-gray-500" />
                                            </button>
                                          )}
                                        </div>
                                      </>
                                    );
                                  } else {
                                    return (
                                      <>
                                        <div className="text-sm font-medium text-gray-900">
                                          {mainTravel?.arrivalDateTime ? formatDate(mainTravel.arrivalDateTime) : 'N/A'}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          {iqamaDetails?.sponserMobileNumber || 'N/A'}
                                        </div>
                                      </>
                                    );
                                  }
                                })()}
                              </div>
                            </TableCell>

                            {/* Departure Details */}
                            <TableCell>
                              <div className="space-y-1">
                                {(() => {
                                  const mainTravel = booking.travelDetails?.find(t => !t.isAlternate);
                                  if (activeTab === 'hotel') {
                                    return (
                                      <>
                                        <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                          {mainTravel?.departureDateTime ? formatDateTime(mainTravel.departureDateTime) : 'N/A'}
                                          {mainTravel?.departureDateTime && (
                                            <button
                                              onClick={() => {
                                                const dateTime = mainTravel?.departureDateTime;
                                                if (dateTime) {
                                                  copyToClipboard(formatDateTime(dateTime), 'Departure Date/Time');
                                                }
                                              }}
                                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                              title="Copy departure date/time"
                                            >
                                              <Copy className="h-3 w-3 text-gray-500" />
                                            </button>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-600 flex items-center gap-1">
                                          Flight: {mainTravel?.departureFlightNumber || 'N/A'}
                                          {mainTravel?.departureFlightNumber && (
                                            <button
                                              onClick={() => {
                                                const flightNumber = mainTravel?.departureFlightNumber;
                                                if (flightNumber) {
                                                  copyToClipboard(flightNumber, 'Departure Flight');
                                                }
                                              }}
                                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                              title="Copy flight number"
                                            >
                                              <Copy className="h-3 w-3 text-gray-500" />
                                            </button>
                                          )}
                                        </div>
                                      </>
                                    );
                                  } else {
                                    return (
                                      <>
                                        <div className="text-sm font-medium text-gray-900">
                                          {mainTravel?.departureDateTime ? formatDate(mainTravel.departureDateTime) : 'N/A'}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          {iqamaDetails?.sponserMobileNumber || 'N/A'}
                                        </div>
                                      </>
                                    );
                                  }
                                })()}
                              </div>
                            </TableCell>

                            {/* Accommodation Details */}
                            <TableCell>
                              {activeTab === 'iqama' ? (
                                <div className="space-y-3">
                                  {/* Existing Iqama Info */}
                                  <div className="space-y-1 text-[10px] text-gray-500 pb-2 border-b">
                                    <div className="flex justify-between">
                                      <span>Number:</span> <span className="font-medium text-gray-700">{iqamaDetails?.iqamaNumber || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Holder:</span> <span className="font-medium text-gray-700">{iqamaDetails?.iqamaSponserName || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>DOB:</span> <span className="font-medium text-gray-700">{iqamaDetails?.sponserDob ? formatDate(iqamaDetails.sponserDob) : 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Address:</span> <span className="font-medium text-gray-700">{iqamaDetails?.sponserNationalShortAddress || 'N/A'}</span>
                                    </div>
                                  </div>

                                  {/* New Editable Hotel/BRN Fields */}
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-purple-700">Hotel 1</label>
                                        <Input
                                          placeholder="Hotel 1"
                                          value={editingIqama[booking.id!]?.makkahHotelName || ''}
                                          onChange={(e) => setEditingIqama({
                                            ...editingIqama,
                                            [booking.id!]: { ...editingIqama[booking.id!], makkahHotelName: e.target.value }
                                          })}
                                          className="h-7 text-[10px] px-2"
                                        />
                                        <Input
                                          placeholder="BRN 1"
                                          value={editingIqama[booking.id!]?.makkahBrn || ''}
                                          onChange={(e) => setEditingIqama({
                                            ...editingIqama,
                                            [booking.id!]: { ...editingIqama[booking.id!], makkahBrn: e.target.value }
                                          })}
                                          className="h-7 text-[10px] px-2"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-purple-700">Hotel 2</label>
                                        <Input
                                          placeholder="Hotel 2"
                                          value={editingIqama[booking.id!]?.madinahHotelName || ''}
                                          onChange={(e) => setEditingIqama({
                                            ...editingIqama,
                                            [booking.id!]: { ...editingIqama[booking.id!], madinahHotelName: e.target.value }
                                          })}
                                          className="h-7 text-[10px] px-2"
                                        />
                                        <Input
                                          placeholder="BRN 2"
                                          value={editingIqama[booking.id!]?.madinahBrn || ''}
                                          onChange={(e) => setEditingIqama({
                                            ...editingIqama,
                                            [booking.id!]: { ...editingIqama[booking.id!], madinahBrn: e.target.value }
                                          })}
                                          className="h-7 text-[10px] px-2"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2 text-xs">
                                  {booking.hotelBookings && booking.hotelBookings.length > 0 ? (
                                    booking.hotelBookings.map((hotelBooking: any, index: number) => {
                                      const totalHotels = booking.hotelBookings?.length || 0;
                                      return (
                                      <div 
                                        key={hotelBooking.id || index} 
                                        className={`${index > 0 ? 'border-t pt-2 mt-2' : ''}`}
                                      >
                                        <div className="font-medium text-gray-900 mb-1">
                                          Hotel {totalHotels > 1 ? `${index + 1}` : ''}
                                        </div>
                                        <div className="space-y-0.5">
                                          <div className="flex items-center gap-1">
                                            <span className="text-gray-500">City:</span>{' '}
                                            <span className="font-medium">{hotelBooking.city?.name || 'N/A'}</span>
                                            {hotelBooking.city?.name && (
                                              <button
                                                onClick={() => copyToClipboard(hotelBooking.city.name, 'City')}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                                title="Copy city"
                                              >
                                                <Copy className="h-3 w-3 text-gray-500" />
                                              </button>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-gray-500">Hotel:</span>{' '}
                                            <span className="font-medium">{hotelBooking.hotel?.name || 'N/A'}</span>
                                            {hotelBooking.hotel?.name && (
                                              <button
                                                onClick={() => copyToClipboard(hotelBooking.hotel.name, 'Hotel')}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                                title="Copy hotel name"
                                              >
                                                <Copy className="h-3 w-3 text-gray-500" />
                                              </button>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-gray-500">Check-in:</span>{' '}
                                            <span className="font-medium">
                                              {hotelBooking.checkInDate ? formatDate(hotelBooking.checkInDate) : 'N/A'}
                                            </span>
                                            {hotelBooking.checkInDate && (
                                              <button
                                                onClick={() => copyToClipboard(formatDate(hotelBooking.checkInDate), 'Check-in Date')}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                                title="Copy check-in date"
                                              >
                                                <Copy className="h-3 w-3 text-gray-500" />
                                              </button>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-gray-500">Check-out:</span>{' '}
                                            <span className="font-medium">
                                              {hotelBooking.checkOutDate ? formatDate(hotelBooking.checkOutDate) : 'N/A'}
                                            </span>
                                            {hotelBooking.checkOutDate && (
                                              <button
                                                onClick={() => copyToClipboard(formatDate(hotelBooking.checkOutDate), 'Check-out Date')}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                                title="Copy check-out date"
                                              >
                                                <Copy className="h-3 w-3 text-gray-500" />
                                              </button>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-gray-500">BRN:</span>{' '}
                                            <span className="font-medium">
                                              {hotelBooking.brn 
                                                ? (typeof hotelBooking.brn === 'string' 
                                                    ? hotelBooking.brn 
                                                    : typeof hotelBooking.brn === 'object' 
                                                      ? JSON.stringify(hotelBooking.brn) 
                                                      : String(hotelBooking.brn))
                                                : 'N/A'}
                                            </span>
                                            {hotelBooking.brn && (
                                              <button
                                                onClick={() => copyToClipboard(
                                                  typeof hotelBooking.brn === 'string' 
                                                    ? hotelBooking.brn 
                                                    : typeof hotelBooking.brn === 'object' 
                                                      ? JSON.stringify(hotelBooking.brn) 
                                                      : String(hotelBooking.brn),
                                                  'BRN'
                                                )}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                                title="Copy BRN"
                                              >
                                                <Copy className="h-3 w-3 text-gray-500" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-gray-400 italic">No hotel bookings</div>
                                  )}
                                </div>
                              )}
                            </TableCell>

                            {activeTab === 'hotel' && (
                              <TableCell>
                                <div className="text-xs">
                                  <div className="font-medium text-gray-900 flex items-center gap-1">
                                    {booking.umrahVisaProvider?.partyName || 'N/A'}
                                    {booking.umrahVisaProvider?.partyName && (
                                      <button
                                        onClick={() => copyToClipboard(booking.umrahVisaProvider!.partyName, 'Visa Provider')}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                        title="Copy visa provider"
                                      >
                                        <Copy className="h-3 w-3 text-gray-500" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            )}

                            <TableCell>
                              <div className="space-y-1 text-xs">
                                <div className="font-medium text-gray-900">
                                  {booking.lastUpdatedByUser?.name || 'System'}
                                </div>
                                <div className="text-gray-500">
                                  {booking.updatedAt ? formatRecordDateTimeIST(booking.updatedAt) : 'N/A'}
                                </div>
                              </div>
                            </TableCell>

                            {activeTab === 'hotel' && (
                              <TableCell>
                                <div className="text-xs">
                                  <div className="font-medium text-gray-900 flex items-center gap-1">
                                    {booking.submittedAt ? formatDate(booking.submittedAt) : 'N/A'}
                                    {booking.submittedAt && (
                                      <button
                                        onClick={() => {
                                          const submittedAt = booking.submittedAt;
                                          if (submittedAt) {
                                            copyToClipboard(formatDate(submittedAt), 'Booking Date');
                                          }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                                        title="Copy booking date"
                                      >
                                        <Copy className="h-3 w-3 text-gray-500" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            )}

                            {activeTab === 'iqama' && (
                              <TableCell>
                                <div className="space-y-2">
                                  <div className="text-xs text-gray-500 text-center">
                                    Downloads: {booking.documentsDownloadCount || 0}/1
                                  </div>
                                  
                                  {iqamaDetails?.confirmationImagePath ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <a 
                                        href={getFileUrl(iqamaDetails.confirmationImagePath)} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-blue-600 font-bold hover:underline bg-blue-50 px-2 py-1 rounded border border-blue-200"
                                      >
                                        View Image
                                      </a>
                                      <span className="text-[8px] text-gray-400">Uploaded at {iqamaDetails.confirmationUploadedAt ? formatDate(iqamaDetails.confirmationUploadedAt) : 'N/A'}</span>
                                      
                                      <div className="mt-2 pt-2 border-t w-full">
                                        <p className="text-[8px] text-gray-500 mb-1 text-center">Re-upload:</p>
                                        <Input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleUploadConfirmation(booking, file);
                                              e.target.value = '';
                                            }
                                          }}
                                          className="text-[10px] h-7 cursor-pointer"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleUploadConfirmation(booking, file);
                                          e.target.value = '';
                                        }
                                      }}
                                      className="text-xs cursor-pointer"
                                    />
                                  )}
                                </div>
                              </TableCell>
                            )}

                            <TableCell>
                              <div className="flex items-center justify-between gap-3">
                                <Badge className={`${UMRAH_VISA_STATUS_CONFIG[booking.status || 'group_assigned'].color} flex items-center gap-1 text-xs whitespace-nowrap`}>
                                  {booking.status === 'group_assigned' && <Users className="h-3 w-3" />}
                                  {UMRAH_VISA_STATUS_CONFIG[booking.status || 'group_assigned'].label}
                                </Badge>
                                <div className="flex-shrink-0">
                                  {renderActionButton(booking)}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    
                    <span className="text-sm text-gray-500">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
