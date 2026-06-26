'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI, uploadAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Plane, Users, Building, MapPin, Mail, CheckCircle, ArrowLeft, Clock, DollarSign, Route, Truck, ArrowRight, Download, Info } from 'lucide-react';
import { ManageAlternateInfoDialog } from '@/components/umrah-booking/components/ManageAlternateInfoDialog';
import { formatTransportRoute, getFileUrl } from '@/lib/utils';

export default function ViewUmrahVisaBookingPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = (params?.id as string) || '';
  const user = getUser();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingConfirmation, setDownloadingConfirmation] = useState(false);
  const [showAltInfoDialog, setShowAltInfoDialog] = useState(false);

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await umrahVisaAPI.getBookingById(bookingId);
      const bookingData = res.data;
      
      setBooking(bookingData);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date?: string | Date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateTime?: string | Date) => {
    if (!dateTime) return { date: 'N/A', time: 'N/A' };
    try {
      const dt = new Date(dateTime);
      return {
        date: dt.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' }),
        time: dt.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }),
      };
    } catch {
      return { date: 'N/A', time: 'N/A' };
    }
  };

  const renderBookingDetails = (isAlt: boolean) => {
    const travel = booking.travelDetails?.find((t: any) => !!t.isAlternate === isAlt);
    const hotels = booking.hotelBookings?.filter((h: any) => !!h.isAlternate === isAlt) || [];
    const transports = booking.transportBookings?.filter((t: any) => !!t.isAlternate === isAlt) || [];
    const movements = booking.movementDetails?.filter((m: any) => !!m.isAlternate === isAlt) || [];
    const iqama = booking.sponsorIqamaDetails?.find((i: any) => !!i.isAlternate === isAlt);

    if (!travel && hotels.length === 0 && transports.length === 0 && movements.length === 0 && !iqama) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 border-2 border-dashed rounded-lg bg-gray-50/50">
          <Info className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-medium text-lg">No {isAlt ? 'alternate' : 'main'} booking information available.</p>
          <p className="text-sm">Please complete the booking steps to add details.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {travel && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Plane className="h-5 w-5 text-sky-600" /> Travel Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="border-l-4 border-sky-500 pl-4 py-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Arrival</p>
                  <div className="text-sm">
                    {(() => {
                      const arrival = formatDateTime(travel.arrivalDateTime);
                      return (
                        <>
                          <div className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-sky-600" />
                            {arrival.date}
                          </div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                            <Clock className="h-4 w-4 text-sky-600" />
                            {arrival.time}
                          </div>
                        </>
                      );
                    })()}
                    <div className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Airport:</span> {travel.arrivalAirport?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Flight:</span> {travel.arrivalFlightNumber || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="border-l-4 border-orange-500 pl-4 py-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Departure</p>
                  <div className="text-sm">
                    {(() => {
                      const departure = formatDateTime(travel.departureDateTime);
                      return (
                        <>
                          <div className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-orange-600" />
                            {departure.date}
                          </div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                            <Clock className="h-4 w-4 text-orange-600" />
                            {departure.time}
                          </div>
                        </>
                      );
                    })()}
                    <div className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Airport:</span> {travel.departureAirport?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Flight:</span> {travel.departureFlightNumber || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {transports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Truck className="h-5 w-5 text-green-600" /> Transportation Vehicles ({transports.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                      <th className="py-3 px-4">Route</th>
                      <th className="py-3 px-4">Vehicle Type</th>
                      <th className="py-3 px-4">Capacity</th>
                      <th className="py-3 px-4">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transports.map((t: any) => (
                      <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-gray-800">{formatTransportRoute(t.transportMaster?.route)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 capitalize">{t.transportMaster?.vehicleType?.vehicleName || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{t.transportMaster?.vehicleType?.paxCount || 0} PAX</td>
                        <td className="py-3 px-4 text-sm font-semibold text-green-700">{t.transportMaster?.price || 0} SAR</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {hotels.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Building className="h-5 w-5 text-indigo-600" /> Hotel Bookings ({hotels.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4">Hotel Name</th>
                      <th className="py-3 px-4">Check-In</th>
                      <th className="py-3 px-4">Check-Out</th>
                      <th className="py-3 px-4">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotels.map((h: any) => {
                      const checkIn = new Date(h.checkInDate);
                      const checkOut = new Date(h.checkOutDate);
                      const duration = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-gray-800">{h.city?.name || 'N/A'}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{h.hotel?.name || 'N/A'}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{formatDate(h.checkInDate)}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{formatDate(h.checkOutDate)}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-indigo-700">{duration} Nights</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {movements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Route className="h-5 w-5 text-amber-600" /> Movement Schedule ({movements.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">From</th>
                      <th className="py-3 px-4">To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.sort((a: any, b: any) => new Date(a.travelDateTime).getTime() - new Date(b.travelDateTime).getTime()).map((m: any) => {
                      const dt = formatDateTime(m.travelDateTime);
                      return (
                        <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm">
                            <div className="font-medium text-gray-800">{dt.date}</div>
                            <div className="text-xs text-gray-500">{dt.time}</div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="font-medium text-gray-800">{m.fromCity?.name}</div>
                            <div className="text-xs text-gray-500">{m.fromLocation?.name}</div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="font-medium text-gray-800">{m.toCity?.name}</div>
                            <div className="text-xs text-gray-500">{m.toLocation?.name}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {iqama && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Building className="h-5 w-5 text-indigo-600" /> Sponsor & Iqama Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sponsor Name</p>
                  <p className="text-sm font-medium text-gray-900">{iqama.iqamaSponserName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Iqama Number</p>
                  <p className="text-sm font-medium text-gray-900">{iqama.iqamaNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile Number</p>
                  <p className="text-sm font-medium text-gray-900">{iqama.sponserMobileNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(iqama.sponserDob)}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">National Short Address</p>
                  <p className="text-sm font-medium text-gray-900">{iqama.sponserNationalShortAddress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const handleDownloadZip = async () => {
    if (!bookingId || downloadingZip) return;
    try {
      setDownloadingZip(true);
      toast.info('Downloading zip file...');
      const response = await umrahVisaAPI.downloadBookingZip(bookingId);
      const contentType = response.headers['content-type'] || response.data?.type || '';
      
      if (contentType.includes('application/json')) {
        // S3 path - response contains a JSON object wrapped in Blob or parsed directly
        let jsonData: any = response.data;
        if (response.data instanceof Blob) {
          const text = await response.data.text();
          jsonData = JSON.parse(text);
        }
        
        if (jsonData.downloadUrl) {
          const link = document.createElement('a');
          link.href = jsonData.downloadUrl;
          link.download = jsonData.fileName || 'documents.zip';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success('Zip file downloaded successfully!');
        } else {
          toast.error('Download URL not available');
        }
      } else {
        // Local storage path or direct stream - response is the zip file itself
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const contentDisposition = response.headers['content-disposition'];
        let fileName = 'documents.zip';
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
          if (fileNameMatch && fileNameMatch[1]) {
            fileName = fileNameMatch[1];
          }
        }
        
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Zip file downloaded successfully!');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      
      // Handle blob error response
      if (error.response?.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string);
            toast.error(errorData.error || 'Failed to download zip file');
          } catch (e) {
            toast.error('Failed to download zip file');
          }
        };
        reader.readAsText(error.response.data);
      } else {
        toast.error(error.response?.data?.error || error.message || 'Failed to download zip file');
      }
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleDownloadAllDocuments = async () => {
    if (!bookingId || downloadingAll) return;
    try {
      setDownloadingAll(true);
      toast.info('Preparing all documents ZIP...');
      
      const response = await umrahVisaAPI.downloadAllDocuments(bookingId);
      
      // Since responseType is 'blob', we create a URL for the blob
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Try to get filename from content-disposition header if available
      const contentDisposition = response.headers['content-disposition'];
      let fileName = booking?.bookingReference
        ? `${booking.bookingReference}-all-docs.zip`
        : `booking-documents-${bookingId}.zip`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1];
        }
      }
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('All documents downloaded successfully!');

      // Track download status if pending
      if (booking?.status === 'pending') {
        try {
          await umrahVisaAPI.downloadDocuments(bookingId);
          toast.success('Status updated to Documents Downloaded');
          await load();
        } catch (trackError) {
          console.warn('Failed to track download:', trackError);
        }
      }
    } catch (error: any) {
      console.error('Bulk download error:', error);
      
      // Handle blob error response
      if (error.response?.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string);
            toast.error(errorData.error || 'Failed to download documents ZIP');
          } catch (e) {
            toast.error('Failed to download documents ZIP');
          }
        };
        reader.readAsText(error.response.data);
      } else {
        toast.error('Failed to download documents ZIP');
      }
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadConfirmationImage = async () => {
    if (!booking || !bookingId || downloadingConfirmation) return;
    const mainIqama = booking.sponsorIqamaDetails?.find((i: any) => !i.isAlternate);
    const confirmationImagePath = mainIqama?.confirmationImagePath;
    if (!confirmationImagePath) {
      toast.error('Confirmation image not found');
      return;
    }
    try {
      setDownloadingConfirmation(true);
      toast.info('Downloading confirmation image...');
      const response = await umrahVisaAPI.downloadConfirmation(bookingId);
      if (response.data.downloadUrl) {
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.fileName || 'confirmation-image.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Confirmation image downloaded successfully!');
      } else {
        toast.error('Download URL not available');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to download confirmation image');
    } finally {
      setDownloadingConfirmation(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 min-h-screen">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="leading-tight">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{booking?.groupName || 'Not Assigned'}</h1>
              <p className="text-sm text-gray-500">ID: {booking?.groupNumber || 'Not Assigned'}</p>
            </div>
            <div className="flex items-center gap-3">
              {booking && (
                <Badge className={`text-sm font-medium ${
                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  booking.status === 'documents_downloaded' ? 'bg-purple-100 text-purple-800' :
                  booking.status === 'group_assigned' ? 'bg-blue-100 text-blue-800' :
                  booking.status === 'voucher' ? 'bg-orange-100 text-orange-800' :
                  booking.status === 'bill' ? 'bg-indigo-100 text-indigo-800' :
                  booking.status === 'booking_success' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {booking.status?.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => setShowAltInfoDialog(true)}
                className="flex items-center gap-2 border-secondary text-secondary hover:bg-secondary/10"
              >
                <Route className="h-4 w-4" />
                Manage Alternate Info
              </Button>

              <Button 
                variant="outline" 
                onClick={handleDownloadAllDocuments}
                disabled={downloadingAll}
                className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <Download className="h-4 w-4" />
                {downloadingAll ? 'Preparing ZIP...' : 'Download All Documents'}
              </Button>

              <Button 
                variant="outline" 
                onClick={handleDownloadZip}
                disabled={downloadingZip}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {downloadingZip ? 'Downloading...' : 'Download PAN ZIP'}
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 flex-1 overflow-auto">
        {loading ? (
          <div className="py-12 text-center">Loading...</div>
        ) : !booking ? (
          <div className="py-12 text-center text-gray-500">No booking details available</div>
        ) : (
          <div className="space-y-4 lg:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2"><Building className="h-5 w-5 text-blue-600" /> Booking Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Party Name</p>
                    <p className="text-lg font-bold text-gray-900">{booking.party?.partyName || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Group Number</p>
                    <p className="text-lg font-bold text-gray-900">{booking.groupNumber || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Passengers</p>
                    <p className="text-lg font-bold text-gray-900">{booking.passengerCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Mail className="h-5 w-5 text-indigo-600" /> Party Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Email</p>
                    <p className="text-sm text-gray-900 break-all">{booking.party?.email || 'N/A'}</p>
                  </div>
                  {booking.party?.contactNumber && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Contact</p>
                      <p className="text-sm text-gray-900">{booking.party.contactNumber}</p>
                    </div>
                  )}
                  {booking.party?.whatsappNumber && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">WhatsApp</p>
                      <p className="text-sm text-gray-900">{booking.party.whatsappNumber}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="main" className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList className="bg-white border">
                  <TabsTrigger value="main" className="data-[state=active]:bg-primary data-[state=active]:text-white">Main Info</TabsTrigger>
                  <TabsTrigger value="alternate" className="data-[state=active]:bg-secondary data-[state=active]:text-white">Alternate Info</TabsTrigger>
                </TabsList>
                {booking.status === 'pending' && (
                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                    <Clock className="h-3 w-3 mr-1" /> Draft Mode
                  </Badge>
                )}
              </div>

              <TabsContent value="main" className="space-y-6 animate-in fade-in-50 duration-300">
                {renderBookingDetails(false)}
              </TabsContent>
              
              <TabsContent value="alternate" className="space-y-6 animate-in fade-in-50 duration-300">
                {renderBookingDetails(true)}
              </TabsContent>
            </Tabs>

            {booking.accommodationType === 'iqama' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Building className="h-5 w-5 text-indigo-600" /> Iqama Confirmation</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const mainIqama = booking.sponsorIqamaDetails?.find((i: any) => !i.isAlternate);
                    if (mainIqama?.confirmationImagePath) {
                      return (
                        <div className="space-y-4">
                          <div className="relative h-48 w-full max-w-md border rounded-lg overflow-hidden group">
                            <img 
                              src={getFileUrl(mainIqama.confirmationImagePath)} 
                              alt="Confirmation" 
                              className="h-full w-full object-contain bg-white"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Button variant="secondary" size="sm" onClick={() => window.open(getFileUrl(mainIqama.confirmationImagePath), '_blank')}>
                                <Download className="h-4 w-4 mr-2" /> View Original
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-start">
                            <Button
                              onClick={handleDownloadConfirmationImage}
                              disabled={downloadingConfirmation}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              {downloadingConfirmation ? 'Downloading...' : 'Download Image'}
                            </Button>
                          </div>
                        </div>
                      );
                    }
                    return <p className="text-sm text-gray-500 italic">No confirmation image uploaded.</p>;
                  })()}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-rose-600" /> Passengers ({booking.passengers?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(booking.passengers || []).map((p: any) => (
                    <div 
                      key={p.id} 
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-base mb-2">
                            {p.fullName || 'N/A'}
                          </h3>
                          {p.isLeadPassenger && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs font-semibold mb-2">
                              Lead Passenger
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600 font-medium">Passport Number</span>
                          <span className="text-sm text-gray-900 font-semibold">{p.passportNumber || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-gray-600 font-medium">Nationality</span>
                          <span className="text-sm text-gray-900 font-semibold">{p.nationality || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <ManageAlternateInfoDialog 
        isOpen={showAltInfoDialog}
        onClose={() => setShowAltInfoDialog(false)}
        booking={booking}
        onSuccess={() => {
          setShowAltInfoDialog(false);
          load();
        }}
      />
    </div>
  );
}
