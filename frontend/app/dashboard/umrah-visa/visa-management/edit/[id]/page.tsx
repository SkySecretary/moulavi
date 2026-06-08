'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI, umrahVisaMasterAPI, locationMasterAPI, cityMasterAPI, transportMasterAPI, transportRouteMasterAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MovementsTable } from '@/components/umrah-booking/components/MovementsTable';
import { Calendar, Plane, Users, Building, MapPin, Mail, ArrowLeft, Clock, DollarSign, Route, Truck, X, Plus, Save } from 'lucide-react';
import { Movement, LocationMaster } from '@/lib/umrah/types';
import { TimePicker } from '@/components/ui/time-picker';
import { formatTransportRoute } from '@/lib/utils';

export default function EditUmrahVisaBookingPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = (params?.id as string) || '';
  const user = getUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  // Form state
  const [groupNumber, setGroupNumber] = useState('');
  const [groupName, setGroupName] = useState('');
  
  // Travel Details
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [arrivalAirportId, setArrivalAirportId] = useState('');
  const [arrivalFlightNumber, setArrivalFlightNumber] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [departureAirportId, setDepartureAirportId] = useState('');
  const [departureFlightNumber, setDepartureFlightNumber] = useState('');

  // Accommodation
  const [accommodationType, setAccommodationType] = useState<'hotel' | 'iqama'>('hotel');
  const [hotelBookings, setHotelBookings] = useState<any[]>([]);
  const [iqamaName, setIqamaName] = useState('');
  const [iqamaNumber, setIqamaNumber] = useState('');
  const [iqamaDob, setIqamaDob] = useState('');
  const [iqamaMobile, setIqamaMobile] = useState('');
  const [iqamaNationalShortAddress, setIqamaNationalShortAddress] = useState('');

  // Iqama Hotel Details
  const [iqamaMakkahHotelName, setIqamaMakkahHotelName] = useState('');
  const [iqamaMakkahBrn, setIqamaMakkahBrn] = useState('');
  const [iqamaMadinahHotelName, setIqamaMadinahHotelName] = useState('');
  const [iqamaMadinahBrn, setIqamaMadinahBrn] = useState('');


  // Transportation
  const [transportBookings, setTransportBookings] = useState<any[]>([]);

  // Movement Details
  const [movements, setMovements] = useState<Movement[]>([]);

  // Passengers
  const [passengers, setPassengers] = useState<any[]>([]);

  // Master Data
  const [airports, setAirports] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [locationMasters, setLocationMasters] = useState<LocationMaster[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [transportRoutes, setTransportRoutes] = useState<any[]>([]);
  const [transportMasters, setTransportMasters] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);

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
      const b = res.data;
      setBooking(b);

      setGroupNumber(b.groupNumber || '');
      setGroupName(b.groupName || '');

      const mainTravel = b.travelDetails?.find((t: any) => !t.isAlternate);
      if (mainTravel?.arrivalDateTime) {
        const arrival = new Date(mainTravel.arrivalDateTime);
        setArrivalDate(arrival.toISOString().split('T')[0]);
        setArrivalTime(arrival.toTimeString().slice(0, 5));
      }
      setArrivalAirportId(mainTravel?.arrivalAirportId || '');
      setArrivalFlightNumber(mainTravel?.arrivalFlightNumber || '');

      if (mainTravel?.departureDateTime) {
        const departure = new Date(mainTravel.departureDateTime);
        setDepartureDate(departure.toISOString().split('T')[0]);
        setDepartureTime(departure.toTimeString().slice(0, 5));
      }
      setDepartureAirportId(mainTravel?.departureAirportId || '');
      setDepartureFlightNumber(mainTravel?.departureFlightNumber || '');

      setAccommodationType(b.accommodationType || 'hotel');
      setHotelBookings(b.hotelBookings || []);

      if (b.sponsorIqamaDetails) {
        const mainIqama = b.sponsorIqamaDetails.find((i: any) => !i.isAlternate);
        if (mainIqama) {
          setIqamaNumber(mainIqama.iqamaNumber || '');
          setIqamaName(mainIqama.iqamaSponserName || '');
          if (mainIqama.sponserDob) {
            setIqamaDob(new Date(mainIqama.sponserDob).toISOString().split('T')[0]);
          }
          setIqamaMobile(mainIqama.sponserMobileNumber || '');
          setIqamaNationalShortAddress(mainIqama.sponserNationalShortAddress || '');
          setIqamaMakkahHotelName(mainIqama.makkahHotelName || '');
          setIqamaMakkahBrn(mainIqama.makkahBrn || '');
          setIqamaMadinahHotelName(mainIqama.madinahHotelName || '');
          setIqamaMadinahBrn(mainIqama.madinahBrn || '');
        }
      }

      setTransportBookings(b.transportBookings || []);

      const convertedMovements: Movement[] = (b.movementDetails || []).map((md: any) => {
        const travelDateTime = new Date(md.travelDateTime);
        const isZiyarath = md.toLocation?.locationType === 'ZIYARAT';
        return {
          id: md.id,
          type: isZiyarath ? 'ziyarath' : 'transport',
          date: travelDateTime.toISOString().split('T')[0],
          time: travelDateTime.toTimeString().slice(0, 5),
          fromLocationId: md.fromLocationId,
          toLocationId: md.toLocationId,
          viabadrOverride: false,
        };
      });
      setMovements(convertedMovements);
      setPassengers(b.passengers || []);

      await loadMasterData();
      
      const locationsRes = await locationMasterAPI.getActive();
      const allLocations = locationsRes.data?.locationMasters || locationsRes.data || [];
      
      if (b.hotelBookings && b.hotelBookings.length > 0) {
        const updatedHotelBookings = b.hotelBookings.map((hb: any) => {
          const location = allLocations.find((l: any) => 
            l.locationType === 'OTHERS' && (l.cityId === hb.cityId || l.cityMaster?.id === hb.cityId)
          );
          return {
            ...hb,
            locationId: location?.id || '',
          };
        });
        setHotelBookings(updatedHotelBookings);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async () => {
    try {
      const [airportsRes, citiesRes, locationsRes] = await Promise.all([
        umrahVisaMasterAPI.getAirports(),
        cityMasterAPI.getActive(),
        locationMasterAPI.getActive(),
      ]);

      setAirports(airportsRes.data?.locationMasters || airportsRes.data?.airports || []);
      setCities(citiesRes.data?.cityMasters || citiesRes.data || []);
      const locations = locationsRes.data?.locationMasters || locationsRes.data || [];
      setLocationMasters(locations);

      const hotelLocations = locations.filter((loc: any) => loc.locationType === 'HOTEL');
      setHotels(hotelLocations);

      const [routesRes, mastersRes] = await Promise.all([
        transportRouteMasterAPI.getActive(),
        transportMasterAPI.getActive(),
      ]);
      setTransportRoutes(routesRes.data?.transportRouteMasters || routesRes.data || []);
      setTransportMasters(mastersRes.data?.transportMasters || mastersRes.data || []);
      
      const uniqueVehicleTypes = Array.from(
        new Map(
          (mastersRes.data?.transportMasters || mastersRes.data || []).map((tm: any) => [
            tm.vehicleType?.id,
            tm.vehicleType,
          ])
        ).values()
      );
      setVehicleTypes(uniqueVehicleTypes);
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await umrahVisaAPI.updateGroupNumber(bookingId, groupNumber, groupName);

      await umrahVisaAPI.updateTravelDetails(bookingId, {
        arrivalDate,
        arrivalTime,
        arrivalAirportId,
        arrivalFlightNumber,
        departureDate,
        departureTime,
        departureAirportId,
        departureFlightNumber,
      });

      const movementDetailsToSave = movements.map((m) => {
        return {
          id: m.id?.startsWith('new-') ? undefined : m.id,
          date: m.date,
          time: m.time || '12:00',
          fromLocationId: m.fromLocationId,
          toLocationId: m.toLocationId,
          viabadrOverride: m.viabadrOverride || false,
        };
      });
      
      if (movementDetailsToSave.length > 0) {
        await umrahVisaAPI.updateMovementDetails(bookingId, movementDetailsToSave);
      }

      await umrahVisaAPI.updateTransportBookings(bookingId, transportBookings.map(t => ({
        id: t.id,
        travelDateTime: t.travelDateTime,
        transportMasterId: t.transportMasterId,
      })));

      if (accommodationType === 'hotel') {
        for (const h of hotelBookings) {
          const location = locationMasters.find((l: any) => l.id === h.locationId);
          const cityId = location?.cityMaster?.id;
          
          if (!cityId || !h.hotelId) continue;

          if (h.id && !h.id.startsWith('new-')) {
            await umrahVisaAPI.updateAccommodation(bookingId, {
              accommodationType: 'hotel',
              hotelBookings: [{
                id: h.id,
                checkInDate: h.checkInDate,
                checkOutDate: h.checkOutDate,
              }],
            });
          } else {
            await umrahVisaAPI.createHotelBooking(bookingId, {
              cityId: cityId,
              hotelId: h.hotelId,
              checkInDate: h.checkInDate,
              checkOutDate: h.checkOutDate,
            });
          }
        }
      } else if (accommodationType === 'iqama') {
        await umrahVisaAPI.updateAccommodation(bookingId, {
          accommodationType: 'iqama',
          iqamaSponserName: iqamaName,
          iqamaNumber: iqamaNumber,
          sponserDob: iqamaDob,
          sponserMobileNumber: iqamaMobile,
          sponserNationalShortAddress: iqamaNationalShortAddress,
          makkahHotelName: iqamaMakkahHotelName,
          makkahBrn: iqamaMakkahBrn,
          madinahHotelName: iqamaMadinahHotelName,
          madinahBrn: iqamaMadinahBrn,
        });
      }

      await umrahVisaAPI.updatePassengers(bookingId, passengers.map(p => ({
        id: p.id?.startsWith('new-') ? undefined : p.id,
        fullName: p.fullName,
        passportNumber: p.passportNumber,
        nationality: p.nationality,
      })));

      toast.success('Booking updated successfully');
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateMovement = useCallback((index: number, field: keyof Movement, value: any) => {
    setMovements(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeMovement = useCallback((index: number) => {
    const movement = movements[index];
    if (movement.id && !movement.id.startsWith('new-')) {
      umrahVisaAPI.deleteMovementDetail(movement.id).catch((err: any) => {
        toast.error(err?.response?.data?.error || 'Failed to delete movement');
      });
    }
    setMovements(prev => prev.filter((_, i) => i !== index));
    toast.success('Movement removed');
  }, [movements]);

  const addMovement = useCallback(() => {
    const newMovement: Movement = {
      id: `new-${Date.now()}`,
      type: 'transport',
      fromLocationId: '',
      toLocationId: '',
      date: '',
      time: '12:00',
    };
    setMovements(prev => [...prev, newMovement]);
  }, []);

  const addMovementAfter = useCallback((index: number) => {
    const newMovement: Movement = {
      id: `new-${Date.now()}`,
      type: 'transport',
      fromLocationId: movements[index]?.toLocationId || '',
      toLocationId: '',
      date: movements[index]?.date || '',
      time: movements[index]?.time || '12:00',
    };
    setMovements(prev => {
      const updated = [...prev];
      updated.splice(index + 1, 0, newMovement);
      return updated;
    });
  }, [movements]);

  const addTransportBooking = async () => {
    try {
      const lastBooking = transportBookings[transportBookings.length - 1];
      const res = await umrahVisaAPI.createTransportBooking(bookingId, {
        transportMasterId: lastBooking?.transportMasterId || transportMasters[0]?.id || '',
        travelDateTime: lastBooking?.travelDateTime || new Date().toISOString(),
      });
      setTransportBookings(prev => [...prev, res.data.transportBooking]);
      toast.success('Transport booking added');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add transport booking');
    }
  };

  const removeTransportBooking = async (id: string, index: number) => {
    try {
      await umrahVisaAPI.deleteTransportBooking(id);
      setTransportBookings(prev => prev.filter((_, i) => i !== index));
      toast.success('Transport booking removed');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to remove transport booking');
    }
  };

  const updateTransportBooking = (index: number, field: string, value: any) => {
    setTransportBookings(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const addHotelBooking = () => {
    const lastBooking = hotelBookings[hotelBookings.length - 1];
    setHotelBookings(prev => [...prev, {
      id: `new-${Date.now()}`,
      locationId: lastBooking?.locationId || locations.filter((l: any) => l.locationType === 'OTHERS')[0]?.id || '',
      hotelId: lastBooking?.hotelId || hotels[0]?.id || '',
      checkInDate: lastBooking?.checkOutDate || arrivalDate || new Date().toISOString().split('T')[0],
      checkOutDate: departureDate || new Date().toISOString().split('T')[0],
    }]);
  };

  const removeHotelBooking = async (id: string, index: number) => {
    if (id && !id.startsWith('new-')) {
      try {
        await umrahVisaAPI.deleteHotelBooking(id);
        toast.success('Hotel booking removed');
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Failed to remove hotel booking');
        return;
      }
    }
    setHotelBookings(prev => prev.filter((_, i) => i !== index));
  };

  const updateHotelBooking = (index: number, field: string, value: any) => {
    setHotelBookings(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const addPassenger = () => {
    setPassengers(prev => [...prev, {
      id: `new-${Date.now()}`,
      fullName: '',
      passportNumber: '',
      nationality: '',
      isLeadPassenger: prev.length === 0,
    }]);
  };

  const removePassenger = (index: number) => {
    const passenger = passengers[index];
    if (passenger.id && !passenger.id.startsWith('new-')) {
      toast.error('Cannot remove existing passengers');
      return;
    }
    setPassengers(prev => prev.filter((_, i) => i !== index));
  };

  const updatePassenger = (index: number, field: string, value: any) => {
    setPassengers(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const getHotelsForLocation = (locationId: string) => {
    if (!locationId) return hotels;
    const location = locationMasters.find((l: any) => l.id === locationId);
    if (location?.cityMaster?.id) {
      return hotels.filter((h: any) => h.cityId === location.cityMaster?.id);
    }
    return hotels;
  };

  const formatDateTime = (dateTime?: string | Date) => {
    if (!dateTime) return { date: '', time: '' };
    try {
      const dt = new Date(dateTime);
      return {
        date: dt.toISOString().split('T')[0],
        time: dt.toTimeString().slice(0, 5),
      };
    } catch {
      return { date: '', time: '' };
    }
  };

  const locations = locationMasters.filter((l: any) => l.locationType === 'OTHERS' || l.locationType === 'HOTEL');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="leading-tight">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Edit Umrah Visa Booking</h1>
              <p className="text-sm text-gray-500">ID: {bookingId}</p>
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
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save All Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-8">
        {loading ? (
          <div className="py-12 text-center">Loading...</div>
        ) : !booking ? (
          <div className="py-12 text-center text-gray-500">No booking details available</div>
        ) : (
          <div className="space-y-4 lg:space-y-6">
            {/* Summary Card */}
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
                    <Input 
                      value={groupNumber} 
                      onChange={(e) => setGroupNumber(e.target.value)} 
                      placeholder="Group Number"
                      className="font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Group Name</p>
                    <Input 
                      value={groupName} 
                      onChange={(e) => setGroupName(e.target.value)} 
                      placeholder="Group Name"
                      className="font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Passengers</p>
                    <p className="text-lg font-bold text-gray-900">{booking.passengerCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Travel Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Plane className="h-5 w-5 text-sky-600" /> Travel Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="border-l-4 border-sky-500 pl-4 py-2 space-y-4">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Arrival</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Date</label>
                        <Input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Time</label>
                        <TimePicker value={arrivalTime} onChange={setArrivalTime} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Airport</label>
                      <Select value={arrivalAirportId} onValueChange={setArrivalAirportId}>
                        <SelectTrigger><SelectValue placeholder="Select airport" /></SelectTrigger>
                        <SelectContent>{airports.map(a => (<SelectItem key={a.id} value={a.id}>{a.name || a.airportName}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Flight Number</label>
                      <Input value={arrivalFlightNumber} onChange={(e) => setArrivalFlightNumber(e.target.value)} placeholder="Flight Number" />
                    </div>
                  </div>
                  <div className="border-l-4 border-orange-500 pl-4 py-2 space-y-4">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Departure</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Date</label>
                        <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Time</label>
                        <TimePicker value={departureTime} onChange={setDepartureTime} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Airport</label>
                      <Select value={departureAirportId} onValueChange={setDepartureAirportId}>
                        <SelectTrigger><SelectValue placeholder="Select airport" /></SelectTrigger>
                        <SelectContent>{airports.map(a => (<SelectItem key={a.id} value={a.id}>{a.name || a.airportName}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Flight Number</label>
                      <Input value={departureFlightNumber} onChange={(e) => setDepartureFlightNumber(e.target.value)} placeholder="Flight Number" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Movement Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><Route className="h-5 w-5 text-blue-600" /> Movement Details ({movements.length})</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addMovement}><Plus className="h-4 w-4 mr-1" /> Add Movement</Button>
                </div>
              </CardHeader>
              <CardContent>
                <MovementsTable movements={movements} locationMasters={locationMasters} onUpdateMovement={updateMovement} onRemoveMovement={removeMovement} onAddMovement={addMovementAfter} />
              </CardContent>
            </Card>

            {/* Transportation Vehicles */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><Truck className="h-5 w-5 text-green-600" /> Transportation Vehicles ({transportBookings.length})</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addTransportBooking}><Plus className="h-4 w-4 mr-1" /> Add Vehicle</Button>
                </div>
              </CardHeader>
              <CardContent>
                {transportBookings.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg"><Truck className="h-10 w-10 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-600">No transport bookings found</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                      <thead><tr className="bg-gray-50"><th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Route</th><th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Travel Date</th><th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Travel Time</th><th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Vehicle Type</th><th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Price</th><th className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-700">Action</th></tr></thead>
                      <tbody>
                        {transportBookings.map((t: any, idx: number) => {
                          const travelDateTime = formatDateTime(t.travelDateTime);
                          return (
                            <tr key={t.id || idx} className="hover:bg-gray-50">
                              <td className="border border-gray-200 p-3"><Select value={t.transportMasterId || ''} onValueChange={(val) => updateTransportBooking(idx, 'transportMasterId', val)}><SelectTrigger className="w-full"><SelectValue placeholder="Select transport" /></SelectTrigger><SelectContent>{transportMasters.map((tm: any) => (<SelectItem key={tm.id} value={tm.id}>{formatTransportRoute(tm.route)} - {tm.vehicleType?.vehicleName}</SelectItem>))}</SelectContent></Select></td>
                              <td className="border border-gray-200 p-3"><Input type="date" value={travelDateTime.date} onChange={(e) => updateTransportBooking(idx, 'travelDateTime', new Date(`${e.target.value}T${travelDateTime.time}`).toISOString())} /></td>
                              <td className="border border-gray-200 p-3"><TimePicker value={travelDateTime.time} onChange={(val) => updateTransportBooking(idx, 'travelDateTime', new Date(`${travelDateTime.date}T${val}`).toISOString())} /></td>
                              <td className="border border-gray-200 p-3 text-sm text-gray-600">{t.transportMaster?.vehicleType?.vehicleName || 'N/A'}</td>
                              <td className="border border-gray-200 p-3 text-sm font-semibold text-gray-900">{t.transportMaster?.price ? `₹${Number(t.transportMaster.price).toLocaleString('en-IN')}` : 'N/A'}</td>
                              <td className="border border-gray-200 p-3 text-center"><Button type="button" variant="ghost" size="sm" onClick={() => removeTransportBooking(t.id, idx)} className="text-primary hover:text-destructive"><X className="h-4 w-4" /></Button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Accommodation */}
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building className="h-5 w-5 text-purple-600" /> Accommodation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center"><Building className="h-5 w-5 text-purple-600" /></div>
                  <div className="flex-1"><p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</p><Select value={accommodationType} onValueChange={(val: any) => setAccommodationType(val)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hotel">Hotel</SelectItem><SelectItem value="iqama">Iqama</SelectItem></SelectContent></Select></div>
                </div>
                {accommodationType === 'hotel' && (
                  <div className="space-y-4">
                    <div className="flex justify-end"><Button type="button" variant="outline" onClick={addHotelBooking}><Plus className="h-4 w-4 mr-1" /> Add Hotel Booking</Button></div>
                    {hotelBookings.length === 0 ? (<div className="text-center py-8 bg-gray-50 rounded-lg"><Building className="h-10 w-10 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-600">No hotel bookings found</p></div>) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                          <thead><tr className="bg-gray-50"><th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Location</th><th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Hotel Name</th><th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Check-In</th><th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Check-Out</th><th className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-700">Action</th></tr></thead>
                          <tbody>
                            {hotelBookings.map((h: any, idx: number) => (
                              <tr key={h.id || idx} className="hover:bg-gray-50">
                                <td className="border border-gray-200 p-3"><Select value={h.locationId || ''} onValueChange={(val) => updateHotelBooking(idx, 'locationId', val)}><SelectTrigger className="w-full"><SelectValue placeholder="Select location" /></SelectTrigger><SelectContent>{locations.filter((l: any) => l.locationType === 'OTHERS').map((loc: any) => (<SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>))}</SelectContent></Select></td>
                                <td className="border border-gray-200 p-3"><Select value={h.hotelId || ''} onValueChange={(val) => updateHotelBooking(idx, 'hotelId', val)}><SelectTrigger className="w-full"><SelectValue placeholder="Select hotel" /></SelectTrigger><SelectContent>{getHotelsForLocation(h.locationId).map((hotel: any) => (<SelectItem key={hotel.id} value={hotel.id}>{hotel.name}</SelectItem>))}</SelectContent></Select></td>
                                <td className="border border-gray-200 p-3"><Input type="date" value={h.checkInDate ? h.checkInDate.split('T')[0] : ''} onChange={(e) => updateHotelBooking(idx, 'checkInDate', e.target.value)} /></td>
                                <td className="border border-gray-200 p-3"><Input type="date" value={h.checkOutDate ? h.checkOutDate.split('T')[0] : ''} onChange={(e) => updateHotelBooking(idx, 'checkOutDate', e.target.value)} /></td>
                                <td className="border border-gray-200 p-3 text-center"><Button type="button" variant="ghost" size="sm" onClick={() => removeHotelBooking(h.id, idx)} className="text-primary hover:text-destructive"><X className="h-4 w-4" /></Button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                {accommodationType === 'iqama' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Iqama Number</label><Input value={iqamaNumber} onChange={(e) => setIqamaNumber(e.target.value)} placeholder="Iqama Number" /></div>
                    <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Holder Name</label><Input value={iqamaName} onChange={(e) => setIqamaName(e.target.value)} placeholder="Holder Name" /></div>
                    <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date of Birth</label><Input type="date" value={iqamaDob} onChange={(e) => setIqamaDob(e.target.value)} /></div>
                    <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Mobile Number</label><Input value={iqamaMobile} onChange={(e) => setIqamaMobile(e.target.value)} placeholder="Mobile Number" /></div>
                    <div className="space-y-1 sm:col-span-2"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">National Short Address</label><Input value={iqamaNationalShortAddress} onChange={(e) => setIqamaNationalShortAddress(e.target.value)} placeholder="National Short Address" /></div>
                    
                    <div className="col-span-1 sm:col-span-2 mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-bold text-gray-700 mb-4">Iqama Hotel Details (For Reference & Copy All)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Makkah Hotel Name</label><Input value={iqamaMakkahHotelName} onChange={(e) => setIqamaMakkahHotelName(e.target.value)} placeholder="e.g., ANWAR AL SALAH" /></div>
                        <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Makkah BRN</label><Input value={iqamaMakkahBrn} onChange={(e) => setIqamaMakkahBrn(e.target.value)} placeholder="BRN or Agreement No" /></div>
                        <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Madinah Hotel Name</label><Input value={iqamaMadinahHotelName} onChange={(e) => setIqamaMadinahHotelName(e.target.value)} placeholder="e.g., Dalla Taiba" /></div>
                        <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Madinah BRN</label><Input value={iqamaMadinahBrn} onChange={(e) => setIqamaMadinahBrn(e.target.value)} placeholder="BRN or Agreement No" /></div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Passengers */}
            <Card>
              <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-rose-600" /> Passengers ({passengers.length})</CardTitle><Button type="button" variant="outline" size="sm" onClick={addPassenger}><Plus className="h-4 w-4 mr-1" /> Add Passenger</Button></div></CardHeader>
              <CardContent><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {passengers.map((p: any, idx: number) => (
                  <div key={p.id || idx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1"><Input value={p.fullName || ''} onChange={(e) => updatePassenger(idx, 'fullName', e.target.value)} placeholder="Full Name" className="font-bold mb-2" />{p.isLeadPassenger && (<Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs font-semibold mb-2">Lead Passenger</Badge>)}</div>
                      {p.id && p.id.startsWith('new-') && (<Button type="button" variant="ghost" size="sm" onClick={() => removePassenger(idx)} className="text-primary hover:text-destructive"><X className="h-4 w-4" /></Button>)}
                    </div>
                    <div className="space-y-2">
                      <div><label className="text-xs text-gray-600 mb-1 block">Passport Number</label><Input value={p.passportNumber || ''} onChange={(e) => updatePassenger(idx, 'passportNumber', e.target.value)} placeholder="Passport Number" /></div>
                      <div><label className="text-xs text-gray-600 mb-1 block">Nationality</label><Input value={p.nationality || ''} onChange={(e) => updatePassenger(idx, 'nationality', e.target.value)} placeholder="Nationality" /></div>
                    </div>
                  </div>
                ))}
              </div></CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
