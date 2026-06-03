'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUser, hasRole } from '@/lib/auth';
import { voucherAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Plane, Users, Building, MapPin, Mail, ArrowLeft, Clock, Route, Ticket, Truck, Plus, X } from 'lucide-react';
import { TimePicker } from '@/components/ui/time-picker';

export default function EditVoucherPage() {
  const router = useRouter();
  const params = useParams();
  const voucherId = (params?.id as string) || '';
  const user = getUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voucher, setVoucher] = useState<any>(null);

  // Form state
  const [guestName, setGuestName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [paxCount, setPaxCount] = useState(0);
  const [reservationDate, setReservationDate] = useState('');
  const [hotelSchedules, setHotelSchedules] = useState<any[]>([]);
  const [movementDetails, setMovementDetails] = useState<any[]>([]);
  const [flightDetails, setFlightDetails] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
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
      const v = response.data.voucher;
      setVoucher(v);

      // Set form state
      setGuestName(v.guestName || '');
      setGuestMobile(v.guestMobile || '');
      setGroupCode(v.groupCode || '');
      setPaxCount(v.paxCount || 0);
      setReservationDate(v.reservationDate ? new Date(v.reservationDate).toISOString().split('T')[0] : '');
      setHotelSchedules(Array.isArray(v.hotelSchedules) ? v.hotelSchedules : []);
      setMovementDetails(Array.isArray(v.movementDetails) ? v.movementDetails : []);
      setFlightDetails(Array.isArray(v.flightDetails) ? v.flightDetails : []);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to load voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await voucherAPI.updateVoucher(voucherId, {
        guestName,
        guestMobile,
        groupCode,
        paxCount,
        reservationDate,
        hotelSchedules,
        movementDetails,
        flightDetails,
      });
      toast.success('Voucher updated successfully');
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
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

  const calculateDays = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Hotel schedule handlers
  const updateHotelSchedule = (index: number, field: string, value: any) => {
    const updated = [...hotelSchedules];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'checkIn' || field === 'checkOut') {
      updated[index].days = calculateDays(updated[index].checkIn, updated[index].checkOut);
    }
    setHotelSchedules(updated);
  };

  const addHotelSchedule = () => {
    setHotelSchedules([...hotelSchedules, {
      number: hotelSchedules.length + 1,
      location: '',
      hotelName: '',
      checkIn: '',
      checkOut: '',
      days: 0,
      brn: null,
    }]);
  };

  const removeHotelSchedule = (index: number) => {
    setHotelSchedules(hotelSchedules.filter((_, i) => i !== index));
  };

  // Movement detail handlers
  const updateMovement = (index: number, field: string, value: any) => {
    const updated = [...movementDetails];
    updated[index] = { ...updated[index], [field]: value };
    setMovementDetails(updated);
  };

  const addMovement = () => {
    setMovementDetails([...movementDetails, {
      sr: movementDetails.length + 1,
      route: '',
      date: '',
      time: '',
      from: '',
      fromLocation: '',
      to: '',
      toLocation: '',
      driverDetails1: '',
      driverDetails2: '',
      vehicleNumber: '',
    }]);
  };

  const removeMovement = (index: number) => {
    const updated = movementDetails.filter((_, i) => i !== index);
    updated.forEach((m, idx) => { m.sr = idx + 1; });
    setMovementDetails(updated);
  };

  // Flight detail handlers
  const updateFlight = (index: number, field: string, value: any) => {
    const updated = [...flightDetails];
    updated[index] = { ...updated[index], [field]: value };
    setFlightDetails(updated);
  };

  const addFlight = () => {
    setFlightDetails([...flightDetails, {
      type: 'AA',
      carrier: '',
      number: '',
      date: '',
      from: '',
      to: '',
      etd: '',
      eta: '',
    }]);
  };

  const removeFlight = (index: number) => {
    setFlightDetails(flightDetails.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50">
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="leading-tight">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Edit Voucher</h1>
                <p className="text-sm text-gray-500">Voucher Number: {voucher?.voucherNumber || 'N/A'}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
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
              {/* Summary Card */}
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
                      <Input
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Guest Name"
                        className="font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Group Code</p>
                      <Input
                        value={groupCode}
                        onChange={(e) => setGroupCode(e.target.value)}
                        placeholder="Group Code"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Passengers</p>
                      <Input
                        type="number"
                        value={paxCount}
                        onChange={(e) => setPaxCount(parseInt(e.target.value) || 0)}
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Guest Mobile</p>
                      <Input
                        value={guestMobile}
                        onChange={(e) => setGuestMobile(e.target.value)}
                        placeholder="Guest Mobile"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Reservation Date</p>
                      <Input
                        type="date"
                        value={reservationDate}
                        onChange={(e) => setReservationDate(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Party Information (Read-only) */}
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
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Hotel Schedules */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-5 w-5 text-purple-600" /> Hotel Schedules ({hotelSchedules.length})
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={addHotelSchedule}>
                      <Plus className="h-4 w-4 mr-1" /> Add Hotel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {hotelSchedules.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Building className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No hotel schedules found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {hotelSchedules.map((hotel, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-purple-600">{hotel.number || index + 1}</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-700">Hotel {index + 1}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeHotelSchedule(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">City</label>
                              <Input
                                value={hotel.location || ''}
                                onChange={(e) => updateHotelSchedule(index, 'location', e.target.value)}
                                placeholder="City"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Hotel</label>
                              <Input
                                value={hotel.hotelName || ''}
                                onChange={(e) => updateHotelSchedule(index, 'hotelName', e.target.value)}
                                placeholder="Hotel"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Check-In</label>
                              <Input
                                type="date"
                                value={hotel.checkIn || ''}
                                onChange={(e) => updateHotelSchedule(index, 'checkIn', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Check-Out</label>
                              <Input
                                type="date"
                                value={hotel.checkOut || ''}
                                onChange={(e) => updateHotelSchedule(index, 'checkOut', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Days</label>
                              <Input
                                type="number"
                                value={hotel.days || 0}
                                readOnly
                                className="bg-gray-50"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Movement Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Route className="h-5 w-5 text-blue-600" /> Movement Details ({movementDetails.length})
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={addMovement}>
                      <Plus className="h-4 w-4 mr-1" /> Add Movement
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {movementDetails.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Route className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No movement details found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {movementDetails.map((movement, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-600">{movement.sr || movement.route || `#${index + 1}`}</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-700">Route {movement.sr || index + 1}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMovement(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Route Number</label>
                              <Input
                                value={movement.route || ''}
                                onChange={(e) => updateMovement(index, 'route', e.target.value)}
                                placeholder="Route Number"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Date</label>
                              <Input
                                type="date"
                                value={movement.date || ''}
                                onChange={(e) => updateMovement(index, 'date', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Time</label>
                              <TimePicker
                                value={movement.time || ''}
                                onChange={(val) => updateMovement(index, 'time', val)}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">From City</label>
                              <Input
                                value={movement.from || ''}
                                onChange={(e) => updateMovement(index, 'from', e.target.value)}
                                placeholder="From City"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">From Location</label>
                              <Input
                                value={movement.fromLocation || ''}
                                onChange={(e) => updateMovement(index, 'fromLocation', e.target.value)}
                                placeholder="From Location"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">To City</label>
                              <Input
                                value={movement.to || ''}
                                onChange={(e) => updateMovement(index, 'to', e.target.value)}
                                placeholder="To City"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">To Location</label>
                              <Input
                                value={movement.toLocation || ''}
                                onChange={(e) => updateMovement(index, 'toLocation', e.target.value)}
                                placeholder="To Location"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Driver Details 1</label>
                              <Input
                                value={movement.driverDetails1 || ''}
                                onChange={(e) => updateMovement(index, 'driverDetails1', e.target.value)}
                                placeholder="Driver Details 1"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Driver Details 2</label>
                              <Input
                                value={movement.driverDetails2 || ''}
                                onChange={(e) => updateMovement(index, 'driverDetails2', e.target.value)}
                                placeholder="Driver Details 2"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Vehicle Number</label>
                              <Input
                                value={movement.vehicleNumber || ''}
                                onChange={(e) => updateMovement(index, 'vehicleNumber', e.target.value)}
                                placeholder="Vehicle Number"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Flight Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plane className="h-5 w-5 text-sky-600" /> Flight Details ({flightDetails.length})
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={addFlight}>
                      <Plus className="h-4 w-4 mr-1" /> Add Flight
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {flightDetails.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Plane className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No flight details found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {flightDetails.map((flight, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                flight.type === 'AA' ? 'bg-green-100' : 'bg-orange-100'
                              }`}>
                                <Plane className={`h-4 w-4 ${
                                  flight.type === 'AA' ? 'text-green-600' : 'text-orange-600'
                                }`} />
                              </div>
                              <p className="text-sm font-semibold text-gray-700">
                                {flight.type === 'AA' ? 'Arrival' : 'Departure'} Flight
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFlight(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Type</label>
                              <select
                                value={flight.type || 'AA'}
                                onChange={(e) => updateFlight(index, 'type', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              >
                                <option value="AA">Arrival (AA)</option>
                                <option value="AD">Departure (AD)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Carrier</label>
                              <Input
                                value={flight.carrier || ''}
                                onChange={(e) => updateFlight(index, 'carrier', e.target.value)}
                                placeholder="Carrier"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Flight Number</label>
                              <Input
                                value={flight.number || ''}
                                onChange={(e) => updateFlight(index, 'number', e.target.value)}
                                placeholder="Flight Number"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Date</label>
                              <Input
                                type="date"
                                value={flight.date || ''}
                                onChange={(e) => updateFlight(index, 'date', e.target.value)}
                              />
                            </div>
                            {flight.type === 'AA' && (
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">Arrival Airport</label>
                                <Input
                                  value={flight.from || ''}
                                  onChange={(e) => updateFlight(index, 'from', e.target.value)}
                                  placeholder="Arrival Airport"
                                />
                              </div>
                            )}
                            {flight.type === 'AD' && (
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">Departure Airport</label>
                                <Input
                                  value={flight.to || ''}
                                  onChange={(e) => updateFlight(index, 'to', e.target.value)}
                                  placeholder="Departure Airport"
                                />
                              </div>
                            )}
                            {flight.type === 'AD' && (
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">ETD</label>
                                <TimePicker
                                  value={flight.etd || ''}
                                  onChange={(val) => updateFlight(index, 'etd', val)}
                                />
                              </div>
                            )}
                            {flight.type === 'AA' && (
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">ETA</label>
                                <TimePicker
                                  value={flight.eta || ''}
                                  onChange={(val) => updateFlight(index, 'eta', val)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Voucher Metadata (Read-only) */}
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

