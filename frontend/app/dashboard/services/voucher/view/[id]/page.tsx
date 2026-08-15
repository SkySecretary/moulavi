'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUser, hasRole } from '@/lib/auth';
import { voucherAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Plane, Users, Building, MapPin, Mail, ArrowLeft, Clock, Route, Ticket, Truck } from 'lucide-react';

export default function ViewVoucherPage() {
  const router = useRouter();
  const params = useParams();
  const voucherId = (params?.id as string) || '';
  const user = getUser();

  const [loading, setLoading] = useState(true);
  const [voucher, setVoucher] = useState<any>(null);

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff', 'party'])) {
      router.push('/');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucherId]);

  const load = async () => {
    try {
      setLoading(true);
      const response = await voucherAPI.getVoucherById(voucherId);
      setVoucher(response.data.voucher);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to load voucher');
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

  const formatTime = (time?: string) => {
    if (!time) return 'N/A';
    return time;
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50">
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="leading-tight">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Voucher {voucher?.voucherNumber || 'Details'}</h1>
                <p className="text-sm text-gray-500">Reservation Number: {voucher?.voucherNumber || 'N/A'}</p>
              </div>
              <div className="flex items-center gap-3">
                {hasRole(['admin', 'staff']) && (
                  <Button 
                    variant="outline" 
                    onClick={() => router.push(`/dashboard/services/voucher/edit/${voucherId}`)}
                  >
                    Edit
                  </Button>
                )}
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-8">
          {loading ? (
            <div className="py-12 text-center">Loading...</div>
          ) : !voucher ? (
            <div className="py-12 text-center text-gray-500">No voucher details available</div>
          ) : (
            <div className="space-y-4 lg:space-y-6">
              {/* Summary Card - Key Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-blue-600" /> Voucher Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Voucher Number</p>
                      <p className="text-lg font-bold text-gray-900">{voucher.voucherNumber || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Guest Name</p>
                      <p className="text-lg font-bold text-gray-900">{voucher.guestName || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Group Code</p>
                      <p className="text-lg font-bold text-gray-900">{voucher.groupCode || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Passengers</p>
                      <p className="text-lg font-bold text-gray-900">{voucher.paxCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Party Information */}
              {voucher.booking?.party && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="h-5 w-5 text-indigo-600" /> Party Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Party Name</p>
                        <p className="text-sm text-gray-900 font-medium">{voucher.booking.party.partyName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Email</p>
                        <p className="text-sm text-gray-900 break-all">{voucher.booking.party.email || 'N/A'}</p>
                      </div>
                      {voucher.booking.party.contactNumber && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Contact</p>
                          <p className="text-sm text-gray-900">{voucher.booking.party.contactNumber}</p>
                        </div>
                      )}
                      {voucher.booking.party.whatsappNumber && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">WhatsApp</p>
                          <p className="text-sm text-gray-900">{voucher.booking.party.whatsappNumber}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Guest Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" /> Guest Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Guest Name</p>
                      <p className="text-sm text-gray-900 font-medium">{voucher.guestName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Guest Mobile</p>
                      <p className="text-sm text-gray-900">{voucher.guestMobile || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Reservation Date</p>
                      <p className="text-sm text-gray-900">{formatDate(voucher.reservationDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hotel Schedules */}
              {voucher.hotelSchedules && Array.isArray(voucher.hotelSchedules) && voucher.hotelSchedules.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-5 w-5 text-purple-600" /> Hotel Schedules ({voucher.hotelSchedules.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                            <th className="py-3 px-4">#</th>
                            <th className="py-3 px-4">City</th>
                            <th className="py-3 px-4">Hotel</th>
                            <th className="py-3 px-4">Check-In</th>
                            <th className="py-3 px-4">Check-Out</th>
                            <th className="py-3 px-4">Days</th>
                            {voucher.hotelSchedules.some((h: any) => h.brn) && (
                              <th className="py-3 px-4">BRN</th>
                            )}
                            {voucher.hotelSchedules.some((h: any) => h.cateringBrn) && (
                              <th className="py-3 px-4">Catering BRN</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {voucher.hotelSchedules.map((hotel: any, index: number) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">{hotel.number || index + 1}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-purple-600" />
                                  <span>{hotel.location || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 text-gray-400" />
                                  <span>{hotel.hotelName || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-gray-400" />
                                  <span>{formatDate(hotel.checkIn)}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-gray-400" />
                                  <span>{formatDate(hotel.checkOut)}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">{hotel.days || 'N/A'}</td>
                              {voucher.hotelSchedules.some((h: any) => h.brn) && (
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {Array.isArray(hotel.brn) ? hotel.brn.join(', ') : (hotel.brn || 'N/A')}
                                </td>
                              )}
                              {voucher.hotelSchedules.some((h: any) => h.cateringBrn) && (
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {Array.isArray(hotel.cateringBrn) ? hotel.cateringBrn.join(', ') : (hotel.cateringBrn || 'N/A')}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Movement Details */}
              {voucher.movementDetails && Array.isArray(voucher.movementDetails) && voucher.movementDetails.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Route className="h-5 w-5 text-blue-600" /> Movement Details ({voucher.movementDetails.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {voucher.movementDetails.map((movement: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-600">{movement.route || movement.sr || `#${index + 1}`}</span>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Route {movement.sr || index + 1}</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {movement.from || 'N/A'} → {movement.to || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Date & Time</div>
                              <div className="text-sm text-gray-900">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-gray-400" />
                                  <span>{formatDate(movement.date)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  <span>{formatTime(movement.time)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">From</p>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-900">
                                  <MapPin className="h-3 w-3 inline mr-1 text-blue-600" />
                                  {movement.fromLocation || 'N/A'}
                                </p>
                                <p className="text-xs text-gray-600 ml-4">{movement.from || 'N/A'}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">To</p>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-900">
                                  <MapPin className="h-3 w-3 inline mr-1 text-green-600" />
                                  {movement.toLocation || 'N/A'}
                                </p>
                                <p className="text-xs text-gray-600 ml-4">{movement.to || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                          {(movement.driverDetails1 || movement.driverDetails2 || movement.vehicleNumber) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-200 mt-3">
                              {movement.driverDetails1 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Driver 1</p>
                                  <p className="text-sm text-gray-900">
                                    <Truck className="h-3 w-3 inline mr-1 text-gray-400" />
                                    {movement.driverDetails1}
                                  </p>
                                </div>
                              )}
                              {movement.driverDetails2 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Driver 2</p>
                                  <p className="text-sm text-gray-900">
                                    <Truck className="h-3 w-3 inline mr-1 text-gray-400" />
                                    {movement.driverDetails2}
                                  </p>
                                </div>
                              )}
                              {movement.vehicleNumber && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Vehicle Number</p>
                                  <p className="text-sm text-gray-900 font-medium">{movement.vehicleNumber}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Flight Details */}
              {voucher.flightDetails && Array.isArray(voucher.flightDetails) && voucher.flightDetails.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plane className="h-5 w-5 text-sky-600" /> Flight Details ({voucher.flightDetails.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {voucher.flightDetails.map((flight: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                flight.type === 'AA' ? 'bg-green-100' : 'bg-orange-100'
                              }`}>
                                <Plane className={`h-4 w-4 ${
                                  flight.type === 'AA' ? 'text-green-600' : 'text-orange-600'
                                }`} />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  {flight.type === 'AA' ? 'Arrival' : 'Departure'}
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                  {flight.carrier || 'N/A'} {flight.number || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Date</div>
                              <div className="text-sm text-gray-900">{formatDate(flight.date)}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                            {flight.type === 'AA' && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Arrival Airport</p>
                                <p className="text-sm text-gray-900">{flight.from || 'N/A'}</p>
                              </div>
                            )}
                            {flight.type === 'AD' && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Departure Airport</p>
                                <p className="text-sm text-gray-900">{flight.to || 'N/A'}</p>
                              </div>
                            )}
                            {flight.etd && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">ETD</p>
                                <p className="text-sm text-gray-900 flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  {formatTime(flight.etd)}
                                </p>
                              </div>
                            )}
                            {flight.eta && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">ETA</p>
                                <p className="text-sm text-gray-900 flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  {formatTime(flight.eta)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Voucher Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-600" /> Voucher Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Created By</p>
                      <p className="text-sm text-gray-900">{voucher.generatedByUser?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{voucher.generatedByUser?.email || ''}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Created Date</p>
                      <p className="text-sm text-gray-900">{formatDate(voucher.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Version</p>
                      <p className="text-sm text-gray-900">{voucher.version || 1}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

