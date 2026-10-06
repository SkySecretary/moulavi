'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { voucherAPI, cityMasterAPI, locationMasterAPI, transportRouteMasterAPI, transportMasterAPI, partyAPI } from '@/lib/api';
import { Loader2, Plus, Minus, MapPin, Truck, Ticket, Users, Plane, Building, CheckCircle2, Navigation } from 'lucide-react';
import { MovementsTable } from '@/components/umrah-booking/components/MovementsTable';
import { TravelDetailsForm } from '@/components/umrah-booking/components/TravelDetailsForm';
import { HotelBookingTable } from '@/components/umrah-booking/components/HotelBookingTable';
import { Step2Data, HotelBooking } from '@/lib/umrah/types';
import { findZiyarathLocation, normalizeCityName } from '@/lib/umrah/generateMovements';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { RouteType } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import { fromDisplayDate, toDisplayDate, extractDateFromISO, formatFlightNumber } from '@/lib/umrah/validation';
import { getUser } from '@/lib/auth';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface QuickVoucherFormProps {
  onSuccess: () => void;
}

interface HotelSchedule {
  number: number;
  cityId?: string;
  cityName?: string;
  city?: string;
  locationId?: string;
  location: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  days: number;
  brn?: string;
  cateringBrn?: string;
}

interface MovementDetail {
  sr: number;
  route: string;
  date: string;
  time: string;
  fromCityId?: string;
  from: string;
  fromLocationId?: string;
  fromLocation: string;
  toCityId?: string;
  to: string;
  toLocationId?: string;
  toLocation: string;
  driverDetails1?: string;
  driverDetails2?: string;
  vehicleNumber?: string;
  paxCount?: number;
  price?: number;
  vehicleType?: string;
}

interface FlightDetail {
  type: 'AA' | 'AD';
  date: string;
  carrier: string;
  number: string;
  fromLocationId?: string;
  from: string;
  toLocationId?: string;
  to: string;
  etd: string;
  eta: string;
}

interface TransportOption {
  transportId: string;
  routeId: string;
  quantity: number;
}

export function QuickVoucherForm({ onSuccess }: QuickVoucherFormProps) {
  const currentUser = getUser();
  const isAgency = currentUser?.role === 'party';
  const [submitting, setSubmitting] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);
  
  // Master Data
  const [cities, setCities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [transports, setTransports] = useState<any[]>([]);
  const [locationsByCity, setLocationsByCity] = useState<Map<string, any[]>>(new Map());
  const [hotelsByCity, setHotelsByCity] = useState<Map<string, any[]>>(new Map());
  const [airports, setAirports] = useState<any[]>([]);
  
  // Route Selection
  const [selectedRouteType, setSelectedRouteType] = useState<RouteType | 'all'>(isAgency ? 'airporttocity' : 'all');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [loadingTransports, setLoadingTransports] = useState(false);
  
  const [formData, setFormData] = useState({
    reservationDate: toDisplayDate(extractDateFromISO(new Date().toISOString())),
    guestName: '',
    guestMobile: '',
    groupCode: '',
    partyId: '',
    umrahCompanyId: '',
    transportCompanyId: '',
    paxCount: 1,
    hotelSchedules: [] as HotelSchedule[],
    movementDetails: [] as MovementDetail[],
    flightDetails: [
      {
        type: 'AA',
        date: '',
        carrier: '',
        number: '',
        fromLocationId: '',
        from: '',
        toLocationId: '',
        to: '',
        etd: '',
        eta: '',
      },
      {
        type: 'AD',
        date: '',
        carrier: '',
        number: '',
        fromLocationId: '',
        from: '',
        toLocationId: '',
        to: '',
        etd: '',
        eta: '',
      }
    ] as FlightDetail[],
    transportOptions: [] as TransportOption[],
  });

  // Master Data for admin picker
  const [parties, setParties] = useState<any[]>([]);
  const [umrahCompanies, setUmrahCompanies] = useState<any[]>([]);
  const [transportCompanies, setTransportCompanies] = useState<any[]>([]);
  const [selectedPartyCurrency, setSelectedPartyCurrency] = useState<any>(null);

  // Load Master Data
  useEffect(() => {
    loadMasterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMasterData = async () => {
    try {
      setLoadingMasters(true);
      
      const promises: Promise<any>[] = [
        cityMasterAPI.getActive().catch(err => { console.warn('cities error:', err); return { data: [] }; }),
        locationMasterAPI.getActive().catch(err => { console.warn('locations error:', err); return { data: [] }; }),
        transportRouteMasterAPI.getActive().catch(err => { console.warn('routes error:', err); return { data: [] }; }),
      ];

      // Only fetch parties list if admin/staff
      if (!isAgency) {
        promises.push(partyAPI.getAll({ limit: '1000' }).catch(err => { console.warn('parties error:', err); return { data: [] }; }));
      }

      const results = await Promise.all(promises);
      const citiesRes = results[0];
      const locationsRes = results[1];
      const routesRes = results[2];
      const partiesRes = results[3];
      
      const citiesData = citiesRes.data?.cityMasters || citiesRes.data || [];
      const locationsData = locationsRes.data?.locationMasters || locationsRes.data || [];
      const routesData = routesRes.data?.transportRouteMasters || routesRes.data || [];
      const partiesData = partiesRes ? (partiesRes.data?.data?.parties || partiesRes.data?.parties || []) : [];
      
      setCities(citiesData);
      setLocations(locationsData);
      setRoutes(routesData);
      
      if (!isAgency) {
        const customerParties = partiesData.filter((p: any) => p.isCustomer);
        setParties(customerParties);
        
        const suppliers = partiesData.filter((p: any) => p.isSupplier);
        setUmrahCompanies(suppliers.filter((p: any) => {
          const types = p.supplierServiceTypes || [];
          return Array.isArray(types) && types.includes('umrah_service');
        }));
        
        setTransportCompanies(suppliers.filter((p: any) => {
          const types = p.supplierServiceTypes || [];
          return Array.isArray(types) && types.includes('transport_service');
        }));
      }
      
      // Group locations by city and type
      const locationsByCityMap = new Map<string, any[]>();
      const hotelsByCityMap = new Map<string, any[]>();
      const airportsList: any[] = [];
      
      locationsData.forEach((loc: any) => {
        const cityKey = (loc.city || loc.cityMaster?.name || '').toLowerCase().trim();
        
        if (!locationsByCityMap.has(cityKey)) {
          locationsByCityMap.set(cityKey, []);
        }
        locationsByCityMap.get(cityKey)!.push(loc);
        
        if (loc.locationType === 'HOTEL') {
          if (!hotelsByCityMap.has(cityKey)) {
            hotelsByCityMap.set(cityKey, []);
          }
          hotelsByCityMap.get(cityKey)!.push(loc);
        } else if (loc.locationType === 'AIRPORT') {
          airportsList.push({
            ...loc,
            airportCode: loc.code,
            airportName: loc.name
          });
        }
      });
      
      setLocationsByCity(locationsByCityMap);
      setHotelsByCity(hotelsByCityMap);
      setAirports(airportsList);

      // Auto-prefill default route & movements
      const defaultType = isAgency ? 'airporttocity' : 'all';
      const matchingRoutes = routesData.filter((r: any) => defaultType === 'all' || r.routeType === defaultType);
      
      let initialRoute = matchingRoutes.find((r: any) => {
        const name = `${r.city1?.name || ''} ${r.city2?.name || ''}`.toLowerCase();
        return name.includes('jeddah') && name.includes('makkah');
      }) || matchingRoutes[0] || routesData[0];

      if (initialRoute) {
        setSelectedRouteId(initialRoute.id);
        const prefilledMovements = generateMovementsFromSelectedRoute(
          initialRoute,
          formData.reservationDate,
          locationsData,
          locationsByCityMap,
          airportsList
        );
        setFormData(prev => ({
          ...prev,
          movementDetails: prefilledMovements,
        }));
      }
    } catch (error) {
      console.error('Error loading master data:', error);
      toast.error('Failed to load master data');
    } finally {
      setLoadingMasters(false);
    }
  };

  // Helper to generate movements for any route
  const generateMovementsFromSelectedRoute = (
    route: any,
    baseDate: string,
    allLocs = locations,
    locsByCity = locationsByCity,
    allAirports = airports
  ): MovementDetail[] => {
    if (!route) return [];

    const routeCities = [route.city1, route.city2, route.city3, route.city4].filter(Boolean);
    const routeType = route.routeType;
    const movements: MovementDetail[] = [];
    const validBaseDate = baseDate || toDisplayDate(extractDateFromISO(new Date().toISOString()));
    const isoBase = fromDisplayDate(validBaseDate) || new Date().toISOString().split('T')[0];

    const getAirportForCity = (cityName: string) => {
      const norm = (cityName || '').toLowerCase().trim();
      return allAirports.find(a => (a.city || a.cityMaster?.name || '').toLowerCase().trim() === norm);
    };

    const getCityLocation = (cityName: string) => {
      const norm = (cityName || '').toLowerCase().trim();
      const cityLocs = locsByCity.get(norm) || [];
      return cityLocs.find((l: any) => l.locationType === 'HOTEL' || l.locationType === 'OTHERS' || l.code?.includes('CC')) || cityLocs[0];
    };

    if (routeType === 'fulltrip' && routeCities.length >= 3) {
      const startCity = routeCities[0];
      const firstStayCity = routeCities[1];
      const secondStayCity = routeCities[2];
      const endCity = routeCities[3] || routeCities[2];

      const startAirport = getAirportForCity(startCity.name) || allAirports.find(a => a.code === 'JED') || allAirports[0];
      const makkahLoc = getCityLocation(firstStayCity.name);
      const madinahLoc = getCityLocation(secondStayCity.name);
      const endAirport = getAirportForCity(endCity.name) || (endCity.name.toLowerCase().includes('madin') ? allAirports.find(a => a.code === 'MED') : allAirports.find(a => a.code === 'JED')) || startAirport;

      // Leg 1: Airport -> Makkah
      movements.push({
        sr: 1,
        route: '',
        date: validBaseDate,
        time: '20:30',
        fromCityId: startCity.id,
        from: startCity.name,
        fromLocationId: startAirport?.id || '',
        fromLocation: startAirport?.name || `${startCity.name} Airport`,
        toCityId: firstStayCity.id,
        to: firstStayCity.name,
        toLocationId: makkahLoc?.id || '',
        toLocation: makkahLoc?.name || `${firstStayCity.name} Hotel`,
      });

      // Leg 2: Makkah -> Madinah (+4 days)
      const leg2DateObj = new Date(isoBase);
      leg2DateObj.setDate(leg2DateObj.getDate() + 4);
      const leg2Display = toDisplayDate(leg2DateObj.toISOString().split('T')[0]);

      movements.push({
        sr: 2,
        route: '',
        date: leg2Display,
        time: '14:00',
        fromCityId: firstStayCity.id,
        from: firstStayCity.name,
        fromLocationId: makkahLoc?.id || '',
        fromLocation: makkahLoc?.name || `${firstStayCity.name} Hotel`,
        toCityId: secondStayCity.id,
        to: secondStayCity.name,
        toLocationId: madinahLoc?.id || '',
        toLocation: madinahLoc?.name || `${secondStayCity.name} Hotel`,
      });

      // Leg 3: Madinah -> Airport (+8 days)
      const leg3DateObj = new Date(isoBase);
      leg3DateObj.setDate(leg3DateObj.getDate() + 8);
      const leg3Display = toDisplayDate(leg3DateObj.toISOString().split('T')[0]);

      movements.push({
        sr: 3,
        route: '',
        date: leg3Display,
        time: '15:00',
        fromCityId: secondStayCity.id,
        from: secondStayCity.name,
        fromLocationId: madinahLoc?.id || '',
        fromLocation: madinahLoc?.name || `${secondStayCity.name} Hotel`,
        toCityId: endCity.id,
        to: endCity.name,
        toLocationId: endAirport?.id || '',
        toLocation: endAirport?.name || `${endCity.name} Airport`,
      });
    } else if (routeType === 'airporttocity') {
      const fromCity = routeCities[0];
      const toCity = routeCities[1] || routeCities[0];
      const airport = getAirportForCity(fromCity.name) || allAirports.find(a => a.code === 'JED') || allAirports[0];
      const toLoc = getCityLocation(toCity.name);

      movements.push({
        sr: 1,
        route: '',
        date: validBaseDate,
        time: '20:30',
        fromCityId: fromCity.id,
        from: fromCity.name,
        fromLocationId: airport?.id || '',
        fromLocation: airport?.name || `${fromCity.name} Airport`,
        toCityId: toCity.id,
        to: toCity.name,
        toLocationId: toLoc?.id || '',
        toLocation: toLoc?.name || `${toCity.name} Hotel`,
      });
    } else if (routeType === 'citytoairport') {
      const fromCity = routeCities[0];
      const toCity = routeCities[1] || routeCities[0];
      const fromLoc = getCityLocation(fromCity.name);
      const airport = getAirportForCity(toCity.name) || allAirports.find(a => a.code === 'JED') || allAirports[0];

      movements.push({
        sr: 1,
        route: '',
        date: validBaseDate,
        time: '14:30',
        fromCityId: fromCity.id,
        from: fromCity.name,
        fromLocationId: fromLoc?.id || '',
        fromLocation: fromLoc?.name || `${fromCity.name} Hotel`,
        toCityId: toCity.id,
        to: toCity.name,
        toLocationId: airport?.id || '',
        toLocation: airport?.name || `${toCity.name} Airport`,
      });
    } else {
      // Sequential cities for intercity / custom
      for (let i = 0; i < routeCities.length - 1; i++) {
        const c1 = routeCities[i];
        const c2 = routeCities[i + 1];
        const loc1 = getCityLocation(c1.name);
        const loc2 = getCityLocation(c2.name);

        const legDateObj = new Date(isoBase);
        legDateObj.setDate(legDateObj.getDate() + (i * 3));

        movements.push({
          sr: i + 1,
          route: '',
          date: toDisplayDate(legDateObj.toISOString().split('T')[0]),
          time: '14:00',
          fromCityId: c1.id,
          from: c1.name,
          fromLocationId: loc1?.id || '',
          fromLocation: loc1?.name || `${c1.name}`,
          toCityId: c2.id,
          to: c2.name,
          toLocationId: loc2?.id || '',
          toLocation: loc2?.name || `${c2.name}`,
        });
      }
    }

    return movements;
  };

  // Filter routes by selected route type
  const filteredRoutes = routes.filter((route: any) => {
    if (selectedRouteType === 'all') return true;
    return route.routeType === selectedRouteType;
  });

  // Load transports when route is selected
  useEffect(() => {
    const loadTransportsForRoute = async () => {
      if (!selectedRouteId) {
        setTransports([]);
        return;
      }

      setLoadingTransports(true);
      try {
        const response = await transportMasterAPI.getByRoute(selectedRouteId);
        const transportsData = response.data.transportMasters || [];
        setTransports(transportsData);

        // If no transport selected yet, auto-select 1 quantity of first vehicle
        if (formData.transportOptions.length === 0 && transportsData.length > 0) {
          setFormData(prev => ({
            ...prev,
            transportOptions: [{
              transportId: transportsData[0].id,
              routeId: selectedRouteId,
              quantity: 1,
            }]
          }));
        }
      } catch (error: any) {
        console.error('Error loading transports:', error);
        setTransports([]);
      } finally {
        setLoadingTransports(false);
      }
    };

    loadTransportsForRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRouteId]);

  // Format route display
  const formatRouteDisplay = (route: any): string => {
    if (!route) return 'No Route';
    
    const routeCities = [
      route.city1?.name || (route.city1Id ? 'City 1' : null),
      route.city2?.name || (route.city2Id ? 'City 2' : null),
      route.city3?.name || (route.city3Id ? 'City 3' : null),
      route.city4?.name || (route.city4Id ? 'City 4' : null),
    ].filter(Boolean);
    
    if (routeCities.length === 0) return `Route (${route.routeType || 'Custom'})`;
    return routeCities.join(' → ');
  };

  // Handle Route Type change
  const handleRouteTypeChange = (newType: RouteType | 'all') => {
    setSelectedRouteType(newType);
    const matching = routes.filter((r: any) => newType === 'all' || r.routeType === newType);
    
    let nextRoute = matching.find((r: any) => {
      const name = `${r.city1?.name || ''} ${r.city2?.name || ''}`.toLowerCase();
      if (newType === 'airporttocity') return name.includes('jeddah') && name.includes('makkah');
      if (newType === 'fulltrip') return name.includes('jeddah') && name.includes('makkah') && name.includes('madinah');
      return true;
    }) || matching[0] || null;

    if (nextRoute) {
      setSelectedRouteId(nextRoute.id);
      const prefilled = generateMovementsFromSelectedRoute(nextRoute, formData.reservationDate);
      setFormData(prev => ({
        ...prev,
        movementDetails: prefilled,
        transportOptions: [],
      }));
    } else {
      setSelectedRouteId(null);
      setFormData(prev => ({ ...prev, transportOptions: [] }));
    }
  };

  // Handle Route selection from dropdown
  const handleRouteSelect = (routeId: string) => {
    const route = routes.find((r: any) => r.id === routeId);
    if (!route) return;

    setSelectedRouteId(routeId);
    const prefilled = generateMovementsFromSelectedRoute(route, formData.reservationDate);
    setFormData(prev => ({
      ...prev,
      movementDetails: prefilled,
      transportOptions: [],
    }));

    toast.success(`Route ${formatRouteDisplay(route)} selected`);
  };

  const handleSubmit = async () => {
    if (!formData.guestName || !formData.paxCount) {
      toast.error('Guest name and passenger count are required');
      return;
    }

    if (formData.transportOptions.length === 0) {
      toast.error('Please select at least one transportation vehicle');
      return;
    }

    try {
      setSubmitting(true);
      await voucherAPI.createQuickVoucher({
        guestName: formData.guestName,
        guestMobile: formData.guestMobile,
        groupCode: formData.groupCode,
        paxCount: formData.paxCount,
        reservationDate: fromDisplayDate(formData.reservationDate),
        transportCompanyId: formData.transportCompanyId || null,
        partyId: formData.partyId || null,
        umrahCompanyId: formData.umrahCompanyId || null,
        hotelSchedules: isAgency ? [] : formData.hotelSchedules.map((hs, idx) => ({
          number: idx + 1,
          location: hs.cityName || hs.location || '',
          hotelName: hs.hotelName || '',
          checkIn: fromDisplayDate(hs.checkIn),
          checkOut: fromDisplayDate(hs.checkOut),
          days: hs.days || 1,
          brn: hs.brn || null,
          cateringBrn: hs.cateringBrn || null,
        })),
        movementDetails: formData.movementDetails.map(m => ({
          sr: m.sr,
          route: null,
          date: fromDisplayDate(m.date),
          time: m.time || '20:30',
          from: m.from || '',
          fromLocation: m.fromLocation || '',
          fromLocationId: m.fromLocationId || null,
          to: m.to || '',
          toLocation: m.toLocation || '',
          toLocationId: m.toLocationId || null,
          driverDetails1: m.driverDetails1 || null,
          driverDetails2: m.driverDetails2 || null,
          vehicleNumber: m.vehicleNumber || null,
          paxCount: m.paxCount || formData.paxCount,
          price: m.price || null,
          vehicleType: m.vehicleType || null,
        })),
        flightDetails: formData.flightDetails.filter(f => {
          const isAA = f.type === 'AA';
          const hubId = isAA ? f.fromLocationId : f.toLocationId;
          const time = isAA ? f.eta : f.etd;
          return !!(hubId || f.carrier || f.number || f.date || time);
        }).map(f => {
          let arrivalAirport = '';
          let departureAirport = '';
          
          if (f.type === 'AA' && f.fromLocationId) {
            const airport = airports.find(a => a.id === f.fromLocationId);
            arrivalAirport = airport?.code || airport?.name || f.from || '';
          }
          
          if (f.type === 'AD' && f.toLocationId) {
            const airport = airports.find(a => a.id === f.toLocationId);
            departureAirport = airport?.code || airport?.name || f.to || '';
          }
          
          return {
            type: f.type,
            date: fromDisplayDate(f.date),
            carrier: f.carrier,
            number: f.number,
            from: f.type === 'AA' ? (arrivalAirport || f.from || '') : 'JED',
            to: f.type === 'AD' ? (departureAirport || f.to || '') : 'JED',
            arrivalAirportId: f.type === 'AA' ? (f.fromLocationId || null) : null,
            arrivalAirport: f.type === 'AA' ? arrivalAirport : undefined,
            departureAirportId: f.type === 'AD' ? (f.toLocationId || null) : null,
            departureAirport: f.type === 'AD' ? departureAirport : undefined,
            etd: f.etd || '',
            eta: f.eta || '',
          };
        }),
        transportOptions: formData.transportOptions,
      });

      if (isAgency) {
        toast.success('Transport booking request submitted successfully! Admin will review and allocate voucher.');
      } else {
        toast.success('Quick voucher created successfully');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error creating quick voucher:', error);
      toast.error(error?.response?.data?.error || 'Failed to submit transport booking');
    } finally {
      setSubmitting(false);
    }
  };

  // Movement functions
  const addMovementDetail = () => {
    const newIndex = formData.movementDetails.length;
    setFormData(prev => ({
      ...prev,
      movementDetails: [
        ...prev.movementDetails,
        {
          sr: newIndex + 1,
          route: '',
          date: formData.reservationDate,
          time: '20:30',
          from: '',
          fromLocation: '',
          to: '',
          toLocation: '',
          driverDetails1: '',
          driverDetails2: '',
          vehicleNumber: '',
        },
      ],
    }));
  };

  const removeMovementDetail = (index: number) => {
    const updated = formData.movementDetails.filter((_, i) => i !== index);
    updated.forEach((m, idx) => {
      m.sr = idx + 1;
    });
    setFormData(prev => ({ ...prev, movementDetails: updated }));
  };

  const updateMovementDetail = (index: number, field: keyof MovementDetail, value: any) => {
    const updated = [...formData.movementDetails];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'from') {
      const cityKey = (value || '').toLowerCase().trim();
      const cityLocations = locationsByCity.get(cityKey) || [];
      if (cityLocations.length > 0) {
        updated[index].fromLocationId = cityLocations[0].id;
        updated[index].fromLocation = cityLocations[0].name;
      }
    }
    
    if (field === 'to') {
      const cityKey = (value || '').toLowerCase().trim();
      const cityLocations = locationsByCity.get(cityKey) || [];
      if (cityLocations.length > 0) {
        updated[index].toLocationId = cityLocations[0].id;
        updated[index].toLocation = cityLocations[0].name;
      }
    }
    
    if (field === 'fromLocationId' || field === 'toLocationId') {
      const location = locations.find(l => l.id === value);
      if (location) {
        if (field === 'fromLocationId') {
          updated[index].fromLocation = location.name;
          updated[index].from = location.city || location.cityMaster?.name || '';
          updated[index].fromCityId = location.cityId || '';
        } else {
          updated[index].toLocation = location.name;
          updated[index].to = location.city || location.cityMaster?.name || '';
          updated[index].toCityId = location.cityId || '';
        }
      }
    }
    
    setFormData(prev => ({ ...prev, movementDetails: updated }));
  };

  // Transport quantity
  const updateTransportQuantity = (transportId: string, delta: number) => {
    const existingIndex = formData.transportOptions.findIndex(t => t.transportId === transportId);
    
    if (existingIndex >= 0) {
      const updated = [...formData.transportOptions];
      const currentQty = updated[existingIndex].quantity || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      if (newQty === 0) {
        updated.splice(existingIndex, 1);
      } else {
        updated[existingIndex].quantity = newQty;
      }
      setFormData({ ...formData, transportOptions: updated });
    } else if (delta > 0 && selectedRouteId) {
      setFormData({
        ...formData,
        transportOptions: [
          ...formData.transportOptions,
          {
            transportId,
            routeId: selectedRouteId,
            quantity: 1,
          },
        ],
      });
    }
  };

  if (loadingMasters) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const arrivalFlight = formData.flightDetails.find(f => f.type === 'AA') || {
    type: 'AA',
    date: '',
    carrier: '',
    number: '',
    fromLocationId: '',
    from: '',
    toLocationId: '',
    to: '',
    etd: '',
    eta: '',
  };
  const departureFlight = formData.flightDetails.find(f => f.type === 'AD') || {
    type: 'AD',
    date: '',
    carrier: '',
    number: '',
    fromLocationId: '',
    from: '',
    toLocationId: '',
    to: '',
    etd: '',
    eta: '',
  };

  const arrivalFlightNum = arrivalFlight.carrier && arrivalFlight.number 
    ? `${arrivalFlight.carrier}-${arrivalFlight.number}` 
    : (arrivalFlight.carrier || arrivalFlight.number || '');
    
  const departureFlightNum = departureFlight.carrier && departureFlight.number 
    ? `${departureFlight.carrier}-${departureFlight.number}` 
    : (departureFlight.carrier || departureFlight.number || '');

  const travelData: Step2Data = {
    arrivalDate: arrivalFlight.date || '',
    arrivalTime: arrivalFlight.eta || '',
    arrivalAirportId: arrivalFlight.fromLocationId || '',
    arrivalFlightNumber: arrivalFlightNum,
    departureDate: departureFlight.date || '',
    departureTime: departureFlight.etd || '',
    departureAirportId: departureFlight.toLocationId || '',
    departureFlightNumber: departureFlightNum,
  };

  const handleTravelDetailsChange = (updates: Partial<Step2Data>) => {
    const updatedFlights = [...formData.flightDetails];
    const aaIndex = updatedFlights.findIndex(f => f.type === 'AA');
    const adIndex = updatedFlights.findIndex(f => f.type === 'AD');

    if (updates.arrivalDate !== undefined) {
      if (aaIndex >= 0) updatedFlights[aaIndex].date = updates.arrivalDate;
    }
    if (updates.arrivalTime !== undefined) {
      if (aaIndex >= 0) updatedFlights[aaIndex].eta = updates.arrivalTime;
    }
    if (updates.arrivalAirportId !== undefined) {
      if (aaIndex >= 0) {
        updatedFlights[aaIndex].fromLocationId = updates.arrivalAirportId;
        const airport = airports.find(a => a.id === updates.arrivalAirportId);
        updatedFlights[aaIndex].from = airport?.code || '';
      }
    }
    if (updates.arrivalFlightNumber !== undefined) {
      if (aaIndex >= 0) {
        const formatted = formatFlightNumber(updates.arrivalFlightNumber);
        updatedFlights[aaIndex].carrier = formatted.includes('-') ? formatted.split('-')[0] : formatted.substring(0, 2);
        updatedFlights[aaIndex].number = formatted.includes('-') ? formatted.split('-')[1] : formatted.substring(2);
      }
    }

    if (updates.departureDate !== undefined) {
      if (adIndex >= 0) updatedFlights[adIndex].date = updates.departureDate;
    }
    if (updates.departureTime !== undefined) {
      if (adIndex >= 0) updatedFlights[adIndex].etd = updates.departureTime;
    }
    if (updates.departureAirportId !== undefined) {
      if (adIndex >= 0) {
        updatedFlights[adIndex].toLocationId = updates.departureAirportId;
        const airport = airports.find(a => a.id === updates.departureAirportId);
        updatedFlights[adIndex].to = airport?.code || '';
      }
    }
    if (updates.departureFlightNumber !== undefined) {
      if (adIndex >= 0) {
        const formatted = formatFlightNumber(updates.departureFlightNumber);
        updatedFlights[adIndex].carrier = formatted.includes('-') ? formatted.split('-')[0] : formatted.substring(0, 2);
        updatedFlights[adIndex].number = formatted.includes('-') ? formatted.split('-')[1] : formatted.substring(2);
      }
    }

    setFormData({ ...formData, flightDetails: updatedFlights });
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-md">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight">
              {isAgency ? 'Book Transport' : 'Create Transport Voucher'}
            </h2>
            <p className="text-xs text-gray-500">
              {isAgency ? 'Select your route, vehicle, and schedule transport movements' : 'Direct transport voucher entry'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left Column: Form Details */}
        <div className="xl:col-span-2 space-y-4">
          {/* Guest Details */}
          <Card className="rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
            <div className="bg-primary/5 px-4 py-2.5 border-b border-primary/10 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Passenger / Guest Information</h3>
            </div>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase">Reservation Date</Label>
                  <DatePicker 
                    value={formData.reservationDate} 
                    onChange={(v) => {
                      setFormData({...formData, reservationDate: v});
                      if (selectedRouteId) {
                        const route = routes.find(r => r.id === selectedRouteId);
                        if (route) {
                          const prefilled = generateMovementsFromSelectedRoute(route, v);
                          setFormData(prev => ({ ...prev, movementDetails: prefilled }));
                        }
                      }
                    }}
                    className="h-10 text-xs"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase">Guest / Group Name *</Label>
                  <Input 
                    placeholder="Enter Lead Guest Name" 
                    value={formData.guestName} 
                    onChange={(e) => setFormData({...formData, guestName: e.target.value})}
                    className="h-10 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase">Guest Mobile</Label>
                  <Input 
                    placeholder="Mobile (+966 / +91)" 
                    value={formData.guestMobile} 
                    onChange={(e) => setFormData({...formData, guestMobile: e.target.value})}
                    className="h-10 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase">Group Code (Optional)</Label>
                  <Input 
                    placeholder="e.g. GRP-1001" 
                    value={formData.groupCode} 
                    onChange={(e) => setFormData({...formData, groupCode: e.target.value.replace(/\s+/g, '')})}
                    className="h-10 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase">Pax Count</Label>
                  <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200 h-10">
                    <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, paxCount: Math.max(1, formData.paxCount - 1)})} className="h-7 w-7"><Minus className="h-3.5 w-3.5" /></Button>
                    <span className="flex-1 text-center font-bold text-xs">{formData.paxCount} PAX</span>
                    <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, paxCount: formData.paxCount + 1})} className="h-7 w-7"><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                {/* Show Umrah Company & Agent dropdowns only for Admin/Staff */}
                {!isAgency && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-gray-600 uppercase">Umrah Company</Label>
                      <SearchableSelect
                        options={umrahCompanies.map(p => ({ value: p.id, label: p.partyName }))}
                        value={formData.umrahCompanyId}
                        onValueChange={(v) => setFormData({...formData, umrahCompanyId: v})}
                        placeholder="Select Company"
                        searchPlaceholder="Search..."
                        className="h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-gray-600 uppercase">Agent (Party)</Label>
                      <SearchableSelect
                        options={parties.map(p => ({ value: p.id, label: p.partyName }))}
                        value={formData.partyId}
                        onValueChange={(v) => setFormData({...formData, partyId: v})}
                        placeholder="Select Agent"
                        searchPlaceholder="Search..."
                        className="h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-gray-600 uppercase">Transport Supplier</Label>
                      <SearchableSelect
                        options={transportCompanies.map(p => ({ value: p.id, label: p.partyName }))}
                        value={formData.transportCompanyId}
                        onValueChange={(v) => setFormData({...formData, transportCompanyId: v})}
                        placeholder="Select Supplier"
                        searchPlaceholder="Search..."
                        className="h-10 text-xs"
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Movement Details Table */}
          <Card className="rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
            <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sky-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Movement Itinerary & Legs</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono px-2 py-0.5 rounded-full border border-sky-400/30">
                  {formData.movementDetails.length} Segments
                </span>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={addMovementDetail} 
                className="h-7 px-3 rounded-md bg-sky-500 text-white font-bold text-[10px] uppercase hover:bg-sky-600 transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Segment
              </Button>
            </div>
            <CardContent className="p-0 bg-white">
              <div className="overflow-x-auto">
                <MovementsTable 
                  movements={formData.movementDetails as any} 
                  onUpdateMovement={updateMovementDetail as any} 
                  onRemoveMovement={removeMovementDetail} 
                  onAddMovement={(idx) => {
                    const newMovements = [...formData.movementDetails];
                    newMovements.splice(idx + 1, 0, {
                      sr: newMovements.length + 1,
                      route: '',
                      date: formData.reservationDate,
                      time: '20:30',
                      from: '',
                      fromLocationId: '',
                      to: '',
                      toLocationId: '',
                      fromLocation: '',
                      toLocation: '',
                    });
                    setFormData({...formData, movementDetails: newMovements});
                  }}
                  locationMasters={locations} 
                />
              </div>
              <div className="p-3 border-t border-slate-100 flex justify-center bg-slate-50/50">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addMovementDetail}
                  className="h-8 px-5 rounded-full border border-dashed border-slate-300 text-slate-600 font-bold text-[10px] uppercase hover:bg-white hover:text-sky-600 hover:border-sky-300 transition-all"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Additional Leg
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Flight Details (Optional) */}
          <Card className="rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
            <div className="bg-primary/5 px-4 py-2 border-b border-primary/10 flex items-center gap-2">
              <Plane className="h-3.5 w-3.5 text-primary" />
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Flight Information (Optional)</h3>
            </div>
            <CardContent className="p-4">
              <TravelDetailsForm
                data={travelData}
                onChange={handleTravelDetailsChange}
                airports={airports}
                disabled={submitting || loadingMasters}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Route & Transport Vehicle Selector */}
        <div className="space-y-4">
          <Card className="rounded-xl border border-gray-200 shadow-md bg-white overflow-hidden sticky top-20">
            <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black text-primary uppercase tracking-wider">Route & Vehicle</h3>
              </div>
            </div>
            <CardContent className="p-4 space-y-4">
              {/* Route Type */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">1. Route Category</Label>
                <Select 
                  value={selectedRouteType} 
                  onValueChange={(v: any) => handleRouteTypeChange(v)}
                >
                  <SelectTrigger className="h-9 rounded-lg text-xs font-bold bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select Route Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="airporttocity" className="text-xs font-semibold">✈️ Airport Arrival Transfer (Entry)</SelectItem>
                    <SelectItem value="citytoairport" className="text-xs font-semibold">🛫 City to Airport (Exit)</SelectItem>
                    <SelectItem value="fulltrip" className="text-xs font-semibold">🔄 Full Trip (Complete Route)</SelectItem>
                    <SelectItem value="tripandtour" className="text-xs font-semibold">🕌 Ziyarath & Intercity Tour</SelectItem>
                    <SelectItem value="all" className="text-xs font-semibold">All Spectrum Routes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Specific Route Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">2. Selected Transport Sector</Label>
                <SearchableSelect
                  options={filteredRoutes.map(r => ({
                    value: r.id,
                    label: formatRouteDisplay(r)
                  }))}
                  value={selectedRouteId || ''}
                  onValueChange={(v) => handleRouteSelect(v)}
                  placeholder="Select route sector..."
                  searchPlaceholder="Search routes..."
                  className="h-10 rounded-lg text-xs font-bold border-gray-200"
                />
              </div>

              {/* Vehicle Options */}
              {selectedRouteId && (
                <div className="pt-3 border-t border-gray-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">3. Select Vehicle(s)</Label>
                    <span className="text-[10px] text-primary font-bold">
                      {formData.transportOptions.reduce((sum, o) => sum + o.quantity, 0)} Vehicle(s)
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {loadingTransports ? (
                      <div className="py-8 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="h-5 w-5 animate-spin mb-1 text-primary" />
                        <span className="text-[10px]">Loading vehicles...</span>
                      </div>
                    ) : transports.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                        No vehicle rates defined for this route sector.
                      </div>
                    ) : (
                      transports.map(t => {
                        const qty = formData.transportOptions.find(o => o.transportId === t.id)?.quantity || 0;
                        const isSelected = qty > 0;
                        return (
                          <div 
                            key={t.id} 
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-xl border transition-all",
                              isSelected 
                                ? "bg-primary/5 border-primary shadow-sm" 
                                : "bg-gray-50/70 border-gray-200 hover:border-gray-300"
                            )}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-900 uppercase truncate">
                                  {t.vehicleType?.vehicleName}
                                </span>
                                <span className="text-[9px] font-bold bg-white text-gray-600 px-1.5 py-0.5 rounded border">
                                  {t.vehicleType?.paxCount} PAX
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-primary mt-0.5">
                                {formatCurrency(Number(t.price), selectedPartyCurrency)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shrink-0">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 hover:text-rose-600" 
                                onClick={() => updateTransportQuantity(t.id, -1)}
                                disabled={qty === 0}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-xs font-black w-4 text-center">{qty}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 hover:text-emerald-600" 
                                onClick={() => updateTransportQuantity(t.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <Button 
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50" 
                  onClick={handleSubmit} 
                  disabled={submitting || formData.transportOptions.length === 0}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {isAgency ? 'Submit Transport Booking' : 'Finalize & Create Voucher'}
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full h-9 rounded-xl text-gray-500 font-bold uppercase text-[10px] hover:bg-rose-50 hover:text-rose-600" 
                  onClick={() => onSuccess()}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default QuickVoucherForm;
