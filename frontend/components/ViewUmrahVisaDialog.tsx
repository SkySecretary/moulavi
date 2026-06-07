'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { umrahVisaAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
  X,
  User,
  Plane,
  Calendar,
  MapPin,
  Users,
  Building,
  FileText,
  Phone,
  Mail,
  CreditCard,
  Hash,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface ViewUmrahVisaDialogProps {
  bookingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ViewUmrahVisaDialog({ bookingId, open, onOpenChange }: ViewUmrahVisaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (bookingId && open) {
      loadBookingDetails();
    }
  }, [bookingId, open]);

  const loadBookingDetails = async () => {
    if (!bookingId) return;
    
    try {
      setLoading(true);
      const response = await umrahVisaAPI.getBookingById(bookingId);
      // Backend returns the booking object directly
      setBooking(response.data);
    } catch (error: any) {
      console.error('Error loading booking details:', error);
      toast.error(error?.response?.data?.error || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      processing: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      completed: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg sm:text-xl">Umrah Visa Booking Details</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : booking ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Booking Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Booking Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Booking ID / Reference</p>
                  <p className="font-medium text-xs sm:text-sm break-all">
                    {booking.bookingReference ? (
                      <span className="text-primary font-bold">{booking.bookingReference}</span>
                    ) : (
                      booking.id
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(booking.status)}</div>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Group Number</p>
                  <p className="font-medium text-xs sm:text-sm">{booking.groupNumber || 'Not Assigned'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Group Name</p>
                  <p className="font-medium text-xs sm:text-sm">{booking.groupName || 'Not Assigned'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Booking Mode</p>
                  <Badge variant="outline" className="text-xs">
                    {booking.bookingMode === 'group_number' ? 'Group Number' : 'Travel Documents'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Passenger Count</p>
                  <p className="font-medium text-xs sm:text-sm flex items-center">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {booking.passengerCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Created At</p>
                  <p className="font-medium text-xs sm:text-sm">{formatDate(booking.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Updated At</p>
                  <p className="font-medium text-xs sm:text-sm">{formatDate(booking.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Party Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center">
                  <Building className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Party Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Party Name</p>
                  <p className="font-medium text-xs sm:text-sm">{booking.party?.partyName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Email</p>
                  <p className="font-medium text-xs sm:text-sm flex items-center break-all">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                    {booking.party?.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Contact Number</p>
                  <p className="font-medium text-xs sm:text-sm flex items-center">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {booking.party?.contactNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">WhatsApp Number</p>
                  <p className="font-medium text-xs sm:text-sm flex items-center">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {booking.party?.whatsappNumber || 'N/A'}
                  </p>
                </div>
                {booking.party?.gstNumber && (
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">GST Number</p>
                    <p className="font-medium text-xs sm:text-sm">{booking.party.gstNumber}</p>
                  </div>
                )}
                {booking.party?.address && (
                  <div className="col-span-1 sm:col-span-2">
                    <p className="text-xs sm:text-sm text-gray-500">Address</p>
                    <p className="font-medium text-xs sm:text-sm">{booking.party.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flight & Travel Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center">
                  <Plane className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Flight & Travel Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Flight Number</p>
                  <p className="font-medium text-xs sm:text-sm">{booking.flightNumber}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Arrival Airport</p>
                  <p className="font-medium text-xs sm:text-sm">{booking.arrivalAirport}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Arrival Date</p>
                  <p className="font-medium text-xs sm:text-sm flex items-center">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {formatDate(booking.arrivalDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Departure Date</p>
                  <p className="font-medium text-xs sm:text-sm flex items-center">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {formatDate(booking.departureDate)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Transport Information */}
            {(booking.transportRoute || booking.transportType) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Transport Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {booking.transportRoute && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Transport Route</p>
                      <p className="font-medium text-xs sm:text-sm">{booking.transportRoute}</p>
                    </div>
                  )}
                  {booking.transportType && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Transport Type</p>
                      <p className="font-medium text-xs sm:text-sm">{booking.transportType}</p>
                    </div>
                  )}
                  {booking.transportPax && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Transport Passengers</p>
                      <p className="font-medium text-xs sm:text-sm">{booking.transportPax}</p>
                    </div>
                  )}
                  {booking.transportPrice && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Transport Price</p>
                      <p className="font-medium text-xs sm:text-sm">SAR {Number(booking.transportPrice).toFixed(2)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Accommodation Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center">
                  <Building className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Accommodation Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Accommodation Type</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {booking.accommodationType === 'hotel' ? 'Hotel' : 'Iqama'}
                  </Badge>
                </div>

                {booking.accommodationType === 'hotel' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Makkah Check-In</p>
                      <p className="font-medium text-xs sm:text-sm">{formatDate(booking.makkahCheckIn)}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Makkah Check-Out</p>
                      <p className="font-medium text-xs sm:text-sm">{formatDate(booking.makkahCheckOut)}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Madina Check-In</p>
                      <p className="font-medium text-xs sm:text-sm">{formatDate(booking.madinaCheckIn)}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Madina Check-Out</p>
                      <p className="font-medium text-xs sm:text-sm">{formatDate(booking.madinaCheckOut)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Iqama Number</p>
                      <p className="font-medium text-xs sm:text-sm">{booking.iqamaNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Iqama Name</p>
                      <p className="font-medium text-xs sm:text-sm">{booking.iqamaName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Iqama DOB</p>
                      <p className="font-medium text-xs sm:text-sm">{formatDate(booking.iqamaDob)}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Iqama Mobile</p>
                      <p className="font-medium text-xs sm:text-sm">{booking.iqamaMobile || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Passengers Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Passengers ({booking.passengers?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {booking.passengers?.map((passenger: any, index: number) => (
                    <div
                      key={passenger.id}
                      className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm sm:text-base">{passenger.fullName}</h4>
                            {passenger.isLeadPassenger && (
                              <Badge className="bg-indigo-100 text-indigo-800 border-0 text-xs mt-1">
                                Lead Passenger
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {passenger.gender.charAt(0).toUpperCase() + passenger.gender.slice(1)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                        <div>
                          <p className="text-gray-500">Passport Number</p>
                          <p className="font-medium">{passenger.passportNumber}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Nationality</p>
                          <p className="font-medium">{passenger.nationality}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Date of Birth</p>
                          <p className="font-medium">{formatDate(passenger.dateOfBirth)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Passport Expiry</p>
                          <p className="font-medium">{formatDate(passenger.passportExpiry)}</p>
                        </div>
                        {passenger.phoneNumber && (
                          <div>
                            <p className="text-gray-500">Phone Number</p>
                            <p className="font-medium">{passenger.phoneNumber}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No booking details available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

