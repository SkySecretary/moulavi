'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI, umrahVisaMasterAPI, locationMasterAPI, cityMasterAPI, transportMasterAPI, transportRouteMasterAPI, partyAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MovementsTable } from '@/components/umrah-booking/components/MovementsTable';
import { HotelBookingTable } from '@/components/umrah-booking/components/HotelBookingTable';
import { Calendar, Plane, Users, Building, MapPin, Mail, ArrowLeft, Clock, DollarSign, Route, Truck, X, Plus, Save } from 'lucide-react';
import { Movement, LocationMaster } from '@/lib/umrah/types';
import { TimePicker } from '@/components/ui/time-picker';
import { formatTransportRoute } from '@/lib/utils';
import { formatFlightNumber, toDisplayDate, fromDisplayDate, isValidStrictDate, extractDateFromISO, extractTimeFromISO, combineDateAndTime } from '@/lib/umrah/validation';
import { UMRAH_VISA_STATUS_CONFIG } from '@/lib/constants';

export default function EditUmrahVisaBookingPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = (params?.id as string) || '';
  const user = getUser();
  const isAdmin = hasRole('admin');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  // Form state
  const [groupNumber, setGroupNumber] = useState('');
  const [groupName, setGroupName] = useState('');
  const [brn, setBrn] = useState('');
  const [umrahVisaProviderId, setUmrahVisaProviderId] = useState('');
  const [transportCompanyId, setTransportCompanyId] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [passengerCount, setPassengerCount] = useState(0);
  const [bookingStatus, setBookingStatus] = useState('');
  
  // Travel Details
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [arrivalAirportId, setArrivalAirportId] = useState('');
  const [arrivalFlightNumber, setArrivalFlightNumber] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [departureAirportId, setDepartureAirportId] = useState('');
  const [departureFlightNumber, setDepartureFlightNumber] = useState('');
  const [flightBrn, setFlightBrn] = useState('');

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
  const [umrahCompanies, setUmrahCompanies] = useState<any[]>([]);
  const [transportCompanies, setTransportCompanies] = useState<any[]>([]);

  const mappedLocationsForTable = useMemo(() => {
    const locs = locationMasters.filter((l: any) => l.locationType === 'OTHERS' || l.locationType === 'HOTEL');
    return locs.map((l: any) => ({
      id: l.id,
      destinationName: l.name || l.destinationName || ''
    }));
  }, [locationMasters]);

  const mappedHotelsForTable = useMemo(() => {
    const hots = locationMasters.filter((l: any) => l.locationType === 'HOTEL');
    return hots.map((h: any) => ({
      id: h.id,
      name: h.name || h.hotelName || '',
      cityId: h.cityId
    }));
  }, [locationMasters]);

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
      setBrn(b.brn || '');
      setUmrahVisaProviderId(b.umrahVisaProviderId || '');
      setTransportCompanyId(b.transportCompanyId || '');
      setSelectedCustomerId(b.partyId || '');
      setPassengerCount(b.passengerCount || 0);
      setBookingStatus(b.status || '');

      const mainTravel = b.travelDetails?.find((t: any) => !t.isAlternate);
      if (mainTravel?.arrivalDateTime) {
        setArrivalDate(toDisplayDate(extractDateFromISO(mainTravel.arrivalDateTime)));
        setArrivalTime(extractTimeFromISO(mainTravel.arrivalDateTime));
      }
      setArrivalAirportId(mainTravel?.arrivalAirportId || '');
      setArrivalFlightNumber(mainTravel?.arrivalFlightNumber || '');

      if (mainTravel?.departureDateTime) {
        setDepartureDate(toDisplayDate(extractDateFromISO(mainTravel.departureDateTime)));
        setDepartureTime(extractTimeFromISO(mainTravel.departureDateTime));
      }
      setDepartureAirportId(mainTravel?.departureAirportId || '');
      setDepartureFlightNumber(mainTravel.departureFlightNumber || '');
      setFlightBrn(mainTravel.brn || '');
      
      setAccommodationType(b.accommodationType || 'hotel');
      
      if (b.hotelBookings) {
        setHotelBookings(b.hotelBookings.map((hb: any) => ({
          ...hb,
          checkInDate: toDisplayDate(hb.checkInDate),
          checkOutDate: toDisplayDate(hb.checkOutDate),
        })));
      }

      if (b.sponsorIqamaDetails) {
        const mainIqama = b.sponsorIqamaDetails.find((i: any) => !i.isAlternate);
        if (mainIqama) {
          setIqamaNumber(mainIqama.iqamaNumber || '');
          setIqamaName(mainIqama.iqamaSponserName || '');
          if (mainIqama.sponserDob) {
            setIqamaDob(toDisplayDate(extractDateFromISO(mainIqama.sponserDob)));
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
        const isZiyarath = md.toLocation?.locationType === 'ZIYARAT';
        
        let dateStr = '';
        let timeStr = '20:30';
        
        if (md.travelDateTime) {
          dateStr = toDisplayDate(extractDateFromISO(md.travelDateTime));
          timeStr = extractTimeFromISO(md.travelDateTime);
        } else {
          dateStr = toDisplayDate(new Date().toISOString().split('T')[0]);
        }

        return {
          id: md.id,
          type: isZiyarath ? 'ziyarath' : 'transport',
          date: dateStr,
          time: timeStr,
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

      const [umrahCompaniesRes, transportCompaniesRes, customersRes] = await Promise.all([
        partyAPI.getAll({ 
          is_supplier: 'true', 
          supplier_service_type: 'umrah_service',
          limit: '1000' 
        }),
        partyAPI.getAll({ 
          is_supplier: 'true', 
          supplier_service_type: 'transport_service',
          limit: '1000' 
        }),
        partyAPI.getAll({
          is_customer: 'true',
          page: '1',
          limit: '1000'
        })
      ]);
      setUmrahCompanies(umrahCompaniesRes.data?.parties || umrahCompaniesRes.data || []);
      setTransportCompanies(transportCompaniesRes.data?.parties || transportCompaniesRes.data || []);
      setCustomers(customersRes.data?.parties || customersRes.data || []);
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  const handleSave = async () => {
    try {
      // Basic validation
      if (!isValidStrictDate(arrivalDate)) {
        toast.error('Arrival date must be in DD/MM/YY format');
        return;
      }
      if (!isValidStrictDate(departureDate)) {
        toast.error('Departure date must be in DD/MM/YY format');
        return;
      }

      setSaving(true);

      if (isAdmin && bookingStatus && bookingStatus !== booking.status) {
        await umrahVisaAPI.updateBookingStatus(bookingId, bookingStatus, 'Status updated via manual edit');
      }

      await umrahVisaAPI.updateGroupNumber(bookingId, groupNumber, groupName, brn, umrahVisaProviderId, transportCompanyId, passengerCount, selectedCustomerId);

      await umrahVisaAPI.updateTravelDetails(bookingId, {
        arrivalDateTime: combineDateAndTime(arrivalDate, arrivalTime),
        departureDateTime: combineDateAndTime(departureDate, departureTime),
        arrivalAirportId,
        arrivalFlightNumber,
        departureAirportId,
        departureFlightNumber,
        brn: flightBrn,
      });

      const movementDetailsToSave = movements.map((m) => {
        return {
          id: m.id?.startsWith('new-') ? undefined : m.id,
          travelDateTime: combineDateAndTime(m.date, m.time),
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
        const hotelBookingsToUpdate = hotelBookings
          .filter(h => h.id && !h.id.startsWith('new-'))
          .map(h => {
            const location = locationMasters.find((l: any) => l.id === h.locationId);
            return {
              id: h.id,
              cityId: location?.cityMaster?.id || h.cityId,
              hotelId: h.hotelId,
              checkInDate: combineDateAndTime(h.checkInDate, '20:30'),
              checkOutDate: combineDateAndTime(h.checkOutDate, '20:30'),
              brn: h.brn,
              additionalBrns: h.additionalBrns,
            };
          });

        if (hotelBookingsToUpdate.length > 0) {
          await umrahVisaAPI.updateAccommodation(bookingId, {
            accommodationType: 'hotel',
            hotelBookings: hotelBookingsToUpdate,
          });
        }

        const hotelBookingsToCreate = hotelBookings
          .filter(h => !h.id || h.id.startsWith('new-'))
          .map(h => {
            const location = locationMasters.find((l: any) => l.id === h.locationId);
            return {
              cityId: location?.cityMaster?.id || h.cityId,
              hotelId: h.hotelId,
              checkInDate: combineDateAndTime(h.checkInDate, '20:30'),
              checkOutDate: combineDateAndTime(h.checkOutDate, '20:30'),
              brn: h.brn,
              additionalBrns: h.additionalBrns,
            };
          })
          .filter(h => h.cityId && h.hotelId);
        for (const h of hotelBookingsToCreate) {
          await umrahVisaAPI.createHotelBooking(bookingId, h);
        }
      } else if (accommodationType === 'iqama') {
        await umrahVisaAPI.updateAccommodation(bookingId, {
          accommodationType: 'iqama',
          iqamaSponserName: iqamaName,
          iqamaNumber: iqamaNumber,
          sponserDob: fromDisplayDate(iqamaDob),
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
        passportExpiry: fromDisplayDate(p.passportExpiry),
        dateOfBirth: fromDisplayDate(p.dateOfBirth),
        gender: p.gender,
        phoneNumber: p.phoneNumber,
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
      time: '20:30',
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
      time: movements[index]?.time || '20:30',
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
    setTransportBookings(prev => prev.map((t, i) => {
      if (i === index) {
        const updated = { ...t, [field]: value };
        // If updating master ID, also update the master object for immediate UI feedback
        if (field === 'transportMasterId') {
          const master = transportMasters.find((m: any) => m.id === value);
          if (master) {
            updated.transportMaster = master;
          }
        }
        return updated;
      }
      return t;
    }));
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
      passportExpiry: '',
      dateOfBirth: '',
      gender: 'male',
      phoneNumber: '',
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
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">BRN</p>
                    <Input 
                      value={brn} 
                      onChange={(e) => setBrn(e.target.value)} 
                      placeholder="BRN"
                      className="font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Umrah Company</p>
                    <SearchableSelect
                      options={umrahCompanies.map(c => ({ value: c.id, label: c.partyName }))}
                      value={umrahVisaProviderId}
                      onValueChange={setUmrahVisaProviderId}
                      placeholder="Select Umrah Company"
                      searchPlaceholder="Search company..."
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Transport Company</p>
                    <SearchableSelect
                      options={transportCompanies.map(c => ({ value: c.id, label: c.partyName }))}
                      value={transportCompanyId}
                      onValueChange={setTransportCompanyId}
                      placeholder="Select Transport Company"
                      searchPlaceholder="Search company..."
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Agency / Customer</p>
                    <SearchableSelect
                      options={customers.map(c => ({ value: c.id, label: c.partyName }))}
                      value={selectedCustomerId}
                      onValueChange={setSelectedCustomerId}
                      placeholder="Select Customer / Agency"
                      searchPlaceholder="Search customer..."
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Passengers (Qty)</p>
                    <Input 
                      type="number"
                      value={passengerCount}
                      onChange={(e) => setPassengerCount(parseInt(e.target.value) || 0)}
                      className="font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Booking Status</p>
                    {isAdmin ? (
                      <Select value={bookingStatus} onValueChange={setBookingStatus} disabled={saving}>
                        <SelectTrigger className="font-bold bg-white">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(UMRAH_VISA_STATUS_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key} className="font-medium">
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="pt-1.5">
                        <Badge className={`text-xs font-semibold ${
                          UMRAH_VISA_STATUS_CONFIG[bookingStatus as keyof typeof UMRAH_VISA_STATUS_CONFIG]?.color || 'bg-gray-100'
                        }`}>
                          {UMRAH_VISA_STATUS_CONFIG[bookingStatus as keyof typeof UMRAH_VISA_STATUS_CONFIG]?.label || bookingStatus}
                        </Badge>
                      </div>
                    )}
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
                        <DatePicker value={arrivalDate} onChange={setArrivalDate} disabled={saving} />
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
                        <SelectContent>{airports.map(a => (<SelectItem key={a.id} value={a.id}>{a.code} - {a.name || a.airportName} ({a.city})</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Flight Number</label>
                      <Input 
                        value={arrivalFlightNumber} 
                        onChange={(e) => setArrivalFlightNumber(formatFlightNumber(e.target.value))} 
                        placeholder="SV-XXXX" 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Travel BRN</label>
                      <Input value={flightBrn} onChange={(e) => setFlightBrn(e.target.value)} placeholder="Travel BRN" />
                    </div>
                  </div>
                  <div className="border-l-4 border-orange-500 pl-4 py-2 space-y-4">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Departure</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Date</label>
                        <DatePicker value={departureDate} onChange={setDepartureDate} disabled={saving} />
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
                        <SelectContent>{airports.map(a => (<SelectItem key={a.id} value={a.id}>{a.code} - {a.name || a.airportName} ({a.city})</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Flight Number</label>
                      <Input 
                        value={departureFlightNumber} 
                        onChange={(e) => setDepartureFlightNumber(formatFlightNumber(e.target.value))} 
                        placeholder="SV-XXXX" 
                      />
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
                          return (
                            <tr key={t.id || idx} className="hover:bg-gray-50">
                              <td className="border border-gray-200 p-3"><Select value={t.transportMasterId || ''} onValueChange={(val) => updateTransportBooking(idx, 'transportMasterId', val)}><SelectTrigger className="w-full"><SelectValue placeholder="Select transport" /></SelectTrigger><SelectContent>{transportMasters.map((tm: any) => (<SelectItem key={tm.id} value={tm.id}>{formatTransportRoute(tm.route)} - {tm.vehicleType?.vehicleName}</SelectItem>))}</SelectContent></Select></td>
                              <td className="border border-gray-200 p-3">
                                <DatePicker 
                                  value={toDisplayDate(extractDateFromISO(t.travelDateTime))} 
                                  onChange={(val) => {
                                    const isoDate = fromDisplayDate(val);
                                    const currentTime = extractTimeFromISO(t.travelDateTime) || '20:30';
                                    const combined = combineDateAndTime(isoDate, currentTime);
                                    updateTransportBooking(idx, 'travelDateTime', combined);
                                  }} 
                                />
                              </td>
                              <td className="border border-gray-200 p-3">
                                <TimePicker 
                                  value={extractTimeFromISO(t.travelDateTime)} 
                                  onChange={(val) => {
                                    if (!val) return;
                                    const currentDate = extractDateFromISO(t.travelDateTime) || extractDateFromISO(new Date().toISOString());
                                    const combined = combineDateAndTime(currentDate, val);
                                    updateTransportBooking(idx, 'travelDateTime', combined);
                                  }} 
                                />
                              </td>
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
                  <div className="mt-4 space-y-4">
                    <HotelBookingTable
                      hotelBookings={hotelBookings}
                      locations={mappedLocationsForTable}
                      hotels={mappedHotelsForTable}
                      getHotelsForLocation={getHotelsForLocation}
                      onUpdateBooking={updateHotelBooking}
                      onRemoveBooking={(idx) => {
                        const bookingToRemove = hotelBookings[idx];
                        removeHotelBooking(bookingToRemove.id, idx);
                      }}
                      onAddBooking={addHotelBooking}
                      disabled={saving}
                    />
                  </div>
                )}
                {accommodationType === 'iqama' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Iqama Number</label><Input value={iqamaNumber} onChange={(e) => setIqamaNumber(e.target.value)} placeholder="Iqama Number" /></div>
                    <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Holder Name</label><Input value={iqamaName} onChange={(e) => setIqamaName(e.target.value)} placeholder="Holder Name" /></div>
                    <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date of Birth</label><DatePicker value={iqamaDob} onChange={setIqamaDob} /></div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Mobile Number</label>
                      <Input 
                        value={iqamaMobile} 
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val && !val.startsWith('+966')) {
                            if (val.startsWith('0')) val = val.substring(1);
                            if (!val.startsWith('+')) val = '+966' + val;
                          }
                          setIqamaMobile(val);
                        }} 
                        placeholder="+966" 
                      />
                    </div>
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
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs text-gray-600 mb-1 block">Passport Number</label><Input value={p.passportNumber || ''} onChange={(e) => updatePassenger(idx, 'passportNumber', e.target.value)} placeholder="Passport Number" /></div>
                      <div><label className="text-xs text-gray-600 mb-1 block">Nationality</label><Input value={p.nationality || ''} onChange={(e) => updatePassenger(idx, 'nationality', e.target.value)} placeholder="Nationality" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs text-gray-600 mb-1 block">Date of Birth</label><DatePicker value={p.dateOfBirth} onChange={(val) => updatePassenger(idx, 'dateOfBirth', val)} /></div>
                      <div><label className="text-xs text-gray-600 mb-1 block">Passport Expiry</label><DatePicker value={p.passportExpiry} onChange={(val) => updatePassenger(idx, 'passportExpiry', val)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Gender</label>
                        <Select value={p.gender || 'male'} onValueChange={(val) => updatePassenger(idx, 'gender', val)}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div><label className="text-xs text-gray-600 mb-1 block">Phone Number</label><Input value={p.phoneNumber || ''} onChange={(e) => updatePassenger(idx, 'phoneNumber', e.target.value)} placeholder="Phone Number" /></div>
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
