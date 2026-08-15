'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { voucherAPI, cityMasterAPI, locationMasterAPI, transportRouteMasterAPI, transportMasterAPI, partyAPI } from '@/lib/api';
import { Loader2, Plus, Minus, Trash2, MapPin, Truck, Ticket, Users, User, Plane, Building, CheckCircle2 } from 'lucide-react';
import { MovementsTable } from '@/components/umrah-booking/components/MovementsTable';
import { TravelDetailsForm } from '@/components/umrah-booking/components/TravelDetailsForm';
import { HotelBookingTable } from '@/components/umrah-booking/components/HotelBookingTable';
import { Step2Data, HotelBooking } from '@/lib/umrah/types';
import { generateMovementsFromRoutes } from '@/lib/umrah/generateMovements';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { RouteType } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { fromDisplayDate, toDisplayDate, extractDateFromISO, extractTimeFromISO, combineDateAndTime, formatFlightNumber } from '@/lib/umrah/validation';

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
  const [ziyaraths, setZiyaraths] = useState<any[]>([]);
  
  // Route Selection
  const [selectedRouteType, setSelectedRouteType] = useState<RouteType | 'all'>('all');
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

  // Master Data
  const [parties, setParties] = useState<any[]>([]);
  const [umrahCompanies, setUmrahCompanies] = useState<any[]>([]);
  const [transportCompanies, setTransportCompanies] = useState<any[]>([]);
  const [allParties, setAllParties] = useState<any[]>([]);
  const [selectedPartyCurrency, setSelectedPartyCurrency] = useState<any>(null);

  // Update selected party currency when partyId changes
  useEffect(() => {
    if (formData.partyId) {
      const party = allParties.find(p => p.id === formData.partyId);
      if (party && party.accountCurrency) {
        setSelectedPartyCurrency(party.accountCurrency);
      } else {
        setSelectedPartyCurrency(null);
      }
    } else {
      setSelectedPartyCurrency(null);
    }
  }, [formData.partyId, allParties]);

  // Track manual edit state
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [lastGeneratedHash, setLastGeneratedHash] = useState('');

  // Reset manual edit flag on key dependency changes
  const prevDepsRef = useRef({
    flights: formData.flightDetails,
    hotels: formData.hotelSchedules,
    transport: formData.transportOptions,
    routeId: selectedRouteId,
  });

  useEffect(() => {
    const prev = prevDepsRef.current;
    const flightsChanged = JSON.stringify(prev.flights) !== JSON.stringify(formData.flightDetails);
    const hotelsChanged = JSON.stringify(prev.hotels) !== JSON.stringify(formData.hotelSchedules);
    const transportChanged = JSON.stringify(prev.transport) !== JSON.stringify(formData.transportOptions);
    const routeChanged = prev.routeId !== selectedRouteId;

    if (flightsChanged || hotelsChanged || transportChanged || routeChanged) {
      setIsManualEdit(false);
      prevDepsRef.current = {
        flights: formData.flightDetails,
        hotels: formData.hotelSchedules,
        transport: formData.transportOptions,
        routeId: selectedRouteId,
      };
    }
  }, [formData.flightDetails, formData.hotelSchedules, formData.transportOptions, selectedRouteId]);

  // Auto-generate movements based on hotels, flights, and transport options
  useEffect(() => {
    if (isManualEdit) return;

    // Do NOT clear movements if selectedRouteId is empty
    if (!selectedRouteId) {
      if (formData.movementDetails.length > 0) {
        setFormData(prev => ({ ...prev, movementDetails: [] }));
        setLastGeneratedHash('');
      }
      return;
    }

    const arrivalFlight = formData.flightDetails.find(f => f.type === 'AA');
    const departureFlight = formData.flightDetails.find(f => f.type === 'AD');
    const arrivalAirportId = arrivalFlight?.fromLocationId;
    const departureAirportId = departureFlight?.toLocationId;
    const arrivalDate = arrivalFlight?.date;
    const departureDate = departureFlight?.date;

    if (!arrivalAirportId || !departureAirportId || !arrivalDate || !departureDate) {
      return;
    }

    // Check if hotels are valid
    const areHotelsValid = formData.hotelSchedules.length > 0 && formData.hotelSchedules.every(
      h => h.locationId && h.checkIn && h.checkOut
    );

    if (!areHotelsValid) {
      return;
    }

    const selectedRoutes = routes.filter(r => r.id === selectedRouteId);

    if (selectedRoutes.length === 0) return;

    const findZiyarathByCity = (cityName: string) => {
      const normalizedCity = cityName.toLowerCase().trim();
      return ziyaraths.find((z: any) => 
        (z.city || '').toLowerCase().trim() === normalizedCity
      );
    };

    const hotelBookings = formData.hotelSchedules.map(h => ({
      hotelId: h.locationId || '',
      checkInDate: h.checkIn,
      checkOutDate: h.checkOut,
      cityId: h.cityId || '',
    }));

    const generated = generateMovementsFromRoutes({
      hotelBookings,
      arrivalAirportId,
      departureAirportId,
      arrivalDate,
      arrivalTime: arrivalFlight?.eta || '20:30',
      departureDate,
      departureTime: departureFlight?.etd || '20:30',
      locationMasters: locations,
      findZiyarathByCity,
      selectedRoutes,
    });

    const movementsHash = JSON.stringify(generated.map(m => 
      `${m.type}-${m.fromLocationId}-${m.toLocationId}-${m.date}-${m.time}`
    ));

    if (movementsHash !== lastGeneratedHash) {
      const mapped = generated.map((m, index) => {
        const fromLoc = locations.find(l => l.id === m.fromLocationId);
        const toLoc = locations.find(l => l.id === m.toLocationId);
        return {
          sr: index + 1,
          route: '',
          date: m.date,
          time: m.time,
          fromCityId: fromLoc?.cityMaster?.id || fromLoc?.cityId || '',
          from: fromLoc?.city || fromLoc?.cityMaster?.name || '',
          fromLocationId: m.fromLocationId,
          fromLocation: fromLoc?.name || '',
          toCityId: toLoc?.cityMaster?.id || toLoc?.cityId || '',
          to: toLoc?.city || toLoc?.cityMaster?.name || '',
          toLocationId: m.toLocationId,
          toLocation: toLoc?.name || '',
          paxCount: m.paxCount || formData.paxCount,
          price: m.price || 0,
          vehicleType: m.vehicleType || '',
        };
      });

      setLastGeneratedHash(movementsHash);
      setFormData(prev => ({ ...prev, movementDetails: mapped }));
    }
  }, [
    formData.flightDetails,
    formData.hotelSchedules,
    routes,
    locations,
    ziyaraths,
    isManualEdit,
    lastGeneratedHash,
    selectedRouteId,
  ]);

  // Load Master Data
  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      setLoadingMasters(true);
      const [citiesRes, locationsRes, routesRes, partiesRes] = await Promise.all([
        cityMasterAPI.getActive(),
        locationMasterAPI.getActive(),
        transportRouteMasterAPI.getActive(),
        partyAPI.getAll({ limit: '1000' }),
      ]);
      
      const citiesData = citiesRes.data?.cityMasters || citiesRes.data || [];
      const locationsData = locationsRes.data?.locationMasters || locationsRes.data || [];
      const routesData = routesRes.data?.transportRouteMasters || routesRes.data || [];
      const partiesData = partiesRes.data?.data?.parties || partiesRes.data?.parties || [];
      
      setCities(citiesData);
      setLocations(locationsData);
      setRoutes(routesData);
      setAllParties(partiesData);
      
      // Regular agents (isCustomer true)
      setParties(partiesData.filter((p: any) => p.isCustomer));
      
      // Suppliers
      const suppliers = partiesData.filter((p: any) => p.isSupplier);
      
      setUmrahCompanies(suppliers.filter((p: any) => {
        const types = p.supplierServiceTypes || [];
        return Array.isArray(types) && types.includes('umrah_service');
      }));
      
      setTransportCompanies(suppliers.filter((p: any) => {
        const types = p.supplierServiceTypes || [];
        return Array.isArray(types) && types.includes('transport_service');
      }));
      
      // Group locations by city and type
      const locationsByCityMap = new Map<string, any[]>();
      const hotelsByCityMap = new Map<string, any[]>();
      const airportsList: any[] = [];
      const ziyarathsList: any[] = [];
      
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
        } else if (loc.locationType === 'ZIYARAT') {
          ziyarathsList.push(loc);
        }
      });
      
      setLocationsByCity(locationsByCityMap);
      setHotelsByCity(hotelsByCityMap);
      setAirports(airportsList);
      setZiyaraths(ziyarathsList);
    } catch (error) {
      console.error('Error loading master data:', error);
      toast.error('Failed to load master data');
    } finally {
      setLoadingMasters(false);
    }
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
      } catch (error: any) {
        console.error('Error loading transports:', error);
        toast.error('Failed to load transport vehicles');
        setTransports([]);
      } finally {
        setLoadingTransports(false);
      }
    };

    loadTransportsForRoute();
  }, [selectedRouteId]);

  // Helper functions

  const getHotelsForCity = (cityName: string) => {
    if (!cityName) return [];
    const cityKey = cityName.toLowerCase().trim();
    return hotelsByCity.get(cityKey) || [];
  };

  const findZiyarathByCity = (cityName: string) => {
    const normalizedCity = cityName.toLowerCase().trim();
    return ziyaraths.find((z: any) => 
      (z.city || '').toLowerCase().trim() === normalizedCity
    );
  };

  // Helper: Check if a city is Makkah or Madinah
  const isZiyarathCity = (cityName: string): boolean => {
    const normalized = cityName.toLowerCase().trim();
    return normalized === 'makkah' || normalized === 'madinah' || normalized === 'madina';
  };

  // Helper: Find city center location for a city
  const getCityCenterForCity = (cityName: string) => {
    const normalizedCity = cityName.toLowerCase().trim();
    return locations.find((loc: any) => {
      const locCity = (loc.city || loc.cityMaster?.name || '').toLowerCase().trim();
      const locName = (loc.name || '').toLowerCase();
      return locCity === normalizedCity && 
             (locName.includes('city center') || loc.code?.endsWith('CC'));
    });
  };

  const calculateDays = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Time calculation helpers
  const subtractHours = (timeString: string, hours: number): string => {
    if (!timeString) return '20:30';
    const [h, m] = timeString.split(':').map(Number);
    let totalMinutes = h * 60 + m;
    totalMinutes -= hours * 60;
    
    // Handle negative (previous day)
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; // Add 24 hours
    }
    
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const calculateZiyarathDate = (checkInDate: string): string => {
    try {
      const isoDate = fromDisplayDate(checkInDate);
      if (!isoDate || !isoDate.includes('-')) return '';
      const parts = isoDate.split('-');
      const base = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
      if (isNaN(base.getTime())) return '';
      
      base.setUTCDate(base.getUTCDate() + 2);
      // Skip Friday (day 5) -> move to Saturday (day 6)
      if (base.getUTCDay() === 5) {
        base.setUTCDate(base.getUTCDate() + 1);
      }
      return base.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const calculateMovementTime = (
    fromCity: string,
    toLocation: string,
    departureFlightTime?: string
  ): string => {
    if (!departureFlightTime) return '20:30';
    
    const fromCityLower = fromCity.toLowerCase().trim();
    const toLocationLower = toLocation.toLowerCase().trim();
    
    // Makkah city to Jeddah airport: 6 hours prior
    if (fromCityLower === 'makkah' && toLocationLower.includes('jeddah') && toLocationLower.includes('airport')) {
      return subtractHours(departureFlightTime, 6);
    }
    
    // Makkah city to airport: 12 hours prior
    if (fromCityLower === 'makkah' && toLocationLower.includes('airport')) {
      return subtractHours(departureFlightTime, 12);
    }
    
    // Madina city to Medina airport: 15 hours prior
    if ((fromCityLower === 'madinah' || fromCityLower === 'madina') && toLocationLower.includes('medina') && toLocationLower.includes('airport')) {
      return subtractHours(departureFlightTime, 15);
    }
    
    // Makkah city to Madina airport: 12 hours prior
    if (fromCityLower === 'makkah' && (toLocationLower.includes('madinah') || toLocationLower.includes('madina'))) {
      return subtractHours(departureFlightTime, 12);
    }
    
    return '20:30';
  };


  // Format route display
  const formatRouteDisplay = (route: any): string => {
    if (!route) return 'No Route';
    
    const cities = [
      route.city1?.name || (route.city1Id ? 'City 1' : null),
      route.city2?.name || (route.city2Id ? 'City 2' : null),
      route.city3?.name || (route.city3Id ? 'City 3' : null),
      route.city4?.name || (route.city4Id ? 'City 4' : null),
    ].filter(Boolean);
    
    if (cities.length === 0) return `Route (${route.routeType || 'Custom'})`;
    return cities.join(' → ');
  };

  // Generate movements based on route type
  const generateMovementsForRoute = (
    route: any,
    routeCities: any[],
    arrivalDate: string,
    departureDate: string,
    arrivalFlightData?: FlightDetail,
    departureFlightData?: FlightDetail
  ): { movements: MovementDetail[]; hotels: HotelSchedule[] } => {
    const movements: MovementDetail[] = [];
    let movementIndex = 0;
    let hotels: HotelSchedule[] = [];
    const routeType = route.routeType;

    if (routeType === 'fulltrip') {
      // Full trip: Airport → Hotel 1 → Ziyarath 1 → Hotel 2 → Ziyarath 2 → Airport
      const totalDays = calculateDays(arrivalDate, departureDate);
      const daysPerCity = Math.floor(totalDays / Math.max(routeCities.length - 1, 1));

      // Hotels for middle cities only (exclude first and last)
      const hotelCities = routeCities.length >= 3
        ? routeCities.slice(1, -1)
        : [];

      hotels = hotelCities.map((city: any, idx: number) => {
        const arrivalISO = fromDisplayDate(arrivalDate);
        if (!arrivalISO || !arrivalISO.includes('-')) {
           return {
            number: idx + 1,
            cityId: city.id,
            cityName: city.name,
            locationId: '',
            location: city.name,
            hotelName: '',
            checkIn: '',
            checkOut: '',
            days: 0,
          };
        }
        
        const arrivalParts = arrivalISO.split('-');
        const checkInDate = new Date(Date.UTC(parseInt(arrivalParts[0]), parseInt(arrivalParts[1]) - 1, parseInt(arrivalParts[2])));
        
        if (isNaN(checkInDate.getTime())) {
          return {
            number: idx + 1,
            cityId: city.id,
            cityName: city.name,
            locationId: '',
            location: city.name,
            hotelName: '',
            checkIn: '',
            checkOut: '',
            days: 0,
          };
        }

        checkInDate.setUTCDate(checkInDate.getUTCDate() + (idx * daysPerCity));
        const checkOutDate = new Date(checkInDate.getTime());
        checkOutDate.setUTCDate(checkOutDate.getUTCDate() + daysPerCity);

        return {
          number: idx + 1,
          cityId: city.id,
          cityName: city.name,
          locationId: '',
          location: city.name,
          hotelName: '',
          checkIn: checkInDate.toISOString().split('T')[0],
          checkOut: checkOutDate.toISOString().split('T')[0],
          days: daysPerCity,
        };
      });

      // 1) Arrival airport → first hotel
      const arrivalAirportId = arrivalFlightData?.fromLocationId;
      if (arrivalAirportId && hotels.length > 0) {
        const arrivalAirport = airports.find(a => a.id === arrivalAirportId);
        const firstHotel = hotels[0];
        
        if (arrivalAirport && firstHotel.cityId && firstHotel.cityName) {
          movements.push({
            sr: movementIndex + 1,
            route: '',
            date: arrivalDate,
            time: arrivalFlightData?.etd ? subtractHours(arrivalFlightData.etd, 1) : '20:30',
            fromCityId: arrivalAirport.cityId,
            from: arrivalAirport.city || '',
            fromLocationId: arrivalAirport.id,
            fromLocation: arrivalAirport.name || '',
            toCityId: firstHotel.cityId,
            to: firstHotel.cityName,
            toLocationId: '',
            toLocation: '',
          });
          movementIndex++;
        }
      }

      // 2) For each hotel: Hotel → Ziyarath (if applicable) → Next Hotel
      for (let i = 0; i < hotels.length; i++) {
        const currentHotel = hotels[i];
        const isLastHotel = i === hotels.length - 1;
        
        if (!currentHotel.cityName) continue;

        const hasZiyarath = isZiyarathCity(currentHotel.cityName);
        const ziyarathLocation = hasZiyarath ? findZiyarathByCity(currentHotel.cityName) : null;
        
        if (hasZiyarath && ziyarathLocation && currentHotel.checkIn) {
          const ziyarathDate = calculateZiyarathDate(currentHotel.checkIn);
          const ziyarathTime = currentHotel.cityName.toLowerCase().trim() === 'makkah' ? '08:00' : '14:00';
          
          movements.push({
            sr: movementIndex + 1,
            route: '',
            date: ziyarathDate,
            time: ziyarathTime,
            fromCityId: currentHotel.cityId,
            from: currentHotel.cityName,
            fromLocationId: '',
            fromLocation: '',
            toCityId: currentHotel.cityId,
            to: currentHotel.cityName,
            toLocationId: ziyarathLocation.id,
            toLocation: ziyarathLocation.name,
          });
          movementIndex++;
        }

        // Move to next hotel
        if (!isLastHotel) {
          const nextHotel = hotels[i + 1];
          if (nextHotel.cityId && nextHotel.cityName) {
            const movementDate = hasZiyarath && currentHotel.checkIn 
              ? calculateZiyarathDate(currentHotel.checkIn)
              : currentHotel.checkOut || arrivalDate;
            
            movements.push({
              sr: movementIndex + 1,
              route: '',
              date: movementDate,
              time: '20:30',
              fromCityId: currentHotel.cityId,
              from: currentHotel.cityName,
              fromLocationId: '',
              fromLocation: '',
              toCityId: nextHotel.cityId,
              to: nextHotel.cityName,
              toLocationId: '',
              toLocation: '',
            });
            movementIndex++;
          }
        }
      }

      // 3) Last hotel → departure airport
      const departureAirportId = departureFlightData?.toLocationId;
      if (departureAirportId && hotels.length > 0) {
        const departureAirport = airports.find(a => a.id === departureAirportId);
        const lastHotel = hotels[hotels.length - 1];
        const departureTime = departureFlightData?.etd || '20:30';
        
        if (departureAirport && lastHotel.cityId && lastHotel.cityName) {
          movements.push({
            sr: movementIndex + 1,
            route: '',
            date: departureDate,
            time: calculateMovementTime(lastHotel.cityName || '', departureAirport.name || '', departureTime),
            fromCityId: lastHotel.cityId,
            from: lastHotel.cityName || '',
            fromLocationId: '',
            fromLocation: '',
            toCityId: departureAirport.cityId,
            to: departureAirport.city || '',
            toLocationId: departureAirport.id,
            toLocation: departureAirport.name || '',
          });
          movementIndex++;
        }
      }
    } else if (routeType === 'airporttocity') {
      // Airport to City: Airport → City Center
      const arrivalAirportId = arrivalFlightData?.fromLocationId;
      const destinationCity = routeCities[1];
      
      if (arrivalAirportId && destinationCity) {
        const arrivalAirport = airports.find(a => a.id === arrivalAirportId);
        const cityCenter = getCityCenterForCity(destinationCity.name);
        
        if (arrivalAirport && cityCenter) {
          movements.push({
            sr: movementIndex + 1,
            route: '',
            date: arrivalDate,
            time: arrivalFlightData?.etd ? subtractHours(arrivalFlightData.etd, 1) : '20:30',
            fromCityId: arrivalAirport.cityId,
            from: arrivalAirport.city || '',
            fromLocationId: arrivalAirport.id,
            fromLocation: arrivalAirport.name || '',
            toCityId: destinationCity.id,
            to: destinationCity.name,
            toLocationId: cityCenter.id,
            toLocation: cityCenter.name,
          });
        }
      }
    } else if (routeType === 'citytocity') {
      // City to City: City Center → City Center
      const sourceCity = routeCities[0];
      const destinationCity = routeCities[1];
      
      if (sourceCity && destinationCity) {
        const sourceCityCenter = getCityCenterForCity(sourceCity.name);
        const destCityCenter = getCityCenterForCity(destinationCity.name);
        
        if (sourceCityCenter && destCityCenter) {
          movements.push({
            sr: movementIndex + 1,
            route: '',
            date: arrivalDate,
            time: '20:30',
            fromCityId: sourceCity.id,
            from: sourceCity.name,
            fromLocationId: sourceCityCenter.id,
            fromLocation: sourceCityCenter.name,
            toCityId: destinationCity.id,
            to: destinationCity.name,
            toLocationId: destCityCenter.id,
            toLocation: destCityCenter.name,
          });
        }
      }
    } else if (routeType === 'citytoairport') {
      // City to Airport: City Center → Airport
      const sourceCity = routeCities[0];
      const departureAirportId = departureFlightData?.toLocationId;
      
      if (sourceCity && departureAirportId) {
        const sourceCityCenter = getCityCenterForCity(sourceCity.name);
        const departureAirport = airports.find(a => a.id === departureAirportId);
        const departureTime = departureFlightData?.etd || '20:30';
        
        if (sourceCityCenter && departureAirport) {
          movements.push({
            sr: movementIndex + 1,
            route: '',
            date: departureDate,
            time: calculateMovementTime(sourceCity.name, departureAirport.name || '', departureTime),
            fromCityId: sourceCity.id,
            from: sourceCity.name,
            fromLocationId: sourceCityCenter.id,
            fromLocation: sourceCityCenter.name,
            toCityId: departureAirport.cityId,
            to: departureAirport.city || '',
            toLocationId: departureAirport.id,
            toLocation: departureAirport.name || '',
          });
        }
      }
    }

    return { movements, hotels };
  };

  // Auto-prefill from route
  const handleRouteSelect = (routeId: string) => {
    const route = routes.find((r: any) => r.id === routeId);
    if (!route) return;

    setSelectedRouteId(routeId);

    // Extract cities from route
    const routeCities = [
      route.city1,
      route.city2,
      route.city3,
      route.city4,
    ].filter(Boolean);

    if (routeCities.length < 2) {
      toast.error('Route must have at least 2 cities');
      return;
    }

    // Get arrival and departure dates from flights
    const arrivalFlightData = formData.flightDetails.find(f => f.type === 'AA');
    const departureFlightData = formData.flightDetails.find(f => f.type === 'AD');
    const arrivalDate = arrivalFlightData?.date || formData.reservationDate;
    const departureDate = departureFlightData?.date || formData.reservationDate;

    // Generate movements and hotels
    const { movements, hotels } = generateMovementsForRoute(
      route,
      routeCities,
      arrivalDate,
      departureDate,
      arrivalFlightData,
      departureFlightData
    );

    // Update form data
    setFormData(prev => ({
      ...prev,
      hotelSchedules: hotels,
      movementDetails: movements,
    }));

    toast.success('Route pre-filled successfully');
  };

  const handleSubmit = async () => {
    if (!formData.guestName || !formData.paxCount) {
      toast.error('Guest name and passenger count are required');
      return;
    }

    if (!formData.transportCompanyId) {
      toast.error('Please select a Transport Company');
      return;
    }

    if (formData.transportOptions.length === 0) {
      toast.error('At least one transportation option must be selected');
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
        hotelSchedules: formData.hotelSchedules.map((hs, idx) => ({
          number: idx + 1,
          location: hs.cityName || hs.location || '', // City name (CityMaster)
          hotelName: hs.hotelName || '', // Hotel name (LocationMaster)
          checkIn: fromDisplayDate(hs.checkIn),
          checkOut: fromDisplayDate(hs.checkOut),
          days: calculateDays(fromDisplayDate(hs.checkIn), fromDisplayDate(hs.checkOut)),
          brn: hs.brn || null,
          cateringBrn: hs.cateringBrn || null,
        })),
        movementDetails: formData.movementDetails.map(m => ({
          sr: m.sr,
          route: null, // Backend will generate route numbers dynamically
          date: fromDisplayDate(m.date),
          time: m.time,
          from: m.from || '',
          fromLocation: m.fromLocation || '',
          fromLocationId: m.fromLocationId || null,
          to: m.to || '',
          toLocation: m.toLocation || '',
          toLocationId: m.toLocationId || null,
          driverDetails1: m.driverDetails1 || null,
          driverDetails2: m.driverDetails2 || null,
          vehicleNumber: m.vehicleNumber || null,
        })),
        flightDetails: formData.flightDetails.filter(f => {
          const isAA = f.type === 'AA';
          const hubId = isAA ? f.fromLocationId : f.toLocationId;
          const time = isAA ? f.eta : f.etd;
          return !!(hubId || f.carrier || f.number || f.date || time);
        }).map(f => {
          // Get airport name from locations array using the location ID
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
            // For AA: from is arrival airport name, to is JED; For AD: from is JED, to is departure airport name
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

      toast.success('Quick voucher created successfully');
      onSuccess();
      
      // Reset form
      setFormData({
        reservationDate: toDisplayDate(new Date().toISOString().split('T')[0]),
        guestName: '',
        guestMobile: '',
        groupCode: '',
        partyId: '',
        umrahCompanyId: '',
        transportCompanyId: '',
        paxCount: 1,
        hotelSchedules: [],
        movementDetails: [],
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
        ],
        transportOptions: [],
      });
      setSelectedRouteId(null);
      setSelectedRouteType('all');
    } catch (error: any) {
      console.error('Error creating quick voucher:', error);
      toast.error(error?.response?.data?.error || 'Failed to create quick voucher');
    } finally {
      setSubmitting(false);
    }
  };

  // Movement functions
  const addMovementDetail = () => {
    setIsManualEdit(true);
    const newIndex = formData.movementDetails.length;
    setFormData(prev => ({
      ...prev,
      movementDetails: [
        ...prev.movementDetails,
        {
          sr: newIndex + 1,
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
        },
      ],
    }));
  };

  const removeMovementDetail = (index: number) => {
    setIsManualEdit(true);
    const updated = formData.movementDetails.filter((_, i) => i !== index);
    updated.forEach((m, idx) => {
      m.sr = idx + 1;
    });
    setFormData(prev => ({ ...prev, movementDetails: updated }));
  };

  const updateMovementDetail = (index: number, field: keyof MovementDetail, value: any) => {
    setIsManualEdit(true);
    const updated = [...formData.movementDetails];
    updated[index] = { ...updated[index], [field]: value };
    
    // When from city changes, update location options
    if (field === 'from') {
      const cityKey = value.toLowerCase().trim();
      const cityLocations = locationsByCity.get(cityKey) || [];
      if (cityLocations.length > 0) {
        updated[index].fromLocationId = cityLocations[0].id;
        updated[index].fromLocation = cityLocations[0].name;
      } else {
        updated[index].fromLocationId = '';
        updated[index].fromLocation = '';
      }
    }
    
    // When to city changes, update location options
    if (field === 'to') {
      const cityKey = value.toLowerCase().trim();
      const cityLocations = locationsByCity.get(cityKey) || [];
      if (cityLocations.length > 0) {
        updated[index].toLocationId = cityLocations[0].id;
        updated[index].toLocation = cityLocations[0].name;
      } else {
        updated[index].toLocationId = '';
        updated[index].toLocation = '';
      }
    }
    
    // When location changes, update display
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
      } else {
        if (field === 'fromLocationId') {
          updated[index].fromLocation = '';
          updated[index].from = '';
          updated[index].fromCityId = '';
        } else {
          updated[index].toLocation = '';
          updated[index].to = '';
          updated[index].toCityId = '';
        }
      }
    }
    
    setFormData(prev => ({ ...prev, movementDetails: updated }));
  };



  // Transport functions
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
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
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

  const hotelBookings: HotelBooking[] = formData.hotelSchedules.map((hs, idx) => {
    let cityId = hs.cityId || '';
    if (!cityId && hs.cityName) {
      const matchedCity = cities.find(c => c.name.toLowerCase() === hs.cityName!.toLowerCase());
      if (matchedCity) cityId = matchedCity.id;
    }
    
    let hotelId = hs.locationId || '';
    if (!hotelId && hs.hotelName) {
      const matchedHotel = locations.find(l => l.name.toLowerCase() === hs.hotelName.toLowerCase() && l.locationType === 'HOTEL');
      if (matchedHotel) hotelId = matchedHotel.id;
    }

    return {
      id: String(idx),
      cityId,
      hotelId,
      checkInDate: hs.checkIn,
      checkOutDate: hs.checkOut,
      brn: hs.brn ? hs.brn.split(',').map(s => s.trim()).filter(Boolean) : [],
      cateringBrn: hs.cateringBrn ? hs.cateringBrn.split(',').map(s => s.trim()).filter(Boolean) : [],
    };
  });

  const handleHotelBookingsChange = (bookings: HotelBooking[]) => {
    const updatedSchedules: HotelSchedule[] = bookings.map((b, idx) => {
      const city = cities.find(c => c.id === b.cityId);
      const hotel = locations.find(l => l.id === b.hotelId);
      
      return {
        number: idx + 1,
        cityId: b.cityId,
        cityName: city ? city.name : '',
        city: city ? city.name : '',
        locationId: b.hotelId,
        location: city ? city.name : '',
        hotelName: hotel ? hotel.name : '',
        checkIn: b.checkInDate,
        checkOut: b.checkOutDate,
        days: calculateDays(b.checkInDate, b.checkOutDate),
        brn: b.brn ? b.brn.join(', ') : '',
        cateringBrn: b.cateringBrn ? b.cateringBrn.join(', ') : '',
      };
    });
    setFormData({ ...formData, hotelSchedules: updatedSchedules });
  };

  const updateHotelBooking = (index: number, field: keyof HotelBooking, value: any) => {
    const updatedBookings = [...hotelBookings];
    updatedBookings[index] = { ...updatedBookings[index], [field]: value };
    handleHotelBookingsChange(updatedBookings);
  };

  const addHotelBooking = () => {
    const updatedBookings = [...hotelBookings, {
      cityId: '',
      hotelId: '',
      checkInDate: '',
      checkOutDate: '',
      brn: [],
      cateringBrn: [],
    }];
    handleHotelBookingsChange(updatedBookings);
  };

  const removeHotelBooking = (index: number) => {
    const updatedBookings = hotelBookings.filter((_, i) => i !== index);
    handleHotelBookingsChange(updatedBookings);
  };

  const mappedLocations = cities.map((city: any) => ({
    id: city.id,
    destinationCode: city.name.substring(0, 3).toUpperCase(),
    destinationName: city.name,
    city: city.name,
    cityId: city.id,
    country: city.country?.countryName || 'Saudi Arabia',
    isActive: city.isActive,
  }));

  const mappedHotels = locations.filter(l => l.locationType === 'HOTEL').map((hotel: any) => ({
    id: hotel.id,
    name: hotel.name,
    hotelName: hotel.name,
    code: hotel.code,
    cityId: hotel.cityId,
    city: hotel.cityMaster || { id: hotel.cityId, name: hotel.city },
  }));

  const getHotelsForLocation = (cityId: string) => {
    return mappedHotels.filter(h => h.cityId === cityId);
  };

  const refreshHotels = async () => {
    await loadMasterData();
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header Section */}
      <div className="flex items-center gap-3 border-b border-secondary/20 pb-3">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-md">
          <Ticket className="h-4 w-4" />
        </div>
        <h2 className="text-lg font-bold text-primary uppercase tracking-tight">Create Voucher</h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 space-y-4">
          {/* Guest Details */}
          <Card className="rounded-xl border-secondary/10 shadow-sm bg-white overflow-hidden">
            <div className="bg-primary/5 px-4 py-2 border-b border-secondary/10 flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-primary" />
              <h3 className="text-[11px] font-bold text-primary uppercase tracking-wider">Guest Details</h3>
            </div>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground ml-0.5 uppercase tracking-wider">Reservation Date</Label>
                  <DatePicker 
                    value={formData.reservationDate} 
                    onChange={(v) => setFormData({...formData, reservationDate: v})}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-[11px] font-bold text-muted-foreground ml-0.5 uppercase tracking-wider">Guest Name</Label>
                  <Input 
                    placeholder="Enter Guest Name" 
                    value={formData.guestName} 
                    onChange={(e) => setFormData({...formData, guestName: e.target.value})}
                    className="h-11 rounded-md border-gray-200 text-sm focus:ring-secondary/20"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground ml-0.5 uppercase tracking-wider">Guest Mobile</Label>
                  <Input 
                    placeholder="Mobile Number" 
                    value={formData.guestMobile} 
                    onChange={(e) => setFormData({...formData, guestMobile: e.target.value})}
                    className="h-11 rounded-md border-gray-200 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground ml-0.5 uppercase tracking-wider">Pax Count</Label>
                  <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-md border border-gray-100 h-11">
                    <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, paxCount: Math.max(1, formData.paxCount - 1)})} className="h-8 w-8 rounded-sm"><Minus className="h-4 w-4" /></Button>
                    <span className="flex-1 text-center font-bold text-sm">{formData.paxCount}</span>
                    <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, paxCount: formData.paxCount + 1})} className="h-8 w-8 rounded-sm"><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
                
                {/* New Company Selections */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground ml-0.5 uppercase tracking-wider">Umrah Company</Label>
                  <Select value={formData.umrahCompanyId} onValueChange={(v) => setFormData({...formData, umrahCompanyId: v})}>
                    <SelectTrigger className="h-11 rounded-md border-gray-200 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {umrahCompanies.map(p => <SelectItem key={p.id} value={p.id} className="text-sm">{p.partyName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground ml-0.5 uppercase tracking-wider">Agent (Party)</Label>
                  <Select value={formData.partyId} onValueChange={(v) => setFormData({...formData, partyId: v})}>
                    <SelectTrigger className="h-11 rounded-md border-gray-200 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {parties.map(p => <SelectItem key={p.id} value={p.id} className="text-sm">{p.partyName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground ml-0.5 uppercase tracking-wider">Transport Co.</Label>
                  <Select value={formData.transportCompanyId} onValueChange={(v) => setFormData({...formData, transportCompanyId: v})}>
                    <SelectTrigger className="h-11 rounded-md border-gray-200 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {transportCompanies.map(p => <SelectItem key={p.id} value={p.id} className="text-sm">{p.partyName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {/* Flight Details */}
            <Card className="rounded-xl border-secondary/10 shadow-sm bg-white overflow-hidden">
              <div className="bg-primary/5 px-4 py-2.5 border-b border-secondary/10 flex items-center gap-2">
                <Plane className="h-3.5 w-3.5 text-primary" />
                <h3 className="text-[11px] font-bold text-primary uppercase tracking-wider">Flight & Travel Details</h3>
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

            {/* Hotel Schedule */}
            <Card className="rounded-xl border-secondary/10 shadow-sm bg-white overflow-hidden">
              <div className="px-4 py-2 border-b border-secondary/10 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-2">
                  <Building className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Hotel Stay Schedule</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addHotelBooking} 
                  className="h-7 px-3 rounded-md border-secondary/20 text-primary font-bold text-[9px] uppercase hover:bg-secondary transition-all"
                  disabled={submitting || loadingMasters}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Stay
                </Button>
              </div>
              <CardContent className="p-0">
                <HotelBookingTable
                  hotelBookings={hotelBookings}
                  locations={mappedLocations}
                  hotels={mappedHotels}
                  getHotelsForLocation={getHotelsForLocation}
                  onUpdateBooking={updateHotelBooking}
                  onRemoveBooking={removeHotelBooking}
                  onAddBooking={addHotelBooking}
                  disabled={submitting || loadingMasters}
                  showAddButton={false}
                  arrivalDate={arrivalFlight.date}
                  departureDate={departureFlight.date}
                  onHotelsRefresh={refreshHotels}
                  hideInventory={true}
                />
              </CardContent>
            </Card>

            {/* Movement Details */}
            <Card className="rounded-xl border-secondary/10 shadow-sm bg-white overflow-hidden">
              <div className="bg-[#0f172a] px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-sky-400" />
                  <span className="text-[11px] font-extrabold text-white uppercase tracking-widest">Movement & Itinerary</span>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={addMovementDetail} 
                  className="h-8 px-4 rounded-md border-none bg-sky-500 text-white font-bold text-[10px] uppercase hover:bg-sky-600 transition-all shadow-md active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Movement
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
                        date: '',
                        time: '',
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
                <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50/50">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addMovementDetail}
                    className="h-9 px-6 rounded-full border-2 border-dashed border-slate-300 text-slate-600 font-bold text-[11px] uppercase hover:bg-white hover:text-sky-600 hover:border-sky-300 transition-all group"
                  >
                    <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" /> Add Trip Segment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-4">
          <Card className="rounded-xl border-secondary/10 shadow-sm bg-white overflow-hidden">
            <div className="px-4 py-2 border-b border-secondary/10 bg-primary/5">
              <div className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-primary" />
                <h3 className="text-[11px] font-bold text-primary uppercase tracking-wider">Transport</h3>
              </div>
            </div>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-0.5">Route Type</Label>
                <Select value={selectedRouteType} onValueChange={(v: any) => { setSelectedRouteType(v); setSelectedRouteId(null); }}>
                  <SelectTrigger className="h-8 rounded-lg text-[10px] font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="text-[9px] uppercase">
                    <SelectItem value="all">All Spectrum</SelectItem>
                    <SelectItem value="fulltrip">Full Mission</SelectItem>
                    <SelectItem value="airporttocity">Airport Entry</SelectItem>
                    <SelectItem value="citytoairport">City Exit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-0.5">Select Route</Label>
                <Select value={selectedRouteId || ''} onValueChange={(v) => { handleRouteSelect(v); setFormData(prev => ({...prev, transportOptions: []})); }}>
                  <SelectTrigger className="h-8 rounded-lg text-[10px] font-bold w-full overflow-hidden truncate">
                    <SelectValue placeholder="Target Sector" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[300px]">
                    {filteredRoutes.map(r => (
                      <SelectItem key={r.id} value={r.id} className="text-[10px] leading-tight py-2">
                        {formatRouteDisplay(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRouteId && (
                <div className="pt-3 border-t border-gray-50 space-y-2">
                  <p className="text-[9px] font-bold text-primary uppercase">Assets</p>
                  <div className="space-y-2">
                    {loadingTransports ? <div className="py-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-secondary/40" /></div> : transports.map(t => {
                      const qty = formData.transportOptions.find(o => o.transportId === t.id)?.quantity || 0;
                      return (
                         <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                           <div className="flex flex-col"><span className="text-[9px] font-bold text-primary uppercase truncate w-24">{t.vehicleType?.vehicleName}</span><span className="text-[8px] text-secondary">{formatCurrency(Number(t.price), selectedPartyCurrency)}</span></div>
                           <div className="flex items-center gap-2 bg-white p-0.5 rounded border border-gray-100">
                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-destructive" onClick={() => updateTransportQuantity(t.id, -1)}><Minus className="h-2 w-2" /></Button>
                            <span className="text-[10px] font-bold">{qty}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-emerald-600" onClick={() => updateTransportQuantity(t.id, 1)}><Plus className="h-2 w-2" /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 space-y-2">
                <Button 
                  className="w-full h-10 rounded-xl bg-primary text-white font-bold uppercase tracking-wider text-[10px] shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale" 
                  onClick={handleSubmit} 
                  disabled={submitting || formData.transportOptions.length === 0 || !formData.transportCompanyId}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Finalize</>}
                </Button>
                <Button variant="ghost" className="w-full h-9 rounded-xl text-muted-foreground font-bold uppercase text-[9px] hover:bg-destructive/5 hover:text-destructive" onClick={() => onSuccess()}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
export default QuickVoucherForm;
