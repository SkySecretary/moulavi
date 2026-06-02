'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { Calendar, Plane, Users, Building, MapPin, Mail, Clock, DollarSign, Route, Truck, Phone, MessageCircle, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

export default function ViewUmrahVisaBookingPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = (params?.id as string) || '';
  const user = getUser();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [downloadingVoucher, setDownloadingVoucher] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    if (!user || !hasRole('party')) {
      router.push('/');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handleDownloadAllDocuments = async () => {
    if (!bookingId || downloadingAll) return;
    try {
      setDownloadingAll(true);
      toast.info('Preparing all documents ZIP...');
      
      const response = await api.get(`/umrah-visa/${bookingId}/download-all-documents`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `booking-documents-${bookingId}.zip`;
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
      
      toast.success('All documents downloaded successfully!');
    } catch (error: any) {
      console.error('Bulk download error:', error);
      toast.error('Failed to download documents ZIP');
    } finally {
      setDownloadingAll(false);
    }
  };

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
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateTime?: string | Date) => {
    if (!dateTime) return { date: 'N/A', time: 'N/A' };
    try {
      const dt = new Date(dateTime);
      return {
        date: dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        time: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
    } catch {
      return { date: 'N/A', time: 'N/A' };
    }
  };

  // Helper to format transport route from cities
  const formatTransportRoute = (route: any) => {
    if (!route) return 'N/A';
    const cities = [
      route.city1?.name,
      route.city2?.name,
      route.city3?.name,
      route.city4?.name,
    ].filter(Boolean);
    return cities.length > 0 ? cities.join(' → ') : 'N/A';
  };

  const getStatusBadgeColor = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
      documents_downloaded: 'bg-blue-50 text-blue-700 border-blue-100',
      group_assigned: 'bg-secondary/10 text-secondary border-secondary/20',
      voucher: 'bg-primary/10 text-secondary border-primary/20',
      bill: 'bg-gray-50 text-gray-700 border-gray-200',
      booking_success: 'bg-green-50 text-green-700 border-green-100',
      cancelled: 'bg-destructive/5 text-destructive border-destructive/20',
    };
    return statusColors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const downloadVoucherPDF = async () => {
    if (!bookingId) {
      toast.error('Booking ID not found');
      return;
    }

    try {
      setDownloadingVoucher(true);
      
      // Fetch voucher by booking ID (party-specific endpoint)
      const voucherResponse = await api.get(`/umrah-visa/${bookingId}/voucher`);
      const fullVoucher = voucherResponse.data.voucher;

      // Format data for PDF generation
      const pdfData = {
        voucherNumber: fullVoucher.voucherNumber,
        reservationNumber: fullVoucher.voucherNumber,
        reservationDate: fullVoucher.reservationDate ? (typeof fullVoucher.reservationDate === 'string' 
          ? fullVoucher.reservationDate.split('T')[0] 
          : new Date(fullVoucher.reservationDate).toISOString().split('T')[0]) : '',
        guestName: fullVoucher.guestName || '',
        guestMobile: fullVoucher.guestMobile || '',
        groupCode: fullVoucher.groupCode || '',
        paxCount: fullVoucher.paxCount || 0,
        umrahVisaProvider: fullVoucher.booking?.party ? {
          partyName: fullVoucher.booking.party.partyName || '',
          address: fullVoucher.booking.party.address || '',
          city: fullVoucher.booking.party.city || '',
          state: fullVoucher.booking.party.state || '',
          country: fullVoucher.booking.party.country || '',
          contactNumber: fullVoucher.booking.party.contactNumber || '',
          whatsappNumber: fullVoucher.booking.party.whatsappNumber || '',
          email: fullVoucher.booking.party.email || '',
        } : null,
        hotelSchedules: (fullVoucher.hotelSchedules || []).map((hs: any) => ({
          number: hs.number || 0,
          location: hs.location || '',
          hotelName: hs.hotelName || '',
          checkIn: hs.checkIn ? (typeof hs.checkIn === 'string' 
            ? hs.checkIn.split('T')[0] 
            : new Date(hs.checkIn).toISOString().split('T')[0]) : '',
          checkOut: hs.checkOut ? (typeof hs.checkOut === 'string' 
            ? hs.checkOut.split('T')[0] 
            : new Date(hs.checkOut).toISOString().split('T')[0]) : '',
          days: hs.days || 0,
          brn: hs.brn || null,
        })),
        movementDetails: (fullVoucher.movementDetails || []).map((md: any) => ({
          sr: md.sr || 0,
          route: md.route || '',
          date: md.date ? (typeof md.date === 'string' 
            ? md.date.split('T')[0] 
            : new Date(md.date).toISOString().split('T')[0]) : '',
          time: md.time || '',
          from: md.from || '',
          fromLocation: md.fromLocation || '',
          to: md.to || '',
          toLocation: md.toLocation || '',
        })),
        flightDetails: (fullVoucher.flightDetails || []).map((fd: any) => ({
          type: fd.type || 'AA',
          carrier: fd.carrier || '',
          number: fd.number || '',
          date: fd.date ? (typeof fd.date === 'string' 
            ? fd.date.split('T')[0] 
            : new Date(fd.date).toISOString().split('T')[0]) : '',
          arrivalAirport: fd.type === 'AA' ? (fd.from || '') : undefined,
          departureAirport: fd.type === 'AD' ? (fd.to || '') : undefined,
          from: fd.from || '',
          to: fd.to || '',
          etd: fd.etd || '',
          eta: fd.eta || '',
        })),
      };

      // Call backend to generate PDF
      const pdfResponse = await api.post('/umrah-visa/generate-pdf', pdfData, {
        responseType: 'blob',
      });

      // Create blob and download
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Voucher_${pdfData.voucherNumber}_${pdfData.guestName
        .replace(/\s+/g, '_')
        .slice(0, 20)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Voucher PDF downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading voucher PDF:', error);
      toast.error(error?.response?.data?.error || 'Failed to download voucher PDF');
    } finally {
      setDownloadingVoucher(false);
    }
  };

  return (
    <PartyLayout 
      title={booking?.groupName || 'Booking Details'} 
      subtitle={`ID: ${booking?.groupNumber || 'Not Assigned'}`}
    >
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 lg:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Loading booking details...</p>
            </div>
          ) : !booking ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Building className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">No booking details available</p>
              <p className="text-sm text-gray-500">Please check the booking ID and try again.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Booking Summary Card with Green Accent */}
              <Card className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-white border-b border-primary/10">
                  <CardTitle className="text-xl flex items-center gap-2 text-primary">
                    <Building className="h-6 w-6" /> Booking Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4">
                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Group Name</p>
                      <p className="text-xl font-bold text-primary">{booking.groupName || 'N/A'}</p>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Group Number</p>
                      <p className="text-xl font-bold text-primary">{booking.groupNumber || '—'}</p>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Passengers</p>
                      <p className="text-xl font-bold text-primary">{booking.passengerCount || 0}</p>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Status</p>
                      <Badge className={`text-sm font-semibold px-3 py-1 border ${getStatusBadgeColor(booking.status)}`}>
                        {booking.status?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                  {booking.status === 'bill' && booking.hasTransportation && (
                    <div className="mt-4 pt-4 border-t border-primary/20 flex flex-wrap gap-3">
                      <Button
                        onClick={downloadVoucherPDF}
                        disabled={downloadingVoucher}
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        {downloadingVoucher ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Download Voucher
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={handleDownloadAllDocuments}
                        disabled={downloadingAll}
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/5"
                      >
                        {downloadingAll ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Preparing ZIP...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Download All Documents
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {booking.status !== 'bill' && (
                    <div className="mt-4 pt-4 border-t border-primary/20">
                      <Button
                        onClick={handleDownloadAllDocuments}
                        disabled={downloadingAll}
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/5"
                      >
                        {downloadingAll ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Preparing ZIP...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Download All Documents
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Party Contact Information */}
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-white border-b border-primary/10">
                  <CardTitle className="text-xl flex items-center gap-2 text-primary">
                    <Mail className="h-6 w-6" /> Party Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-primary" />
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</p>
                      </div>
                      <p className="text-sm text-gray-900 break-all font-medium">{booking.party?.email || 'N/A'}</p>
                    </div>
                    {booking.party?.contactNumber && (
                      <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="h-4 w-4 text-primary" />
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Contact</p>
                        </div>
                        <p className="text-sm text-gray-900 font-medium">{booking.party.contactNumber}</p>
                      </div>
                    )}
                    {booking.party?.whatsappNumber && (
                      <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="h-4 w-4 text-primary" />
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">WhatsApp</p>
                        </div>
                        <p className="text-sm text-gray-900 font-medium">{booking.party.whatsappNumber}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Flight Details */}
              {booking.travelDetails && booking.travelDetails.length > 0 && (
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-white border-b border-primary/10">
                    <CardTitle className="text-xl flex items-center gap-2 text-primary">
                      <Plane className="h-6 w-6" /> Flight Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                      {(() => {
                        const mainTravel = booking.travelDetails.find((t: any) => !t.isAlternate);
                        if (!mainTravel) return <p className="p-6 text-gray-500 italic">No main travel details available</p>;
                        
                        const arrival = formatDateTime(mainTravel.arrivalDateTime);
                        const departure = formatDateTime(mainTravel.departureDateTime);
                        
                        return (
                          <>
                            {/* Arrival */}
                            <div className="border-l-4 border-l-primary bg-primary/5 rounded-r-lg p-6">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                                  <Plane className="h-5 w-5 text-white rotate-[-45deg]" />
                                </div>
                                <p className="text-sm font-bold text-primary uppercase tracking-wide">Arrival</p>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide">Date</p>
                                    <p className="text-lg font-bold text-gray-900">{arrival.date}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Clock className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide">Time</p>
                                    <p className="text-lg font-bold text-gray-900">{arrival.time}</p>
                                  </div>
                                </div>
                                <div className="pt-3 border-t border-primary/20 space-y-2">
                                  <div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Airport</p>
                                    <p className="text-sm font-semibold text-gray-900">{mainTravel.arrivalAirport?.name || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Flight Number</p>
                                    <p className="text-sm font-semibold text-primary">{mainTravel.arrivalFlightNumber || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Departure */}
                            <div className="border-l-4 border-l-secondary bg-secondary/10 rounded-r-lg p-6">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                                  <Plane className="h-5 w-5 text-white rotate-[45deg]" />
                                </div>
                                <p className="text-sm font-bold text-secondary uppercase tracking-wide">Departure</p>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-5 w-5 text-secondary" />
                                  <div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide">Date</p>
                                    <p className="text-lg font-bold text-gray-900">{departure.date}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Clock className="h-5 w-5 text-secondary" />
                                  <div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide">Time</p>
                                    <p className="text-lg font-bold text-gray-900">{departure.time}</p>
                                  </div>
                                </div>
                                <div className="pt-3 border-t border-secondary/20 space-y-2">
                                  <div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Airport</p>
                                    <p className="text-sm font-semibold text-gray-900">{mainTravel.departureAirport?.name || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Flight Number</p>
                                    <p className="text-sm font-semibold text-secondary">{mainTravel.departureFlightNumber || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Accommodation Section */}
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-white border-b border-primary/10">
                  <CardTitle className="text-xl flex items-center gap-2 text-primary">
                    <Building className="h-6 w-6" /> Accommodation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Accommodation Type Badge */}
                  <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                      <Building className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Accommodation Type</p>
                      <Badge className="bg-primary text-white text-sm font-semibold px-3 py-1">
                        {booking.accommodationType?.toUpperCase() || 'N/A'}
                      </Badge>
                    </div>
                  </div>

                  {/* Hotel Details */}
                  {(() => {
                    const accType = booking.accommodationType;
                    const hotelBookings = booking.hotelBookings;
                    
                    const isHotel = accType && (accType.toLowerCase() === 'hotel');
                    
                    if (!isHotel) {
                      return null;
                    }
                    
                    const hasHotelBookings = Array.isArray(hotelBookings) && hotelBookings.length > 0;
                    
                    if (!hasHotelBookings) {
                      return (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                          <Building className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-600">No hotel bookings found</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="overflow-x-auto -mx-4 lg:mx-0">
                        <div className="min-w-full inline-block align-middle">
                          <div className="overflow-hidden border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-primary">
                                <tr>
                                  <th className="py-3 px-3 lg:px-4 text-left text-xs font-bold uppercase tracking-wide text-white">City</th>
                                  <th className="py-3 px-3 lg:px-4 text-left text-xs font-bold uppercase tracking-wide text-white">Hotel Name</th>
                                  <th className="py-3 px-3 lg:px-4 text-left text-xs font-bold uppercase tracking-wide text-white">Check-In</th>
                                  <th className="py-3 px-3 lg:px-4 text-left text-xs font-bold uppercase tracking-wide text-white">Check-Out</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {hotelBookings.map((h: any, idx: number) => {
                                  const cityName = h.city?.name || h.city?.destinationName || 'N/A';
                                  const hotelName = h.hotel?.name || h.hotel?.hotelName || 'N/A';
                                  const checkIn = h.checkInDate || h.checkIn;
                                  const checkOut = h.checkOutDate || h.checkOut;
                                  
                                  return (
                                    <tr 
                                      key={h.id} 
                                      className={`transition-colors ${
                                        idx % 2 === 0 ? 'bg-white' : 'bg-primary/5'
                                      } hover:bg-primary/10`}
                                    >
                                      <td className="py-3 px-3 lg:px-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                                          <span className="text-xs lg:text-sm font-semibold text-gray-900">{cityName}</span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-3 lg:px-4">
                                        <div className="flex items-center gap-2">
                                          <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                          <span className="text-xs lg:text-sm text-gray-700">{hotelName}</span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-3 lg:px-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                                          <span className="text-xs lg:text-sm text-gray-700 font-medium">{formatDate(checkIn)}</span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-3 lg:px-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                                          <span className="text-xs lg:text-sm text-gray-700 font-medium">{formatDate(checkOut)}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Iqama Details */}
                  {booking.accommodationType === 'iqama' && (
                    <>
                      {booking.sponsorIqamaDetails ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Iqama Number</p>
                            <p className="text-base font-bold text-primary">{booking.sponsorIqamaDetails.iqamaNumber || 'N/A'}</p>
                          </div>
                          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Holder Name</p>
                            <p className="text-base font-bold text-gray-900">{booking.sponsorIqamaDetails.iqamaSponserName || 'N/A'}</p>
                          </div>
                          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Date of Birth</p>
                            <p className="text-base font-bold text-gray-900">{formatDate(booking.sponsorIqamaDetails.sponserDob)}</p>
                          </div>
                          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Mobile Number</p>
                            <p className="text-base font-bold text-gray-900">{booking.sponsorIqamaDetails.sponserMobileNumber || 'N/A'}</p>
                          </div>
                          {booking.sponsorIqamaDetails.sponserNationalShortAddress && (
                            <div className="sm:col-span-2 bg-primary/5 rounded-lg p-4 border border-primary/10">
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">National Short Address</p>
                              <p className="text-base font-semibold text-gray-900">{booking.sponsorIqamaDetails.sponserNationalShortAddress}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                          <Building className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-600">No iqama details found</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Movement Details & Ziyaraths */}
              {Array.isArray(booking.movementDetails) && booking.movementDetails.length > 0 && (() => {
                const regularMovements = booking.movementDetails.filter((m: any) => m.toLocation?.locationType !== 'ZIYARAT');
                const ziyaraths = booking.movementDetails.filter((m: any) => m.toLocation?.locationType === 'ZIYARAT');
                
                return (
                  <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-white border-b border-primary/10">
                      <CardTitle className="text-xl flex items-center gap-2 text-primary">
                        <Route className="h-6 w-6" /> 
                        Movement Details & Ziyaraths
                        <Badge className="ml-2 bg-primary text-white">{booking.movementDetails.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {/* Regular Movement Details */}
                      {regularMovements.length > 0 && (
                        <div className="mb-8">
                          <h4 className="text-sm font-bold text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
                            <Truck className="h-4 w-4" /> Transport Movements ({regularMovements.length})
                          </h4>
                          <div className="space-y-4">
                            {regularMovements.map((movement: any, index: number) => {
                              const travelDateTime = formatDateTime(movement.travelDateTime);
                              return (
                                <div key={movement.id} className="border-l-4 border-l-primary bg-primary/5 rounded-r-lg p-5 hover:bg-primary/10 transition-all shadow-sm">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-md">
                                        <span className="text-xs font-bold text-white">{movement.routeNumber || `#${index + 1}`}</span>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Route {index + 1}</p>
                                        <p className="text-base font-bold text-gray-900">
                                          {movement.fromCity?.name || 'N/A'} → {movement.toCity?.name || 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-primary/20">
                                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Travel Date & Time</p>
                                      <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-semibold text-gray-900">{travelDateTime.date}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-semibold text-gray-900">{travelDateTime.time}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 pt-4 border-t border-primary/20">
                                    <div className="bg-white rounded-lg p-3 border border-primary/10">
                                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">From</p>
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        <div>
                                          <p className="text-sm font-bold text-gray-900">{movement.fromLocation?.name || 'N/A'}</p>
                                          <p className="text-xs text-gray-600">{movement.fromCity?.name || 'N/A'}</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-primary/10">
                                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">To</p>
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        <div>
                                          <p className="text-sm font-bold text-gray-900">{movement.toLocation?.name || 'N/A'}</p>
                                          <p className="text-xs text-gray-600">{movement.toCity?.name || 'N/A'}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Ziyaraths */}
                      {ziyaraths.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Ziyaraths ({ziyaraths.length})
                          </h4>
                          <div className="space-y-4">
                            {ziyaraths.map((ziyarath: any, index: number) => {
                              const travelDateTime = formatDateTime(ziyarath.travelDateTime);
                              return (
                                <div key={ziyarath.id} className="border-l-4 border-l-secondary bg-gradient-to-r from-primary/5 to-secondary/10 rounded-r-lg p-5 hover:from-primary/10 hover:to-secondary/20 transition-all shadow-sm">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
                                        <span className="text-xs font-bold text-white">Z{index + 1}</span>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Ziyarath {index + 1}</p>
                                        <p className="text-base font-bold text-gray-900">
                                          {ziyarath.fromCity?.name || 'N/A'} → {ziyarath.toLocation?.name || 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-primary/20">
                                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Date & Time</p>
                                      <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-semibold text-gray-900">{travelDateTime.date}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-semibold text-gray-900">{travelDateTime.time}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="pt-4 border-t border-primary/20 bg-white rounded-lg p-3 border border-primary/10">
                                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Ziyarath Location</p>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-primary" />
                                      <div>
                                        <p className="text-sm font-bold text-gray-900">{ziyarath.toLocation?.name || 'N/A'}</p>
                                        <p className="text-xs text-gray-600">{ziyarath.toCity?.name || 'N/A'}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Transportation */}
              {Array.isArray(booking.transportBookings) && booking.transportBookings.length > 0 && (
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-white border-b border-primary/10">
                    <CardTitle className="text-xl flex items-center gap-2 text-primary">
                      <Truck className="h-6 w-6" /> Transportation Vehicles
                      <Badge className="ml-2 bg-primary text-white">{booking.transportBookings.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto -mx-4 lg:mx-0">
                      <div className="min-w-full inline-block align-middle">
                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-primary">
                              <tr>
                                <th className="py-3 px-3 lg:px-4 text-left text-xs font-bold uppercase tracking-wide text-white">Route</th>
                                <th className="py-3 px-3 lg:px-4 text-left text-xs font-bold uppercase tracking-wide text-white">Vehicle Type</th>
                                <th className="py-3 px-3 lg:px-4 text-left text-xs font-bold uppercase tracking-wide text-white">Capacity</th>
                                <th className="py-3 px-3 lg:px-4 text-left text-xs font-bold uppercase tracking-wide text-white">Price</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {booking.transportBookings.map((t: any, idx: number) => {
                                const route = t.transportMaster?.route;
                                const vehicleType = t.transportMaster?.vehicleType;
                                const price = t.transportMaster?.price ? Number(t.transportMaster.price) : null;
                                
                                return (
                                  <tr 
                                    key={t.id} 
                                    className={`transition-colors ${
                                      idx % 2 === 0 ? 'bg-white' : 'bg-primary/5'
                                    } hover:bg-primary/10`}
                                  >
                                    <td className="py-3 px-3 lg:px-4">
                                      <div className="flex items-center gap-2">
                                        <Route className="h-4 w-4 text-primary flex-shrink-0" />
                                        <span className="text-xs lg:text-sm font-semibold text-gray-900">{formatTransportRoute(route)}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 lg:px-4">
                                      <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                        <span className="text-xs lg:text-sm font-medium text-gray-700">{vehicleType?.vehicleName || 'N/A'}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 lg:px-4 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                        <span className="text-xs lg:text-sm text-gray-700">{vehicleType?.paxCount || 'N/A'} PAX</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 lg:px-4 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-primary flex-shrink-0" />
                                        <span className="text-xs lg:text-sm font-bold text-primary">{price ? `₹${price.toLocaleString('en-IN')}` : 'N/A'}</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </PartyLayout>
  );
}
