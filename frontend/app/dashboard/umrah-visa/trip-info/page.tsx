'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { UmrahVisaBooking, UmrahVisaStatus } from '@/types';
import { umrahVisaAPI, uploadAPI } from '@/lib/api';
import { UMRAH_VISA_STATUS_CONFIG } from '@/lib/constants';

export default function TripInfoPage() {
  const router = useRouter();
  const user = getUser();
  const [bookingList, setBookingList] = useState<UmrahVisaBooking[]>([]);
  const [filteredData, setFilteredData] = useState<UmrahVisaBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'iqama' | 'hotel'>('iqama');

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    fetchBookings();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchQuery, bookingList, activeTab]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const response = await umrahVisaAPI.getBookings({ limit: 1000 });
      const data = response.data;
      
      const bookingsData = data.bookings
        .filter((booking: any) => 
          booking.status === 'group_assigned' || 
          booking.status === 'voucher' || 
          booking.status === 'bill'
        );

      setBookingList(bookingsData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = bookingList;

    if (activeTab === 'iqama') {
      filtered = filtered.filter(booking => booking.accommodationType === 'iqama');
    } else if (activeTab === 'hotel') {
      filtered = filtered.filter(booking => booking.accommodationType === 'hotel');
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.party?.partyName?.toLowerCase().includes(query) ||
        booking.groupNumber?.toLowerCase().includes(query) ||
        booking.groupName?.toLowerCase().includes(query) ||
        booking.sponsorIqamaDetails?.some((id: any) => id.iqamaNumber?.toLowerCase().includes(query))
      );
    }

    setFilteredData(filtered);
  };

  const totalIqamaPassengers = useMemo(() => {
    if (activeTab !== 'iqama') return 0;
    return filteredData.reduce((sum, booking) => {
      return sum + (booking.passengerCount || 0);
    }, 0);
  }, [filteredData, activeTab]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
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

  const handleMarkReadyForVoucher = async (booking: UmrahVisaBooking) => {
    if (!booking.id) return;

    try {
      toast.info('Marking booking as ready for voucher...');
      const response = await umrahVisaAPI.markReadyForVoucher(booking.id);
      toast.success('Booking marked as ready for voucher generation');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark booking as ready');
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

    const formatDateShort = (dateStr: string | undefined) => {
      if (!dateStr) return 'N/A';
      return new Date(dateStr).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
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
        // We don't store checkin/out for Iqama hotels directly yet, could infer from flight or leave N/A
        makkahCheckIn = 'N/A'; 
        makkahCheckOut = 'N/A';

        madinahHotelName = mainIqama.madinahHotelName || 'N/A';
        madinahBrn = brnToString(mainIqama.madinahBrn);
        madinahCheckIn = 'N/A';
        madinahCheckOut = 'N/A';
      }
    }

    let text = `📋 *Group Number:* ${booking.groupNumber || 'N/A'}\n`;
    text += `🏷️ *Group Name:* ${booking.groupName || 'N/A'}\n`;
    text += `👥 *Number of Pilgrims:* ${booking.passengerCount || 0}\n\n`;

    if (makkahHotelName !== 'N/A') {
      text += `🏨 *Makkah Hotel:* ${makkahHotelName}\n`;
      text += `📄 *Agreement No.:* ${makkahBrn}\n`;
      text += `📅 *Check-in:* ${makkahCheckIn}\n`;
      text += `📅 *Check-out:* ${makkahCheckOut}\n\n`;
    }

    if (madinahHotelName !== 'N/A') {
      text += `🏨 *Madinah Hotel:* ${madinahHotelName}\n`;
      text += `📄 *Agreement No.:* ${madinahBrn}\n`;
      text += `📅 *Check-in:* ${madinahCheckIn}\n`;
      text += `📅 *Check-out:* ${madinahCheckOut}\n\n`;
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
        {booking.accommodationType === 'hotel' && (
          <Button
            size="sm"
            onClick={() => handleMarkReadyForVoucher(booking)}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            Done
          </Button>
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
            onClick={fetchBookings}
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
                Showing {filteredData.length} of {bookingList.length} bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats Card for Iqama Tab */}
              {activeTab === 'iqama' && (
                <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg">
                          <Users className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Passengers (BEDS)</p>
                          <p className="text-2xl font-bold text-gray-900">{totalIqamaPassengers}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabs for Accommodation Type */}
              <div className="flex space-x-2 border-b">
                <button
                  onClick={() => setActiveTab('iqama')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'iqama'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Iqama
                </button>
                <button
                  onClick={() => setActiveTab('hotel')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'hotel'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Hotel
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search by party name, group number, iqama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Visa Type</TableHead>
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
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={activeTab === 'iqama' ? 8 : 9} className="text-center py-8 text-gray-500">
                          {searchQuery 
                            ? 'No trips found matching your search' 
                            : 'No trip information available'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((booking) => {
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
                            {/* Group Details / Party Code Name */}
                            <TableCell>
                              {activeTab === 'hotel' ? (
                                <div className="space-y-1">
                                  <div className="font-semibold text-gray-900 flex items-center gap-1">
                                    {booking.party?.partyCode ? `${booking.party.partyCode} - ${booking.party.partyName || 'N/A'}` : booking.party?.partyName || 'N/A'}
                                    {booking.bookingReference && (
                                      <Badge variant="outline" className="text-[10px] py-0 border-primary/20 text-primary font-bold">
                                        {booking.bookingReference}
                                      </Badge>
                                    )}
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
                                    {booking.bookingReference && (
                                      <Badge variant="outline" className="text-[10px] py-0 border-primary/20 text-primary font-bold">
                                        {booking.bookingReference}
                                      </Badge>
                                    )}
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
                                <div className="space-y-1 text-xs">
                                  <div>
                                    <span className="text-gray-500">Number:</span>{' '}
                                    <span className="font-medium">{iqamaDetails?.iqamaNumber || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Holder:</span>{' '}
                                    <span className="font-medium">{iqamaDetails?.iqamaSponserName || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">DOB:</span>{' '}
                                    <span className="font-medium">
                                      {iqamaDetails?.sponserDob ? formatDate(iqamaDetails.sponserDob) : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Phone:</span>{' '}
                                    <span className="font-medium">{iqamaDetails?.sponserMobileNumber || 'N/A'}</span>
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
                                  {booking.updatedAt ? formatDate(booking.updatedAt) : 'N/A'}
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
                                        href={`${process.env.NEXT_PUBLIC_API_URL || ''}/uploads/${iqamaDetails.confirmationImagePath}`.replace('/api/uploads/', '/uploads/')} 
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
