'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUser, hasRole } from '@/lib/auth';
import { voucherAPI, umrahVisaMasterAPI, cityMasterAPI, locationMasterAPI, transportRouteMasterAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plane, Users, Building, MapPin, Mail, ArrowLeft, Clock, Route, Ticket, Truck, Plus, X, ArrowRight } from 'lucide-react';
import { TimePicker } from '@/components/ui/time-picker';
import { extractDateFromISO } from '@/lib/umrah/validation';

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
  const [airports, setAirports] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [locationMasters, setLocationMasters] = useState<any[]>([]);
  const [transportRoutes, setTransportRoutes] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff', 'party'])) {
      router.push('/');
      return;
    }
    load();
    fetchMasterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucherId]);

  const fetchMasterData = async () => {
    try {
      const [airportsRes, citiesRes, locationsRes, routesRes] = await Promise.all([
        umrahVisaMasterAPI.getAirports(),
        cityMasterAPI.getActive(),
        locationMasterAPI.getActive(),
        transportRouteMasterAPI.getActive()
      ]);
      
      const fetchedAirports = airportsRes.data.locationMasters || airportsRes.data.airports || [];
      const fetchedCities = citiesRes.data.cityMasters || citiesRes.data || [];
      const fetchedLocations = locationsRes.data.locationMasters || locationsRes.data || [];
      const fetchedRoutes = routesRes.data.transportRouteMasters || routesRes.data || [];

      console.log(`[DEBUG] Master Data Loaded: Airports=${fetchedAirports.length}, Cities=${fetchedCities.length}, Locations=${fetchedLocations.length}, Routes=${fetchedRoutes.length}`);

      setAirports(fetchedAirports);
      setCities(fetchedCities);
      setLocationMasters(fetchedLocations);
      setTransportRoutes(fetchedRoutes);
    } catch (err) {
      console.error('Failed to fetch master data:', err);
    }
  };

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
      setReservationDate(v.reservationDate ? extractDateFromISO(v.reservationDate) : '');
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
      if (user?.role === 'party') {
        // For parties, update movements one by one using the dedicated API
        const promises = movementDetails.map((m, index) => 
          voucherAPI.updateMovementDetails(voucherId, index, {
            driverDetails1: m.driverDetails1,
            driverDetails2: m.driverDetails2,
            vehicleNumber: m.vehicleNumber,
          })
        );
        await Promise.all(promises);
        toast.success('Movement details updated');
      } else {
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
      }
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const isAdminOrStaff = hasRole(['admin', 'staff']);

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
                        disabled={!isAdminOrStaff}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Group Code</p>
                      <Input
                        value={groupCode}
                        onChange={(e) => setGroupCode(e.target.value)}
                        placeholder="Group Code"
                        disabled={!isAdminOrStaff}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Passengers</p>
                      <Input
                        type="number"
                        value={paxCount}
                        onChange={(e) => setPaxCount(parseInt(e.target.value) || 0)}
                        min="1"
                        disabled={!isAdminOrStaff}
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
                        disabled={!isAdminOrStaff}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Reservation Date</p>
                      <Input
                        type="date"
                        value={reservationDate}
                        onChange={(e) => setReservationDate(e.target.value)}
                        disabled={!isAdminOrStaff}
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
                    {isAdminOrStaff && (
                      <Button variant="outline" size="sm" onClick={addHotelSchedule}>
                        <Plus className="h-4 w-4 mr-1" /> Add Hotel
                      </Button>
                    )}
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
                            {isAdminOrStaff && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeHotelSchedule(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">City</label>
                              <Select 
                                value={cities.find(c => c.name === hotel.location)?.id || ''} 
                                onValueChange={(val) => {
                                  const city = cities.find(c => c.id === val);
                                  updateHotelSchedule(index, 'location', city?.name || '');
                                }}
                                disabled={!isAdminOrStaff}
                              >
                                <SelectTrigger className="w-full h-10 bg-white border-gray-200">
                                  <SelectValue placeholder="Select city" />
                                </SelectTrigger>
                                <SelectContent>
                                  {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Hotel Name</label>
                              <Select 
                                value={locationMasters.find(l => l.name === hotel.hotelName)?.id || ''} 
                                onValueChange={(val) => {
                                  const loc = locationMasters.find(l => l.id === val);
                                  updateHotelSchedule(index, 'hotelName', loc?.name || '');
                                }}
                                disabled={!isAdminOrStaff}
                              >
                                <SelectTrigger className="w-full h-10 bg-white border-gray-200">
                                  <SelectValue placeholder="Select hotel" />
                                </SelectTrigger>
                                <SelectContent>
                                  {locationMasters
                                    .filter(l => l.locationType === 'HOTEL' && (!hotel.location || l.city === hotel.location || l.cityMaster?.name === hotel.location))
                                    .map(l => (
                                      <SelectItem key={l.id} value={l.id}>{l.name} ({l.city})</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Check-In</label>
                              <Input
                                type="date"
                                value={hotel.checkIn || ''}
                                onChange={(e) => updateHotelSchedule(index, 'checkIn', e.target.value)}
                                disabled={!isAdminOrStaff}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Check-Out</label>
                              <Input
                                type="date"
                                value={hotel.checkOut || ''}
                                onChange={(e) => updateHotelSchedule(index, 'checkOut', e.target.value)}
                                disabled={!isAdminOrStaff}
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
                    {isAdminOrStaff && (
                      <Button variant="outline" size="sm" onClick={addMovement}>
                        <Plus className="h-4 w-4 mr-1" /> Add Movement
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {movementDetails.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg m-6">
                      <Route className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No movement details found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-y border-gray-200">
                            <th className="p-3 text-left text-[10px] font-black uppercase text-slate-500 w-10">#</th>
                            <th className="p-3 text-left text-[10px] font-black uppercase text-slate-500 w-[130px]">Date</th>
                            <th className="p-3 text-left text-[10px] font-black uppercase text-slate-500 w-[100px]">Time (24h)</th>
                            <th className="p-3 text-left text-[10px] font-black uppercase text-slate-500 min-w-[200px]">From</th>
                            <th className="p-3 text-left text-[10px] font-black uppercase text-slate-500 min-w-[200px]">To</th>
                            <th className="p-3 text-left text-[10px] font-black uppercase text-slate-500 min-w-[250px] bg-primary/5">Driver / Vehicle</th>
                            <th className="p-3 text-center text-[10px] font-black uppercase text-slate-500 w-16">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {movementDetails.map((movement, index) => (
                            <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="p-3 text-center bg-gray-50/30">
                                <span className="text-[10px] font-black text-slate-400">{index + 1}</span>
                              </td>
                              <td className="p-2">
                                <Input
                                  type="date"
                                  value={movement.date || ''}
                                  onChange={(e) => updateMovement(index, 'date', e.target.value)}
                                  className="h-8 text-[10px] font-bold border-gray-200 bg-white"
                                  disabled={!isAdminOrStaff}
                                />
                              </td>
                              <td className="p-2">
                                <TimePicker
                                  value={movement.time || ''}
                                  onChange={(val) => updateMovement(index, 'time', val)}
                                  className="h-8 text-[10px] font-bold border-gray-200 bg-white"
                                  disabled={!isAdminOrStaff}
                                />
                              </td>
                              <td className="p-2">
                                <Select 
                                  value={movement.fromLocationId || ''} 
                                  onValueChange={(val) => {
                                    const loc = locationMasters.find(l => l.id === val);
                                    updateMovement(index, 'fromLocationId', loc?.id);
                                    updateMovement(index, 'fromLocation', loc?.name || '');
                                    updateMovement(index, 'from', loc?.city || '');
                                  }}
                                  disabled={!isAdminOrStaff}
                                >
                                  <SelectTrigger className="h-8 text-[10px] font-bold border-gray-200 bg-white">
                                    <SelectValue placeholder="Select Origin" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {locationMasters.map(l => (
                                      <SelectItem key={l.id} value={l.id} className="text-[10px]">
                                        {l.name} ({l.city})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-2">
                                <Select 
                                  value={movement.toLocationId || ''} 
                                  onValueChange={(val) => {
                                    const loc = locationMasters.find(l => l.id === val);
                                    updateMovement(index, 'toLocationId', loc?.id);
                                    updateMovement(index, 'toLocation', loc?.name || '');
                                    updateMovement(index, 'to', loc?.city || '');
                                  }}
                                  disabled={!isAdminOrStaff}
                                >
                                  <SelectTrigger className="h-8 text-[10px] font-bold border-gray-200 bg-white">
                                    <SelectValue placeholder="Select Destination" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {locationMasters.map(l => (
                                      <SelectItem key={l.id} value={l.id} className="text-[10px]">
                                        {l.name} ({l.city})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-2 bg-primary/5">
                                <div className="space-y-1.5">
                                  <div className="flex gap-2">
                                    <Input
                                      value={movement.driverDetails1 || ''}
                                      onChange={(e) => updateMovement(index, 'driverDetails1', e.target.value)}
                                      placeholder="Primary Driver"
                                      className="h-7 text-[10px] font-bold border-primary/20 bg-white"
                                    />
                                    <Input
                                      value={movement.vehicleNumber || ''}
                                      onChange={(e) => updateMovement(index, 'vehicleNumber', e.target.value)}
                                      placeholder="Vehicle Plate #"
                                      className="h-7 text-[10px] font-black uppercase border-primary/20 bg-white"
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                {isAdminOrStaff && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeMovement(index)}
                                    className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-destructive/5 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Flight Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plane className="h-5 w-5 text-sky-600" /> Flight Details
                    </CardTitle>
                    {isAdminOrStaff && (
                      <Button variant="outline" size="sm" onClick={addFlight}>
                        <Plus className="h-4 w-4 mr-1" /> Add Flight
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {flightDetails.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Plane className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No flight details found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Separate into Arrival and Departure groups for consistent design */}
                      {[ { type: 'AA', title: 'Arrival', color: 'sky' }, { type: 'AD', title: 'Departure', color: 'orange' } ].map((group) => {
                        const flights = flightDetails.filter(f => f.type === group.type);
                        return (
                          <div key={group.type} className={`border-l-4 border-${group.color}-500 pl-4 py-2 space-y-4`}>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{group.title}</p>
                            {flights.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">No {group.title.toLowerCase()} flights added</p>
                            ) : (
                              flights.map((flight, localIdx) => {
                                // Find global index to update correctly
                                const globalIdx = flightDetails.findIndex(f => f === flight);
                                return (
                                  <div key={globalIdx} className="space-y-4 p-3 bg-gray-50/50 rounded-lg relative group">
                                    {isAdminOrStaff && (
                                      <button 
                                        onClick={() => removeFlight(globalIdx)}
                                        className="absolute -top-2 -right-2 h-5 w-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Carrier</label>
                                        <Input
                                          value={flight.carrier || ''}
                                          onChange={(e) => updateFlight(globalIdx, 'carrier', e.target.value)}
                                          placeholder="e.g. SV"
                                          className="h-8 text-xs font-bold"
                                          disabled={!isAdminOrStaff}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Flight #</label>
                                        <Input
                                          value={flight.number || ''}
                                          onChange={(e) => updateFlight(globalIdx, 'number', e.target.value)}
                                          placeholder="1234"
                                          className="h-8 text-xs font-bold"
                                          disabled={!isAdminOrStaff}
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Date</label>
                                        <Input
                                          type="date"
                                          value={flight.date || ''}
                                          onChange={(e) => updateFlight(globalIdx, 'date', e.target.value)}
                                          className="h-8 text-xs"
                                          disabled={!isAdminOrStaff}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">{group.type === 'AA' ? 'ETA' : 'ETD'}</label>
                                        <TimePicker
                                          value={(group.type === 'AA' ? flight.eta : flight.etd) || ''}
                                          onChange={(val) => updateFlight(globalIdx, group.type === 'AA' ? 'eta' : 'etd', val)}
                                          className="h-8 text-xs"
                                          disabled={!isAdminOrStaff}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">{group.type === 'AA' ? 'Arrival Hub' : 'Departure Hub'}</label>
                                      <Select 
                                        value={airports.some(a => a.name === (group.type === 'AA' ? flight.from : flight.to) || a.code === (group.type === 'AA' ? flight.from : flight.to)) ? 
                                          (airports.find(a => a.name === (group.type === 'AA' ? flight.from : flight.to) || a.code === (group.type === 'AA' ? flight.from : flight.to))?.id) : ''} 
                                        onValueChange={(val) => {
                                          const airport = airports.find(a => a.id === val);
                                          updateFlight(globalIdx, group.type === 'AA' ? 'from' : 'to', airport?.name || '');
                                        }}
                                        disabled={!isAdminOrStaff}
                                      >
                                        <SelectTrigger className="h-8 text-xs font-medium bg-white border-gray-200">
                                          <SelectValue placeholder="Select airport" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {airports.map(a => (
                                            <SelectItem key={a.id} value={a.id} className="text-xs">
                                              {a.code} - {a.name} ({a.city})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })}
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

