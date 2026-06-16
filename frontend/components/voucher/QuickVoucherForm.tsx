'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { voucherAPI, cityMasterAPI, locationMasterAPI, transportRouteMasterAPI, transportMasterAPI, partyAPI } from '@/lib/api';
import { Loader2, Plus, Minus, Trash2, MapPin, Truck, Ticket, Users, User, Plane, Building, CheckCircle2 } from 'lucide-react';
import { MovementsTable } from '@/components/umrah-booking/components/MovementsTable';
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
import { fromDisplayDate, toDisplayDate, extractDateFromISO, extractTimeFromISO, combineDateAndTime } from '@/lib/umrah/validation';

interface QuickVoucherFormProps {
  onSuccess: () => void;
}

interface HotelSchedule {
  number: number;
  cityId?: string;
  cityName?: string;
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
    flightDetails: [] as FlightDetail[],
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
        partyAPI.getAll(),
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
        hotelSchedules: formData.hotelSchedules.map((hs, idx) => ({
          number: idx + 1,
          location: hs.cityName || hs.location || '', // City name (CityMaster)
          hotelName: hs.hotelName || '', // Hotel name (LocationMaster)
          checkIn: fromDisplayDate(hs.checkIn),
          checkOut: fromDisplayDate(hs.checkOut),
          days: calculateDays(fromDisplayDate(hs.checkIn), fromDisplayDate(hs.checkOut)),
          brn: hs.brn || null,
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
        flightDetails: formData.flightDetails.map(f => {
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
        flightDetails: [],
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

  // Hotel functions
  const addHotelSchedule = () => {
    setFormData({
      ...formData,
      hotelSchedules: [
        ...formData.hotelSchedules,
        {
          number: formData.hotelSchedules.length + 1,
          location: '', // Will be set to city name when city is selected
          hotelName: '',
          checkIn: '',
          checkOut: '',
          days: 0,
        },
      ],
    });
  };

  const removeHotelSchedule = (index: number) => {
    const updated = formData.hotelSchedules.filter((_, i) => i !== index);
    updated.forEach((h, idx) => {
      h.number = idx + 1;
    });
    setFormData({ ...formData, hotelSchedules: updated });
  };

  const updateHotelSchedule = (index: number, field: keyof HotelSchedule, value: any) => {
    const updated = [...formData.hotelSchedules];
    updated[index] = { ...updated[index], [field]: value };
    
    // When city changes, clear hotel selection (no prefill)
    if (field === 'cityName') {
      updated[index].locationId = '';
      updated[index].location = value || ''; // Set location to city name (CityMaster)
      updated[index].hotelName = '';
      // Ensure cityId is set if we have the city
      if (value) {
        const city = cities.find(c => c.name === value);
        if (city) {
          updated[index].cityId = city.id;
        }
      }
    }
    
    // When location changes, update hotel name and movements
    if (field === 'locationId') {
      const location = locations.find(l => l.id === value);
      if (location) {
        // IMPORTANT: location field should be city name (CityMaster), NOT hotel name
        // hotelName should be the hotel name (LocationMaster enum HOTEL)
        updated[index].location = updated[index].cityName || ''; // Keep city name, not hotel name
        updated[index].hotelName = location.name; // Hotel name (LocationMaster)
        // Update corresponding movements
        updateMovementsForHotel(index, value);
      }
    }
    
    if (field === 'checkIn' || field === 'checkOut') {
      updated[index].days = calculateDays(updated[index].checkIn, updated[index].checkOut);
    }
    setFormData({ ...formData, hotelSchedules: updated });
  };

  // Update movements when hotel changes
  const updateMovementsForHotel = (hotelIndex: number, hotelLocationId: string) => {
    const hotel = formData.hotelSchedules[hotelIndex];
    if (!hotel || !hotel.cityName) return;

    const location = locations.find(l => l.id === hotelLocationId);
    if (!location) return;

    const updatedMovements = formData.movementDetails.map((movement) => {
      // Update movements that reference this hotel's city and have empty location
      const isToCity = movement.to?.toLowerCase().trim() === hotel.cityName?.toLowerCase().trim() && 
                       movement.toCityId === hotel.cityId && 
                       !movement.toLocationId;
      const isFromCity = movement.from?.toLowerCase().trim() === hotel.cityName?.toLowerCase().trim() && 
                         movement.fromCityId === hotel.cityId && 
                         !movement.fromLocationId;
      
      if (isToCity) {
        return {
          ...movement,
          toLocationId: hotelLocationId,
          toLocation: location.name,
        };
      }
      
      if (isFromCity) {
        return {
          ...movement,
          fromLocationId: hotelLocationId,
          fromLocation: location.name,
        };
      }
      
      return movement;
    });
    
    setFormData(prev => ({ ...prev, movementDetails: updatedMovements }));
  };

  // Movement functions
  const addMovementDetail = () => {
    const newIndex = formData.movementDetails.length;
    setFormData({
      ...formData,
      movementDetails: [
        ...formData.movementDetails,
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
    });
  };

  const removeMovementDetail = (index: number) => {
    const updated = formData.movementDetails.filter((_, i) => i !== index);
    updated.forEach((m, idx) => {
      m.sr = idx + 1;
    });
    setFormData({ ...formData, movementDetails: updated });
  };

  const updateMovementDetail = (index: number, field: keyof MovementDetail, value: any) => {
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
        } else {
          updated[index].toLocation = location.name;
        }
      }
    }
    
    setFormData({ ...formData, movementDetails: updated });
  };

  // Flight functions
  const addFlightDetail = () => {
    setFormData({
      ...formData,
      flightDetails: [
        ...formData.flightDetails,
        {
          type: 'AA',
          date: '',
          carrier: '',
          number: '',
          from: '',
          to: '',
          etd: '',
          eta: '',
        },
      ],
    });
  };

  const removeFlightDetail = (index: number) => {
    const updated = formData.flightDetails.filter((_, i) => i !== index);
    setFormData({ ...formData, flightDetails: updated });
  };

  const updateFlightDetail = (index: number, field: keyof FlightDetail, value: any) => {
    const updated = [...formData.flightDetails];
    updated[index] = { ...updated[index], [field]: value };
    
    // When from/to location changes, update display
    if (field === 'fromLocationId') {
      const location = airports.find(a => a.id === value);
      if (location) {
        updated[index].from = (location.code || location.name || '').substring(0, 10);
      }
    }
    
    if (field === 'toLocationId') {
      const location = airports.find(a => a.id === value);
      if (location) {
        updated[index].to = (location.code || location.name || '').substring(0, 10);
      }
    }
    
    setFormData({ ...formData, flightDetails: updated });
  };

  // Keep these for backward compatibility or if needed elsewhere
  const updateArrivalFlight = (field: keyof FlightDetail, value: any) => {
    const index = formData.flightDetails.findIndex(f => f.type === 'AA');
    if (index >= 0) {
      updateFlightDetail(index, field, value);
    } else {
      const newFlight: FlightDetail = {
        type: 'AA',
        date: '',
        carrier: '',
        number: '',
        from: '',
        to: '',
        etd: '',
        eta: '',
        [field]: value
      };
      setFormData({ ...formData, flightDetails: [...formData.flightDetails, newFlight] });
    }
  };

  const updateDepartureFlight = (field: keyof FlightDetail, value: any) => {
    const index = formData.flightDetails.findIndex(f => f.type === 'AD');
    if (index >= 0) {
      updateFlightDetail(index, field, value);
    } else {
      const newFlight: FlightDetail = {
        type: 'AD',
        date: '',
        carrier: '',
        number: '',
        from: '',
        to: '',
        etd: '',
        eta: '',
        [field]: value
      };
      setFormData({ ...formData, flightDetails: [...formData.flightDetails, newFlight] });
    }
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

          {/* Logistics & Movements */}
          <div className="grid grid-cols-1 gap-4">
            {/* Flight Details */}
            <Card className="rounded-xl border-secondary/10 shadow-sm bg-white overflow-hidden">
              <div className="px-4 py-2 border-b border-secondary/10 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-2">
                  <Plane className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Flight Details</span>
                </div>
                <Button variant="outline" size="sm" onClick={addFlightDetail} className="h-7 px-3 rounded-md border-secondary/20 text-primary font-bold text-[9px] uppercase hover:bg-secondary transition-all">
                  <Plus className="h-3 w-3 mr-1" /> Add Flight
                </Button>
              </div>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow className="hover:bg-transparent border-0 h-8">
                        <TableHead className="px-4 text-[9px] font-bold uppercase py-0">Type</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase py-0">Carrier & No</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase py-0">Route</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase py-0 w-[110px]">Date</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase py-0 w-[80px]">Time (24h)</TableHead>
                        <TableHead className="w-[40px] py-0"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.flightDetails.map((flight, idx) => (
                        <TableRow key={idx} className="h-10 border-gray-50">
                          <TableCell className="px-4">
                            <Select value={flight.type} onValueChange={(v: any) => updateFlightDetail(idx, 'type', v)}>
                              <SelectTrigger className="h-7 rounded border-gray-100 text-[9px] uppercase w-[75px]"><SelectValue /></SelectTrigger>
                              <SelectContent className="text-[9px] uppercase"><SelectItem value="AA">Arrival</SelectItem><SelectItem value="AD">Depart</SelectItem></SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Input placeholder="IATA" value={flight.carrier} onChange={(e) => updateFlightDetail(idx, 'carrier', e.target.value)} className="h-7 rounded border-gray-100 text-[10px] w-14 uppercase" />
                              <Input placeholder="No" value={flight.number} onChange={(e) => updateFlightDetail(idx, 'number', e.target.value)} className="h-7 rounded border-gray-100 text-[10px] w-16" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Select value={flight.fromLocationId} onValueChange={(v) => updateFlightDetail(idx, 'fromLocationId', v)}>
                                <SelectTrigger className="h-7 rounded border-gray-100 text-[9px] w-20"><SelectValue placeholder="From" /></SelectTrigger>
                                <SelectContent className="max-h-[300px]">{airports.map(a => <SelectItem key={a.id} value={a.id} className="text-[10px]">{a.airportCode || a.code || a.name}</SelectItem>)}</SelectContent>
                              </Select>
                              <span className="text-muted-foreground text-[9px]">→</span>
                              <Select value={flight.toLocationId} onValueChange={(v) => updateFlightDetail(idx, 'toLocationId', v)}>
                                <SelectTrigger className="h-7 rounded border-gray-100 text-[9px] w-20"><SelectValue placeholder="To" /></SelectTrigger>
                                <SelectContent className="max-h-[300px]">{airports.map(a => <SelectItem key={a.id} value={a.id} className="text-[10px]">{a.airportCode || a.code || a.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell><DatePicker value={flight.date} onChange={(v) => updateFlightDetail(idx, 'date', v)} className="h-7" /></TableCell>
                          <TableCell>
                            <TimePicker 
                              value={flight.type === 'AA' ? (flight.eta || '') : (flight.etd || '')} 
                              onChange={(v) => updateFlightDetail(idx, flight.type === 'AA' ? 'eta' : 'etd', v)} 
                              className="h-7 min-w-[80px]" 
                            />
                          </TableCell>
                          <TableCell className="px-2 text-right"><Button variant="ghost" size="icon" onClick={() => removeFlightDetail(idx)} className="h-6 w-6 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Hotel Schedule */}
            <Card className="rounded-xl border-secondary/10 shadow-sm bg-white overflow-hidden">
              <div className="px-4 py-2 border-b border-secondary/10 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-2">
                  <Building className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Hotel Schedule</span>
                </div>
                <Button variant="outline" size="sm" onClick={addHotelSchedule} className="h-7 px-3 rounded-md border-secondary/20 text-primary font-bold text-[9px] uppercase hover:bg-secondary transition-all">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Stay
                </Button>
              </div>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow className="hover:bg-transparent border-0 h-8">
                        <TableHead className="px-4 text-[9px] font-bold uppercase w-[40px]">Sr</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase">City</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase">Hotel Name</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase w-[180px]">In/Out</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase w-[90px]">BRN</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.hotelSchedules.map((hotel, idx) => (
                        <TableRow key={idx} className="h-10 border-gray-50">
                          <TableCell className="px-4 text-[10px] font-bold text-primary">{idx + 1}</TableCell>
                          <TableCell>
                            <Select value={hotel.cityId} onValueChange={(v) => updateHotelSchedule(idx, 'cityId', v)}>
                              <SelectTrigger className="h-7 rounded border-gray-100 text-[9px] w-24"><SelectValue placeholder="City" /></SelectTrigger>
                              <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id} className="text-[9px]">{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={hotel.locationId} onValueChange={(v) => updateHotelSchedule(idx, 'locationId', v)}>
                              <SelectTrigger className="h-7 rounded border-gray-100 text-[9px]"><SelectValue placeholder="Select Hotel" /></SelectTrigger>
                              <SelectContent>{getHotelsForCity(cities.find(c => c.id === hotel.cityId)?.name).map(h => <SelectItem key={h.id} value={h.id} className="text-[9px]">{h.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <DatePicker value={hotel.checkIn} onChange={(v) => updateHotelSchedule(idx, 'checkIn', v)} className="h-7" />
                              <DatePicker value={hotel.checkOut} onChange={(v) => updateHotelSchedule(idx, 'checkOut', v)} className="h-7" />
                            </div>
                          </TableCell>
                          <TableCell><Input placeholder="BRN" value={hotel.brn} onChange={(e) => updateHotelSchedule(idx, 'brn', e.target.value)} className="h-7 rounded border-gray-100 text-[9px]" /></TableCell>
                          <TableCell className="px-2 text-right"><Button variant="ghost" size="icon" onClick={() => removeHotelSchedule(idx)} className="h-6 w-6 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
                <Select value={selectedRouteId || ''} onValueChange={(v) => { setSelectedRouteId(v); setFormData({...formData, transportOptions: []}); }}>
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
                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-destructive" onClick={() => updateTransportQuantity(t.id, Math.max(0, qty - 1))}><Minus className="h-2 w-2" /></Button>
                            <span className="text-[10px] font-bold">{qty}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-emerald-600" onClick={() => updateTransportQuantity(t.id, qty + 1)}><Plus className="h-2 w-2" /></Button>
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
