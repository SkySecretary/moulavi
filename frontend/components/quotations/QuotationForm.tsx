'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  quotationAPI,
  partyAPI,
  cityMasterAPI,
  locationMasterAPI,
  transportRouteMasterAPI,
  vehicleTypeMasterAPI,
  transportMasterAPI,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  User,
  Building2,
  Calendar,
  Hotel,
  Plane,
  Bus,
  Plus,
  Trash2,
  Save,
  Loader2,
  FileText,
  Mail,
  Receipt,
  Utensils,
  CreditCard,
  CheckCircle,
  HelpCircle,
  Clock,
  Car,
  MessageSquare,
  BedDouble,
  Search,
  Check,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { EmailQuotationDialog } from './EmailQuotationDialog';
import { WhatsAppQuotationDialog } from './WhatsAppQuotationDialog';
import { DownloadQuotationDialog } from './DownloadQuotationDialog';

// Reusable standard text input with manual numeric validation (no clunky number stepper buttons)
interface NumericInputProps {
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  allowDecimals?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  prefix?: string;
  suffix?: string;
  title?: string;
}

function NumericInput({
  value,
  onChange,
  min,
  max,
  allowDecimals = false,
  placeholder = '0',
  className = '',
  inputClassName = '',
  disabled = false,
  prefix,
  suffix,
  title,
}: NumericInputProps) {
  const [localVal, setLocalVal] = useState<string>(
    value === undefined || value === null || (value === 0 && placeholder !== '0')
      ? ''
      : String(value)
  );

  useEffect(() => {
    const num = allowDecimals ? parseFloat(localVal) : parseInt(localVal, 10);
    const incomingNum = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num) || num !== incomingNum) {
      setLocalVal(value === undefined || value === null ? '' : String(value));
    }
  }, [value, allowDecimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    if (allowDecimals) {
      raw = raw.replace(/[^0-9.]/g, '');
      const parts = raw.split('.');
      if (parts.length > 2) {
        raw = parts[0] + '.' + parts.slice(1).join('');
      }
    } else {
      raw = raw.replace(/[^0-9]/g, '');
    }

    setLocalVal(raw);

    if (raw === '' || raw === '.') {
      onChange(min !== undefined ? min : 0);
      return;
    }

    let parsed = allowDecimals ? parseFloat(raw) : parseInt(raw, 10);
    if (!isNaN(parsed)) {
      if (min !== undefined && parsed < min) parsed = min;
      if (max !== undefined && parsed > max) parsed = max;
      onChange(parsed);
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      {prefix && (
        <span className="absolute left-2.5 text-[11px] font-semibold text-slate-400 pointer-events-none select-none">
          {prefix}
        </span>
      )}
      <Input
        type="text"
        inputMode={allowDecimals ? 'decimal' : 'numeric'}
        value={localVal}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        title={title}
        className={`text-xs bg-white font-medium ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-7' : ''} ${inputClassName}`}
      />
      {suffix && (
        <span className="absolute right-2.5 text-[11px] font-semibold text-slate-400 pointer-events-none select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

export interface HotelItem {
  id?: string;
  stayType: 'HOTEL' | 'IQAMA';
  cityId?: string;
  hotelId?: string;
  city: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomType: string;
  roomCount: number;
  roomPricePerNight: number;
  hotelCost: number;
  hasExtraBed?: boolean;
  extraBedCount?: number;
  extraBedPricePerNight?: number;
  extraBedTotal?: number;
  mealPlan: string;
  mealTimesPerDay: number;
  mealPricePerPaxPerDay: number;
  mealTotal: number;
  totalHotelWithMeals: number;
  notes: string;
}

export interface FlightItem {
  id?: string;
  flightType: 'ONWARD' | 'RETURN' | 'DOMESTIC' | 'OTHER';
  fromAirportId?: string;
  fromAirportCode?: string;
  fromAirportName?: string;
  toAirportId?: string;
  toAirportCode?: string;
  toAirportName?: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  airline: string;
  flightNumber: string;
  price: number;
  notes: string;
}

export interface TransportItem {
  id?: string;
  routeId?: string;
  vehicleTypeId?: string;
  transportMasterId?: string;
  route: string;
  vehicleType: string;
  vehicleCount: number;
  date: string;
  time: string;
  price: number;
  notes: string;
}

export interface AdditionalItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

interface QuotationFormProps {
  initialData?: any;
  isEdit?: boolean;
}

const COMMON_AIRLINES = [
  'Saudia',
  'Air India Express',
  'Flynas',
  'IndiGo',
  'Air India',
  'Emirates',
  'Qatar Airways',
  'Gulf Air',
  'Etihad Airways',
  'Flyadeal',
  'SpiceJet',
  'Akasa Air',
  'Oman Air',
  'Kuwait Airways',
  'Jazeera Airways',
  'Flydubai',
  'Biman Bangladesh',
  'Pakistan International Airlines',
];

export function QuotationForm({ initialData, isEdit = false }: QuotationFormProps) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [parties, setParties] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [airports, setAirports] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [transportMasters, setTransportMasters] = useState<any[]>([]);

  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [createdQuotation, setCreatedQuotation] = useState<any>(null);

  // Helper to detect if an airport is Indian or Saudi
  const isIndianAirport = (a: any) => {
    const code = (a?.code || '').toUpperCase();
    const countryCode = (a?.country?.countryCode || a?.countryCode || '').toUpperCase();
    const countryName = (a?.country?.countryName || a?.country || '').toLowerCase();
    const indianCodes = ['CCJ', 'COK', 'CNN', 'TRV', 'DEL', 'BOM', 'BLR', 'HYD', 'MAA', 'CCU', 'AMD', 'LKO', 'JAI', 'GOI', 'GOX', 'IXE', 'TRZ', 'SXR', 'PNQ', 'NAG'];
    return countryCode === 'IND' || countryCode === 'IN' || countryName.includes('india') || indianCodes.includes(code);
  };

  const isSaudiAirport = (a: any) => {
    const code = (a?.code || '').toUpperCase();
    const countryCode = (a?.country?.countryCode || a?.countryCode || '').toUpperCase();
    const countryName = (a?.country?.countryName || a?.country || '').toLowerCase();
    const saudiCodes = ['JED', 'MED', 'RUH', 'DMM', 'AHB', 'TIF', 'GIZ', 'ELQ', 'HAS', 'YNB', 'NUM', 'TUU'];
    return countryCode === 'SAU' || countryCode === 'SA' || countryName.includes('saudi') || saudiCodes.includes(code);
  };

  // Form State
  const [title, setTitle] = useState(initialData?.title || '');
  const [status, setStatus] = useState(initialData?.status || 'DRAFT');
  const [validUntil, setValidUntil] = useState(
    initialData?.validUntil
      ? new Date(initialData.validUntil).toISOString().split('T')[0]
      : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState(initialData?.currency || 'SAR');

  // Customer / Lead
  const [customerType, setCustomerType] = useState<'B2C' | 'B2B'>(
    initialData?.customerType || (initialData?.partyId ? 'B2B' : 'B2C')
  );
  const [partyId, setPartyId] = useState(initialData?.partyId || '');
  const [guestName, setGuestName] = useState(initialData?.guestName || '');
  const [guestPhone, setGuestPhone] = useState(initialData?.guestPhone || '');
  const [guestEmail, setGuestEmail] = useState(initialData?.guestEmail || '');
  const [guestCountry, setGuestCountry] = useState(initialData?.guestCountry || 'India');
  const [guestCity, setGuestCity] = useState(initialData?.guestCity || '');

  // Pax Specifications
  const [adultsCount, setAdultsCount] = useState<number>(initialData?.adultsCount ?? 2);
  const [childrenCount, setChildrenCount] = useState<number>(initialData?.childrenCount ?? 0);
  const [infantsCount, setInfantsCount] = useState<number>(initialData?.infantsCount ?? 0);
  const totalPax = Math.max(1, (Number(adultsCount) || 0) + (Number(childrenCount) || 0) + (Number(infantsCount) || 0));

  // Hotels / Stays
  const [hotels, setHotels] = useState<HotelItem[]>(
    initialData?.hotels && initialData.hotels.length > 0
      ? initialData.hotels.map((h: any) => ({
          ...h,
          hasExtraBed: Boolean(h.hasExtraBed),
          extraBedCount: Number(h.extraBedCount) || 1,
          extraBedPricePerNight: Number(h.extraBedPricePerNight) || 100,
          extraBedTotal: Number(h.extraBedTotal) || 0,
          mealPlan: h.mealPlan || 'None',
          mealTimesPerDay: Number(h.mealTimesPerDay) || 1,
          mealPricePerPaxPerDay: Number(h.mealPricePerPaxPerDay) || 35,
          mealTotal: Number(h.mealTotal) || 0,
        }))
      : [
          {
            stayType: 'HOTEL',
            city: 'Makkah',
            hotelName: '',
            checkIn: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            checkOut: new Date(Date.now() + 19 * 86400000).toISOString().split('T')[0],
            nights: 5,
            roomType: 'Double',
            roomCount: 1,
            roomPricePerNight: 350,
            hotelCost: 1750,
            hasExtraBed: false,
            extraBedCount: 1,
            extraBedPricePerNight: 100,
            extraBedTotal: 0,
            mealPlan: 'Breakfast',
            mealTimesPerDay: 1,
            mealPricePerPaxPerDay: 35,
            mealTotal: 350,
            totalHotelWithMeals: 2100,
            notes: '',
          },
        ]
  );

  // Flights - Default to Onward (India -> Saudi) and Return (Saudi -> India)
  const [flights, setFlights] = useState<FlightItem[]>(
    initialData?.flights && Array.isArray(initialData.flights) && initialData.flights.length > 0
      ? initialData.flights
      : [
          {
            flightType: 'ONWARD',
            fromAirportCode: 'CCJ',
            fromAirportName: 'Calicut International Airport',
            toAirportCode: 'JED',
            toAirportName: 'King Abdulaziz International Airport',
            departureDate: initialData?.hotels?.[0]?.checkIn || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            departureTime: '10:30',
            arrivalDate: initialData?.hotels?.[0]?.checkIn || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            arrivalTime: '14:00',
            airline: 'Saudia',
            flightNumber: 'SV 782',
            price: 0,
            notes: 'Onward Flight (India to Saudi Arabia)',
          },
          {
            flightType: 'RETURN',
            fromAirportCode: 'JED',
            fromAirportName: 'King Abdulaziz International Airport',
            toAirportCode: 'CCJ',
            toAirportName: 'Calicut International Airport',
            departureDate: initialData?.hotels?.[initialData.hotels.length - 1]?.checkOut || new Date(Date.now() + 19 * 86400000).toISOString().split('T')[0],
            departureTime: '18:45',
            arrivalDate: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
            arrivalTime: '02:30',
            airline: 'Saudia',
            flightNumber: 'SV 783',
            price: 0,
            notes: 'Return Flight (Saudi Arabia to India)',
          },
        ]
  );

  // Transports
  const [transports, setTransports] = useState<TransportItem[]>(
    initialData?.transports && initialData.transports.length > 0
      ? initialData.transports
      : [
          {
            route: 'Jeddah Airport to Makkah Hotel',
            vehicleType: 'GMC / SUV',
            vehicleCount: 1,
            date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            time: '14:00',
            price: 450,
            notes: 'Private Airport Transfer',
          },
        ]
  );

  // Visas
  const [includeVisas, setIncludeVisas] = useState<boolean>(
    Boolean(initialData?.visas?.adultVisaCount || initialData?.visas?.childVisaCount || !isEdit)
  );
  const [adultVisaRate, setAdultVisaRate] = useState<number>(
    initialData?.visas?.adultVisaRate ?? 450
  );
  const [childVisaRate, setChildVisaRate] = useState<number>(
    initialData?.visas?.childVisaRate ?? 450
  );

  // Additional Items
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>(
    initialData?.additionalItems || []
  );

  // Inclusions, Exclusions, Terms
  const [inclusions, setInclusions] = useState(initialData?.inclusions || '');
  const [exclusions, setExclusions] = useState(initialData?.exclusions || '');
  const [termsAndConditions, setTermsAndConditions] = useState(initialData?.termsAndConditions || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Discounts
  const [discountAmount, setDiscountAmount] = useState<number>(initialData?.discountAmount ?? 0);

  // Load all Master Data
  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      setLoadingMasters(true);
      const [citiesRes, locationsRes, routesRes, vehiclesRes, transportsRes, partiesRes, airportsRes] = await Promise.all([
        cityMasterAPI.getActive(),
        locationMasterAPI.getActive({ locationType: 'HOTEL' }),
        transportRouteMasterAPI.getActive(),
        vehicleTypeMasterAPI.getActive(),
        transportMasterAPI.getActive(),
        partyAPI.getAll({ is_customer: 'true', limit: 1000 }),
        locationMasterAPI.getAll({ locationType: 'AIRPORT', limit: 200 }),
      ]);

      const rawCities = citiesRes.data?.cityMasters || (Array.isArray(citiesRes.data) ? citiesRes.data : []);
      const rawLocations = locationsRes.data?.locationMasters || (Array.isArray(locationsRes.data) ? locationsRes.data : []);
      const rawRoutes = routesRes.data?.transportRouteMasters || (Array.isArray(routesRes.data) ? routesRes.data : []);
      const rawVehicles =
        vehiclesRes.data?.data?.vehicleTypeMasters ||
        vehiclesRes.data?.vehicleTypeMasters ||
        (Array.isArray(vehiclesRes.data?.data) ? vehiclesRes.data.data : []) ||
        (Array.isArray(vehiclesRes.data) ? vehiclesRes.data : []);
      const rawTransports = transportsRes.data?.transportMasters || (Array.isArray(transportsRes.data) ? transportsRes.data : []);
      const rawParties = partiesRes.data?.parties || (Array.isArray(partiesRes.data) ? partiesRes.data : []);
      const rawAirports = airportsRes.data?.locationMasters || (Array.isArray(airportsRes.data) ? airportsRes.data : []);

      setCities(rawCities);
      setLocations(rawLocations);
      setRoutes(rawRoutes);
      setVehicleTypes(rawVehicles);
      setTransportMasters(rawTransports);
      setParties(rawParties.filter((p: any) => p.isCustomer !== false));
      setAirports(rawAirports);

      // Auto-populate flight airport IDs for initial default flights
      setFlights((prev) =>
        prev.map((f) => {
          let updated = { ...f };
          const defaultIndia = rawAirports.find((a: any) => a.code === 'CCJ') ||
                               rawAirports.find((a: any) => a.code === 'COK') ||
                               rawAirports.find((a: any) => isIndianAirport(a)) ||
                               rawAirports[0];
          const defaultSaudi = rawAirports.find((a: any) => a.code === 'JED') ||
                               rawAirports.find((a: any) => a.code === 'MED') ||
                               rawAirports.find((a: any) => isSaudiAirport(a)) ||
                               rawAirports[1] || rawAirports[0];

          const expectedFrom = f.flightType === 'RETURN' ? defaultSaudi : defaultIndia;
          const expectedTo = f.flightType === 'RETURN' ? defaultIndia : defaultSaudi;

          if (!updated.fromAirportId) {
            const matchedFrom = rawAirports.find((a: any) =>
              (updated.fromAirportCode && a.code?.toUpperCase() === updated.fromAirportCode.toUpperCase()) ||
              (updated.fromAirportName && a.name?.toLowerCase().includes(updated.fromAirportName.toLowerCase()))
            ) || expectedFrom;
            if (matchedFrom) {
              updated.fromAirportId = matchedFrom.id;
              updated.fromAirportCode = matchedFrom.code || '';
              updated.fromAirportName = matchedFrom.name || '';
            }
          }

          if (!updated.toAirportId) {
            const matchedTo = rawAirports.find((a: any) =>
              (updated.toAirportCode && a.code?.toUpperCase() === updated.toAirportCode.toUpperCase()) ||
              (updated.toAirportName && a.name?.toLowerCase().includes(updated.toAirportName.toLowerCase()))
            ) || expectedTo;
            if (matchedTo) {
              updated.toAirportId = matchedTo.id;
              updated.toAirportCode = matchedTo.code || '';
              updated.toAirportName = matchedTo.name || '';
            }
          }

          return updated;
        })
      );

      // Auto-match vehicleTypeId and routeId for initial/default transport items if missing
      setTransports((prev) =>
        prev.map((t) => {
          let updated = { ...t };
          if (!updated.vehicleTypeId && updated.vehicleType && rawVehicles.length > 0) {
            const found = rawVehicles.find(
              (v: any) =>
                v.vehicleName?.toLowerCase() === updated.vehicleType?.toLowerCase() ||
                updated.vehicleType?.toLowerCase().includes(v.vehicleName?.toLowerCase())
            );
            if (found) {
              updated.vehicleTypeId = found.id;
              updated.vehicleType = found.vehicleName;
            }
          }
          if (!updated.routeId && updated.route && rawRoutes.length > 0) {
            const foundRoute = rawRoutes.find(
              (r: any) =>
                r.routeName?.toLowerCase() === updated.route?.toLowerCase() ||
                `${r.city1?.name} to ${r.city2?.name}`.toLowerCase() === updated.route?.toLowerCase()
            );
            if (foundRoute) {
              updated.routeId = foundRoute.id;
            }
          }
          return updated;
        })
      );
    } catch (err) {
      console.error('Error loading master data:', err);
    } finally {
      setLoadingMasters(false);
    }
  };

  // Requirement 3: Always update customer information when selecting/changing agency
  const handlePartyChange = (id: string) => {
    setPartyId(id);
    const found = parties.find((p) => p.id === id);
    if (found) {
      setGuestName(found.partyName || '');
      setGuestPhone(found.whatsappNumber || found.contactNumber || found.phoneNumber || '');
      setGuestEmail(found.email || '');
      if (found.country?.countryName || found.country) {
        setGuestCountry(found.country?.countryName || found.country);
      }
      if (found.cityMaster?.name || found.city) {
        setGuestCity(found.cityMaster?.name || found.city);
      }
    }
  };

  // Recalculate stay nights, extra bed, meal totals and grand stay cost
  const calculateHotelValues = (item: HotelItem): HotelItem => {
    let nights = 1;
    if (item.checkIn && item.checkOut) {
      const d1 = new Date(item.checkIn).getTime();
      const d2 = new Date(item.checkOut).getTime();
      if (d2 > d1) {
        nights = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
      }
    }

    const roomPrice = Number(item.roomPricePerNight) || 0;
    const roomCount = Number(item.roomCount) || 1;
    const hotelCost = roomPrice * roomCount * nights;

    // Extra Bed Calculation:
    let extraBedTotal = 0;
    if (item.hasExtraBed) {
      const ebCount = Number(item.extraBedCount) || 0;
      const ebPrice = Number(item.extraBedPricePerNight) || 0;
      extraBedTotal = ebCount * ebPrice * nights;
    }

    // Meal Calculation:
    let mealTotal = 0;
    if (item.mealPlan && item.mealPlan !== 'None' && item.mealTimesPerDay > 0) {
      const mealRate = Number(item.mealPricePerPaxPerDay) || 0;
      mealTotal = item.mealTimesPerDay * mealRate * totalPax * nights;
    }

    const totalHotelWithMeals = hotelCost + extraBedTotal + mealTotal;

    return {
      ...item,
      nights,
      hotelCost,
      extraBedTotal,
      mealTotal,
      totalHotelWithMeals,
    };
  };

  // Update Hotel field
  const handleUpdateHotel = (index: number, fields: Partial<HotelItem>) => {
    setHotels((prev) => {
      const next = [...prev];
      next[index] = calculateHotelValues({ ...next[index], ...fields });
      return next;
    });
  };

  // Add Hotel Stay
  const handleAddHotel = () => {
    const lastHotel = hotels[hotels.length - 1];
    const checkIn = lastHotel?.checkOut || new Date(Date.now() + 19 * 86400000).toISOString().split('T')[0];
    const checkOutDate = new Date(new Date(checkIn).getTime() + 5 * 86400000);
    const checkOut = checkOutDate.toISOString().split('T')[0];

    const defaultCity = cities.find((c) => c.name.toLowerCase() === 'madinah') || cities[1] || cities[0];

    setHotels((prev) => [
      ...prev,
      calculateHotelValues({
        stayType: 'HOTEL',
        cityId: defaultCity?.id,
        city: defaultCity?.name || 'Madinah',
        hotelId: '',
        hotelName: '',
        checkIn,
        checkOut,
        nights: 5,
        roomType: 'Double',
        roomCount: 1,
        roomPricePerNight: 300,
        hotelCost: 1500,
        hasExtraBed: false,
        extraBedCount: 1,
        extraBedPricePerNight: 100,
        extraBedTotal: 0,
        mealPlan: 'Breakfast',
        mealTimesPerDay: 1,
        mealPricePerPaxPerDay: 30,
        mealTotal: 300,
        totalHotelWithMeals: 1800,
        notes: '',
      }),
    ]);
  };

  const handleRemoveHotel = (index: number) => {
    if (hotels.length === 1) {
      toast.error('Quotation must have at least one accommodation stay');
      return;
    }
    setHotels((prev) => prev.filter((_, i) => i !== index));
  };

  // Flight handlers (Onward: India -> Saudi, Return: Saudi -> India)
  const handleAddFlight = () => {
    const indianAirports = airports.filter(isIndianAirport);
    const saudiAirports = airports.filter(isSaudiAirport);

    const defaultIndia = airports.find((a) => a.code === 'CCJ') ||
                         airports.find((a) => a.code === 'COK') ||
                         indianAirports[0] ||
                         airports[0];
    const defaultSaudi = airports.find((a) => a.code === 'JED') ||
                         airports.find((a) => a.code === 'MED') ||
                         saudiAirports[0] ||
                         airports[1] ||
                         airports[0];

    const isReturn = flights.length % 2 === 1; // 1st was onward, next is return
    const fromAir = isReturn ? defaultSaudi : defaultIndia;
    const toAir = isReturn ? defaultIndia : defaultSaudi;

    const depDate = isReturn
      ? (hotels[hotels.length - 1]?.checkOut || new Date(Date.now() + 19 * 86400000).toISOString().split('T')[0])
      : (hotels[0]?.checkIn || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);

    setFlights((prev) => [
      ...prev,
      {
        flightType: isReturn ? 'RETURN' : 'ONWARD',
        fromAirportId: fromAir?.id || '',
        fromAirportCode: fromAir?.code || '',
        fromAirportName: fromAir?.name || '',
        toAirportId: toAir?.id || '',
        toAirportCode: toAir?.code || '',
        toAirportName: toAir?.name || '',
        departureDate: depDate,
        departureTime: isReturn ? '18:45' : '10:30',
        arrivalDate: isReturn ? new Date(new Date(depDate).getTime() + 86400000).toISOString().split('T')[0] : depDate,
        arrivalTime: isReturn ? '02:30' : '14:00',
        airline: 'Saudia',
        flightNumber: isReturn ? 'SV 783' : 'SV 782',
        price: 0,
        notes: isReturn ? 'Return Flight (Saudi Arabia to India)' : 'Onward Flight (India to Saudi Arabia)',
      },
    ]);
  };

  const handleUpdateFlight = (index: number, fields: Partial<FlightItem>) => {
    setFlights((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...fields };
      return copy;
    });
  };

  const handleRemoveFlight = (index: number) => {
    setFlights((prev) => prev.filter((_, i) => i !== index));
  };

  // Transport lookup & handlers
  const handleUpdateTransport = (index: number, fields: Partial<TransportItem>) => {
    setTransports((prev) => {
      const next = [...prev];
      const updated = { ...next[index], ...fields };

      const routeId = updated.routeId;
      const vehicleTypeId = updated.vehicleTypeId;

      if ((fields.routeId !== undefined || fields.vehicleTypeId !== undefined || fields.vehicleCount !== undefined) && routeId && vehicleTypeId) {
        const matchedTm = transportMasters.find(
          (tm) => tm.routeId === routeId && tm.vehicleTypeId === vehicleTypeId
        );
        if (matchedTm && fields.price === undefined) {
          const qty = Number(updated.vehicleCount) || 1;
          updated.price = Number(matchedTm.price) * qty;
          updated.transportMasterId = matchedTm.id;
        }
      }

      next[index] = updated;
      return next;
    });
  };

  const handleAddTransport = () => {
    const firstRoute = routes[0];
    const firstVehicle = vehicleTypes[0];
    let initialPrice = 450;
    let tmId: string | undefined = undefined;

    if (firstRoute && firstVehicle) {
      const matched = transportMasters.find(
        (tm) => tm.routeId === firstRoute.id && tm.vehicleTypeId === firstVehicle.id
      );
      if (matched && matched.price) {
        initialPrice = Number(matched.price);
        tmId = matched.id;
      }
    }

    setTransports((prev) => [
      ...prev,
      {
        routeId: firstRoute?.id,
        vehicleTypeId: firstVehicle?.id,
        transportMasterId: tmId,
        route: firstRoute ? (firstRoute.routeName || `${firstRoute.city1?.name || ''} to ${firstRoute.city2?.name || ''}`) : 'Jeddah Airport to Makkah Hotel',
        vehicleType: firstVehicle?.vehicleName || 'GMC / SUV',
        vehicleCount: 1,
        date: hotels[0]?.checkOut || new Date().toISOString().split('T')[0],
        time: '12:00',
        price: initialPrice,
        notes: 'Intercity Ground Transfer',
      },
    ]);
  };

  const handleRemoveTransport = (index: number) => {
    setTransports((prev) => prev.filter((_, i) => i !== index));
  };

  // Additional items handlers
  const handleAddAdditionalItem = () => {
    setAdditionalItems((prev) => [
      ...prev,
      {
        description: '',
        quantity: 1,
        rate: 100,
        total: 100,
      },
    ]);
  };

  const handleUpdateAdditionalItem = (index: number, fields: Partial<AdditionalItem>) => {
    setAdditionalItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], ...fields };
      updated.total = (Number(updated.quantity) || 1) * (Number(updated.rate) || 0);
      next[index] = updated;
      return next;
    });
  };

  const handleRemoveAdditionalItem = (index: number) => {
    setAdditionalItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const totalHotelAmount = useMemo(() => {
    return hotels.reduce((sum, h) => sum + (Number(h.hotelCost) || 0), 0);
  }, [hotels]);

  const totalExtraBedAmount = useMemo(() => {
    return hotels.reduce((sum, h) => sum + (Number(h.extraBedTotal) || 0), 0);
  }, [hotels]);

  const totalMealAmount = useMemo(() => {
    return hotels.reduce((sum, h) => sum + (Number(h.mealTotal) || 0), 0);
  }, [hotels]);

  const totalFlightAmount = useMemo(() => {
    return flights.reduce((sum, f) => sum + (Number(f.price) || 0), 0);
  }, [flights]);

  const totalTransportAmount = useMemo(() => {
    return transports.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
  }, [transports]);

  const totalVisaAmount = useMemo(() => {
    if (!includeVisas) return 0;
    const adultCost = (Number(adultsCount) || 0) * (Number(adultVisaRate) || 0);
    const childCost = (Number(childrenCount) || 0) * (Number(childVisaRate) || 0);
    return adultCost + childCost;
  }, [includeVisas, adultsCount, childrenCount, adultVisaRate, childVisaRate]);

  const totalAdditionalAmount = useMemo(() => {
    return additionalItems.reduce((sum, a) => sum + (Number(a.total) || 0), 0);
  }, [additionalItems]);

  const subtotal = useMemo(() => {
    return (
      totalHotelAmount +
      totalExtraBedAmount +
      totalMealAmount +
      totalFlightAmount +
      totalTransportAmount +
      totalVisaAmount +
      totalAdditionalAmount
    );
  }, [
    totalHotelAmount,
    totalExtraBedAmount,
    totalMealAmount,
    totalFlightAmount,
    totalTransportAmount,
    totalVisaAmount,
    totalAdditionalAmount,
  ]);

  const grandTotal = useMemo(() => {
    const discounted = Math.max(0, subtotal - (Number(discountAmount) || 0));
    return discounted;
  }, [subtotal, discountAmount]);

  const pricePerAdult = useMemo(() => {
    if (adultsCount <= 0) return 0;
    const sharedStayAndTransport = (totalHotelAmount + totalExtraBedAmount + totalMealAmount + totalFlightAmount + totalTransportAmount + totalAdditionalAmount - discountAmount) / totalPax;
    const adultVisa = includeVisas ? adultVisaRate : 0;
    return Math.round(sharedStayAndTransport + adultVisa);
  }, [
    adultsCount,
    totalPax,
    totalHotelAmount,
    totalExtraBedAmount,
    totalMealAmount,
    totalFlightAmount,
    totalTransportAmount,
    totalAdditionalAmount,
    discountAmount,
    includeVisas,
    adultVisaRate,
  ]);

  const pricePerChild = useMemo(() => {
    if (childrenCount <= 0) return 0;
    const sharedStayAndTransport = (totalHotelAmount + totalExtraBedAmount + totalMealAmount + totalFlightAmount + totalTransportAmount + totalAdditionalAmount - discountAmount) / totalPax;
    const childVisa = includeVisas ? childVisaRate : 0;
    return Math.round(sharedStayAndTransport + childVisa);
  }, [
    childrenCount,
    totalPax,
    totalHotelAmount,
    totalExtraBedAmount,
    totalMealAmount,
    totalFlightAmount,
    totalTransportAmount,
    totalAdditionalAmount,
    discountAmount,
    includeVisas,
    childVisaRate,
  ]);

  // Save Quotation
  const handleSave = async (afterAction: 'list' | 'pdf' | 'email' | 'whatsapp' = 'list') => {
    if (customerType === 'B2B' && !partyId) {
      toast.error('Please select an Agency / Partner for B2B quotation');
      return;
    }
    if (!guestName.trim()) {
      toast.error('Please enter the Lead Guest / Pilgrim name');
      return;
    }
    if (hotels.length === 0) {
      toast.error('Please add at least one accommodation stay');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: title || `${guestName} - Umrah Package`,
        status,
        validUntil,
        currency,
        customerType,
        partyId: customerType === 'B2B' ? partyId : null,
        guestName,
        guestPhone,
        guestEmail,
        guestCountry,
        guestCity,
        adultsCount: Number(adultsCount) || 1,
        childrenCount: Number(childrenCount) || 0,
        infantsCount: Number(infantsCount) || 0,
        totalPax,
        hotels,
        flights,
        transports,
        visas: includeVisas
          ? {
              adultVisaCount: adultsCount,
              adultVisaRate,
              childVisaCount: childrenCount,
              childVisaRate,
              totalVisaAmount,
            }
          : null,
        additionalItems,
        inclusions,
        exclusions,
        termsAndConditions,
        notes,
        discountAmount: Number(discountAmount) || 0,
        taxAmount: 0,
        totalHotelAmount,
        totalMealAmount,
        totalExtraBedAmount,
        totalFlightAmount,
        totalTransportAmount,
        totalVisaAmount,
        totalAdditionalAmount,
        subtotal,
        grandTotal,
        pricePerAdult,
        pricePerChild,
      };

      let res;
      if (isEdit && initialData?.id) {
        res = await quotationAPI.update(initialData.id, payload);
        toast.success('Quotation updated successfully');
      } else {
        res = await quotationAPI.create(payload);
        toast.success('Quotation created successfully');
      }

      const savedQuote = res.data?.data || res.data?.quotation || res.data;
      setCreatedQuotation(savedQuote);

      if (afterAction === 'pdf' && savedQuote?.id) {
        setDownloadDialogOpen(true);
      } else if (afterAction === 'email') {
        setEmailDialogOpen(true);
      } else if (afterAction === 'whatsapp') {
        setWhatsappDialogOpen(true);
      } else {
        router.push('/dashboard/quotations');
      }
    } catch (error: any) {
      console.error('Error saving quotation:', error);
      toast.error(error.response?.data?.error || 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  // Airport dropdown options with country flags (India / Saudi) and city details
  const airportOptions = useMemo(() => {
    return airports.map((a) => {
      const isInd = isIndianAirport(a);
      const isSau = isSaudiAirport(a);
      const flag = isInd ? '🇮🇳' : isSau ? '🇸🇦' : '✈️';
      const cityName = a.cityMaster?.name || a.city || '';
      return {
        value: a.id,
        label: `${flag} ${a.code ? `${a.code} • ` : ''}${a.name}${cityName ? ` (${cityName})` : ''}`,
        code: a.code || '',
        name: a.name || '',
        isIndia: isInd,
        isSaudi: isSau,
      };
    });
  }, [airports]);

  return (
    <div className="space-y-5 pb-20 max-w-6xl mx-auto">
      {/* Top Header Card */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-slate-100 text-slate-800 uppercase text-[10px] tracking-wider font-bold">
                  {isEdit ? 'Edit Quotation' : 'Quick Quotation Builder'}
                </Badge>
                {initialData?.quotationNumber && (
                  <span className="font-mono text-xs font-bold text-slate-700">
                    #{initialData.quotationNumber}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {title || (guestName ? `${guestName} - Umrah Quotation` : 'New Umrah Package Quotation')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Build master-linked quotations with hotels, extra beds, meals, flights, transfers, and visas to convert anytime.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/quotations')}
                disabled={saving}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleSave('list')}
                disabled={saving}
                className="text-xs gap-1.5 shadow-xs"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isEdit ? 'Update Quotation' : 'Save Quotation'}
              </Button>
              <Button
                type="button"
                onClick={() => handleSave('pdf')}
                disabled={saving}
                variant="outline"
                className="text-xs gap-1.5"
              >
                <FileText className="h-4 w-4 text-slate-600" />
                Save & Download PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Customer Type & Pilgrim Breakdown */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="border-b bg-slate-50/50 pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            1. Client & Pilgrim Specifications
          </CardTitle>
          <CardDescription className="text-xs">
            Choose Direct (B2C) or Agency (B2B) client mode and define passenger specifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Customer Mode Selection */}
          <div className="flex flex-wrap items-center gap-4 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Customer Mode:</span>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="radio"
                name="customerType"
                value="B2C"
                checked={customerType === 'B2C'}
                onChange={() => setCustomerType('B2C')}
                className="text-primary focus:ring-primary"
              />
              Direct Guest (B2C)
            </label>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="radio"
                name="customerType"
                value="B2B"
                checked={customerType === 'B2B'}
                onChange={() => setCustomerType('B2B')}
                className="text-primary focus:ring-primary"
              />
              Agency / B2B Partner
            </label>
          </div>

          {/* Customer / Party Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {customerType === 'B2B' && (
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    Select Agency / Partner <span className="text-destructive">*</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">Autofills Client Info</span>
                </Label>
                <Select value={partyId} onValueChange={handlePartyChange}>
                  <SelectTrigger className="text-xs h-8 bg-white">
                    <SelectValue placeholder="Search & choose travel agency..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parties.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.partyName} {p.partyCode ? `(${p.partyCode})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className={`space-y-1 ${customerType === 'B2C' ? 'sm:col-span-2' : 'sm:col-span-2'}`}>
              <Label className="text-xs font-semibold">
                Lead Guest / Client Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Mohammed Farooq"
                className="text-xs h-8"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Phone / WhatsApp</Label>
              <Input
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="+91 98470 00000"
                className="text-xs font-mono h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Address</Label>
              <Input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="client@gmail.com"
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Country / City</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={guestCountry}
                  onChange={(e) => setGuestCountry(e.target.value)}
                  placeholder="Country"
                  className="text-xs h-8"
                />
                <Input
                  value={guestCity}
                  onChange={(e) => setGuestCity(e.target.value)}
                  placeholder="City"
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="text-xs h-8 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR" className="text-xs">SAR (Saudi Riyal)</SelectItem>
                  <SelectItem value="INR" className="text-xs">INR (Indian Rupee)</SelectItem>
                  <SelectItem value="USD" className="text-xs">USD (US Dollar)</SelectItem>
                  <SelectItem value="AED" className="text-xs">AED (Emirati Dirham)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Passenger Specifications */}
          <div className="pt-2 border-t border-slate-100">
            <Label className="text-xs font-bold text-slate-800 mb-2 block">
              Passenger Specifications (Breakdown)
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200 items-center">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  Adults (Age 12+) <span className="text-destructive">*</span>
                </Label>
                <NumericInput
                  min={1}
                  value={adultsCount}
                  onChange={(val) => {
                    setAdultsCount(val);
                    setHotels((prev) => prev.map((h) => calculateHotelValues(h)));
                  }}
                  inputClassName="h-8 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Children (Age 2-11)</Label>
                <NumericInput
                  min={0}
                  value={childrenCount}
                  onChange={(val) => {
                    setChildrenCount(val);
                    setHotels((prev) => prev.map((h) => calculateHotelValues(h)));
                  }}
                  inputClassName="h-8 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Infants (Under 2)</Label>
                <NumericInput
                  min={0}
                  value={infantsCount}
                  onChange={(val) => {
                    setInfantsCount(val);
                    setHotels((prev) => prev.map((h) => calculateHotelValues(h)));
                  }}
                  inputClassName="h-8 text-xs font-bold"
                />
              </div>

              <div className="flex flex-col justify-center items-center p-2 rounded bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Pilgrims</span>
                <span className="text-lg font-black text-slate-900">{totalPax} Pax</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Accommodation & Stay (Hotels & Meals & Extra Bed) */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="border-b bg-slate-50/50 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Hotel className="h-4 w-4 text-primary" />
              2. Accommodation, Meal Plans & Extra Bed Options
            </CardTitle>
            <CardDescription className="text-xs">
              Search hotels from masters, configure check-in/out, room sharing, extra beds, and meal frequency per day.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={handleAddHotel}
            size="sm"
            variant="outline"
            className="text-xs gap-1 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Stay / Hotel
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          {hotels.map((hotel, index) => {
            const cityHotels = locations.filter((l: any) => {
              if (l.locationType !== 'HOTEL') return false;
              if (hotel.cityId && l.cityId === hotel.cityId) return true;
              if (hotel.city && (l.cityMaster?.name?.toLowerCase() === hotel.city.toLowerCase() || l.city?.toLowerCase() === hotel.city.toLowerCase())) return true;
              return false;
            });

            const hotelOptions = (cityHotels.length > 0 ? cityHotels : locations.filter((l: any) => l.locationType === 'HOTEL')).map((loc: any) => ({
              value: loc.id,
              label: `${loc.name}${loc.cityMaster?.name ? ` (${loc.cityMaster.name})` : ''}`,
            }));

            return (
              <div
                key={index}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 relative space-y-3 shadow-xs hover:border-slate-300 transition-colors"
              >
                {/* Stay Header Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white font-bold text-slate-800 border-slate-200 text-xs">
                      Stay #{index + 1}: {hotel.city || 'City'}
                    </Badge>
                    <Select
                      value={hotel.stayType}
                      onValueChange={(val: any) => handleUpdateHotel(index, { stayType: val })}
                    >
                      <SelectTrigger className="h-7 text-xs w-32 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOTEL" className="text-xs">Hotel Stay</SelectItem>
                        <SelectItem value="IQAMA" className="text-xs">Iqama / Sharing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 font-mono bg-white px-2.5 py-1 rounded border border-slate-200">
                      {currency} {hotel.totalHotelWithMeals?.toLocaleString() || 0}
                    </span>
                    {hotels.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveHotel(index)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 h-7 px-2 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                {/* Row 1: Core Accommodation Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                  {/* City Select */}
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[11px] font-semibold text-slate-700">City</Label>
                    <Select
                      value={hotel.cityId || hotel.city}
                      onValueChange={(val) => {
                        const matchedCity = cities.find((c) => c.id === val || c.name === val);
                        handleUpdateHotel(index, {
                          cityId: matchedCity?.id || val,
                          city: matchedCity?.name || val,
                          hotelId: '',
                          hotelName: '',
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue placeholder="Select City" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.length > 0 ? (
                          cities.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.name}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Makkah" className="text-xs">Makkah</SelectItem>
                            <SelectItem value="Madinah" className="text-xs">Madinah</SelectItem>
                            <SelectItem value="Jeddah" className="text-xs">Jeddah</SelectItem>
                            <SelectItem value="Riyadh" className="text-xs">Riyadh</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Hotel Searchable Select + Custom Input */}
                  <div className="space-y-1 lg:col-span-4">
                    <Label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                      <span>Hotel Name</span>
                      {cityHotels.length > 0 && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {cityHotels.length} in {hotel.city || 'city'}
                        </span>
                      )}
                    </Label>
                    <div className="flex gap-1.5">
                      <div className="flex-1">
                        <SearchableSelect
                          options={hotelOptions}
                          value={hotel.hotelId || ''}
                          onValueChange={(val) => {
                            const matchedHotel = locations.find((l) => l.id === val);
                            if (matchedHotel) {
                              handleUpdateHotel(index, {
                                hotelId: matchedHotel.id,
                                hotelName: matchedHotel.name,
                                cityId: matchedHotel.cityId || hotel.cityId,
                                city: matchedHotel.cityMaster?.name || matchedHotel.city || hotel.city,
                              });
                            }
                          }}
                          placeholder="Search master hotel..."
                          searchPlaceholder="Type to search..."
                          emptyMessage="No hotel found"
                          className="h-8 text-xs bg-white font-normal"
                        />
                      </div>
                      <Input
                        value={hotel.hotelName}
                        onChange={(e) => handleUpdateHotel(index, { hotelName: e.target.value, hotelId: '' })}
                        placeholder="Or custom..."
                        className="h-8 text-xs bg-white w-28 shrink-0"
                      />
                    </div>
                  </div>

                  {/* Room Type */}
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[11px] font-semibold text-slate-700">Room Type</Label>
                    <Select
                      value={hotel.roomType}
                      onValueChange={(val) => handleUpdateHotel(index, { roomType: val })}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single" className="text-xs">Single Room</SelectItem>
                        <SelectItem value="Double" className="text-xs">Double (2 Bed)</SelectItem>
                        <SelectItem value="Triple" className="text-xs">Triple (3 Bed)</SelectItem>
                        <SelectItem value="Quad" className="text-xs">Quad (4 Bed)</SelectItem>
                        <SelectItem value="Quint" className="text-xs">Quint (5 Bed)</SelectItem>
                        <SelectItem value="Sharing" className="text-xs">Sharing Bed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Check-in */}
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[11px] font-semibold text-slate-700">Check-in</Label>
                    <Input
                      type="date"
                      value={hotel.checkIn}
                      onChange={(e) => handleUpdateHotel(index, { checkIn: e.target.value })}
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  {/* Check-out */}
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[11px] font-semibold text-slate-700">Check-out</Label>
                    <Input
                      type="date"
                      value={hotel.checkOut}
                      onChange={(e) => handleUpdateHotel(index, { checkOut: e.target.value })}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Row 2: Quantities, Rates, Extra Bed & Meals (Comfortable, spacious layout - Requirement 2) */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                  {/* Nights */}
                  <div className="space-y-1 lg:col-span-1">
                    <Label className="text-[11px] font-semibold text-slate-700">Nights</Label>
                    <NumericInput
                      min={1}
                      value={hotel.nights}
                      onChange={(val) => handleUpdateHotel(index, { nights: val })}
                      inputClassName="h-8 text-xs font-bold"
                    />
                  </div>

                  {/* Rooms Count */}
                  <div className="space-y-1 lg:col-span-1">
                    <Label className="text-[11px] font-semibold text-slate-700">Rooms</Label>
                    <NumericInput
                      min={1}
                      value={hotel.roomCount}
                      onChange={(val) => handleUpdateHotel(index, { roomCount: val })}
                      inputClassName="h-8 text-xs font-bold"
                    />
                  </div>

                  {/* Room Price / Night */}
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[11px] font-semibold text-slate-700">Rate/Night ({currency})</Label>
                    <NumericInput
                      min={0}
                      allowDecimals={true}
                      value={hotel.roomPricePerNight}
                      onChange={(val) => handleUpdateHotel(index, { roomPricePerNight: val })}
                      inputClassName="h-8 text-xs font-bold"
                    />
                  </div>

                  {/* Extra Bed Section (Expanded spacious width) */}
                  <div className="lg:col-span-4 p-2 bg-slate-50/80 rounded-md border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={Boolean(hotel.hasExtraBed)}
                          onCheckedChange={(checked) =>
                            handleUpdateHotel(index, {
                              hasExtraBed: checked,
                              extraBedCount: hotel.extraBedCount || 1,
                              extraBedPricePerNight: hotel.extraBedPricePerNight || 100,
                            })
                          }
                        />
                        <Label className="text-[11px] font-semibold text-slate-800 flex items-center gap-1 cursor-pointer">
                          <BedDouble className="h-3.5 w-3.5 text-slate-600" />
                          Extra Bed Option
                        </Label>
                      </div>
                      {hotel.hasExtraBed && (
                        <span className="text-[11px] font-mono font-bold text-emerald-700">
                          +{currency} {hotel.extraBedTotal || 0}
                        </span>
                      )}
                    </div>
                    {hotel.hasExtraBed ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-medium">Beds Qty</span>
                          <NumericInput
                            min={1}
                            value={hotel.extraBedCount || 1}
                            onChange={(val) => handleUpdateHotel(index, { extraBedCount: val })}
                            placeholder="Qty"
                            inputClassName="h-7 text-xs font-bold bg-white"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-medium">Rate / Bed / Night</span>
                          <NumericInput
                            min={0}
                            allowDecimals={true}
                            value={hotel.extraBedPricePerNight || 0}
                            onChange={(val) => handleUpdateHotel(index, { extraBedPricePerNight: val })}
                            placeholder="Rate"
                            inputClassName="h-7 text-xs font-bold bg-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground block pt-0.5">No extra bed requested</span>
                    )}
                  </div>

                  {/* Meal Plan Section (Expanded spacious width) */}
                  <div className="lg:col-span-4 p-2 bg-slate-50/80 rounded-md border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Utensils className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                        <Label className="text-[11px] font-semibold text-slate-800">Catering / Meal Plan</Label>
                      </div>
                      {hotel.mealPlan && hotel.mealPlan !== 'None' && (
                        <span className="text-[11px] font-mono font-bold text-emerald-700">
                          +{currency} {hotel.mealTotal || 0}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Select
                        value={hotel.mealPlan}
                        onValueChange={(val) => handleUpdateHotel(index, { mealPlan: val })}
                      >
                        <SelectTrigger className="h-7 text-xs bg-white w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None" className="text-xs">No Meals Included</SelectItem>
                          <SelectItem value="Breakfast" className="text-xs">Daily Breakfast</SelectItem>
                          <SelectItem value="Half Board" className="text-xs">Half Board (2 Meals)</SelectItem>
                          <SelectItem value="Full Board" className="text-xs">Full Board (3 Meals)</SelectItem>
                          <SelectItem value="Sahoor & Iftar" className="text-xs">Sahoor & Iftar (Ramadan)</SelectItem>
                          <SelectItem value="Custom" className="text-xs">Custom Meal Plan</SelectItem>
                        </SelectContent>
                      </Select>

                      {hotel.mealPlan && hotel.mealPlan !== 'None' ? (
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-500 font-medium">Times / Day</span>
                            <NumericInput
                              min={1}
                              max={5}
                              value={hotel.mealTimesPerDay}
                              onChange={(val) => handleUpdateHotel(index, { mealTimesPerDay: val })}
                              placeholder="Times"
                              inputClassName="h-7 text-xs bg-white font-bold"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-500 font-medium">Rate / Pax / Day</span>
                            <NumericInput
                              min={0}
                              allowDecimals={true}
                              value={hotel.mealPricePerPaxPerDay}
                              onChange={(val) => handleUpdateHotel(index, { mealPricePerPaxPerDay: val })}
                              placeholder="Rate"
                              inputClassName="h-7 text-xs bg-white font-bold"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground block pt-0.5">Room only (no catering)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Section 3: Flight & Air Travel Details (Requirement 1) */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="border-b bg-slate-50/50 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plane className="h-4 w-4 text-primary" />
              3. Flight & Air Travel Details
            </CardTitle>
            <CardDescription className="text-xs">
              Add onward/return flight legs with departure/arrival hubs from airport masters, airline, and airfare pricing.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={handleAddFlight}
            size="sm"
            variant="outline"
            className="text-xs gap-1 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Flight Leg
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-3">
          {flights.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-slate-200 rounded-lg p-4">
              <Plane className="h-6 w-6 text-slate-400 mx-auto mb-1.5 opacity-60" />
              <p className="font-semibold text-slate-700">No flight sectors added yet</p>
              <p className="text-[11px] mt-0.5 text-slate-500">Click &quot;Add Flight Leg&quot; to include airport-to-airport flight schedule and ticket cost.</p>
            </div>
          ) : (
            flights.map((item, index) => (
              <div
                key={index}
                className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3 shadow-xs hover:border-slate-300 transition-colors"
              >
                {/* Flight Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 font-bold text-xs flex items-center gap-1">
                      <Plane className="h-3 w-3" />
                      Sector #{index + 1}: {item.flightType === 'RETURN' ? 'Return Flight' : item.flightType === 'DOMESTIC' ? 'Domestic Flight' : 'Onward Flight'}
                    </Badge>
                    <Select
                      value={item.flightType}
                      onValueChange={(val: any) => handleUpdateFlight(index, { flightType: val })}
                    >
                      <SelectTrigger className="h-7 text-xs w-36 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ONWARD" className="text-xs">Onward Flight</SelectItem>
                        <SelectItem value="RETURN" className="text-xs">Return Flight</SelectItem>
                        <SelectItem value="DOMESTIC" className="text-xs">Domestic Flight</SelectItem>
                        <SelectItem value="OTHER" className="text-xs">Connecting / Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 font-mono bg-white px-2.5 py-1 rounded border border-slate-200">
                      {currency} {Number(item.price || 0).toLocaleString()}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFlight(index)}
                      className="text-red-600 hover:bg-red-50 h-7 px-2 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>

                {/* Grid 1: Airport From -> To */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* From Airport */}
                  <div className="space-y-1 p-2.5 bg-white rounded-md border border-slate-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                        <Plane className="h-3 w-3 text-emerald-600" />
                        Departure Hub (From) <span className="text-destructive">*</span>
                      </Label>
                      {item.fromAirportCode && (
                        <Badge variant="secondary" className="font-mono text-[10px] bg-emerald-50 text-emerald-800 font-bold">
                          {item.fromAirportCode}
                        </Badge>
                      )}
                    </div>
                    <SearchableSelect
                      options={airportOptions}
                      value={item.fromAirportId || ''}
                      onValueChange={(val) => {
                        const matched = airports.find((a) => a.id === val);
                        handleUpdateFlight(index, {
                          fromAirportId: matched?.id || val,
                          fromAirportCode: matched?.code || '',
                          fromAirportName: matched?.name || '',
                        });
                      }}
                      placeholder="Select origin airport..."
                      searchPlaceholder="Type airport name or code..."
                      emptyMessage="No airport found in master"
                      className="h-8 text-xs bg-white"
                    />
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-medium">Departure Date</span>
                        <Input
                          type="date"
                          value={item.departureDate}
                          onChange={(e) => handleUpdateFlight(index, { departureDate: e.target.value })}
                          className="h-7 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-medium">Departure Time</span>
                        <Input
                          type="time"
                          value={item.departureTime}
                          onChange={(e) => handleUpdateFlight(index, { departureTime: e.target.value })}
                          className="h-7 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* To Airport */}
                  <div className="space-y-1 p-2.5 bg-white rounded-md border border-slate-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                        <Plane className="h-3 w-3 text-blue-600 rotate-90" />
                        Arrival Hub (To) <span className="text-destructive">*</span>
                      </Label>
                      {item.toAirportCode && (
                        <Badge variant="secondary" className="font-mono text-[10px] bg-blue-50 text-blue-800 font-bold">
                          {item.toAirportCode}
                        </Badge>
                      )}
                    </div>
                    <SearchableSelect
                      options={airportOptions}
                      value={item.toAirportId || ''}
                      onValueChange={(val) => {
                        const matched = airports.find((a) => a.id === val);
                        handleUpdateFlight(index, {
                          toAirportId: matched?.id || val,
                          toAirportCode: matched?.code || '',
                          toAirportName: matched?.name || '',
                        });
                      }}
                      placeholder="Select destination airport..."
                      searchPlaceholder="Type airport name or code..."
                      emptyMessage="No airport found in master"
                      className="h-8 text-xs bg-white"
                    />
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-medium">Arrival Date</span>
                        <Input
                          type="date"
                          value={item.arrivalDate}
                          onChange={(e) => handleUpdateFlight(index, { arrivalDate: e.target.value })}
                          className="h-7 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-medium">Arrival Time</span>
                        <Input
                          type="time"
                          value={item.arrivalTime}
                          onChange={(e) => handleUpdateFlight(index, { arrivalTime: e.target.value })}
                          className="h-7 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid 2: Airline, Flight Number, Price & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end pt-1">
                  {/* Airline Select / Input */}
                  <div className="space-y-1 lg:col-span-4">
                    <Label className="text-[11px] font-semibold text-slate-700">Airline Carrier</Label>
                    <div className="flex gap-1.5">
                      <Select
                        value={COMMON_AIRLINES.includes(item.airline) ? item.airline : 'Custom'}
                        onValueChange={(val) => {
                          if (val !== 'Custom') {
                            handleUpdateFlight(index, { airline: val });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white w-36 shrink-0">
                          <SelectValue placeholder="Select Airline" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_AIRLINES.map((al) => (
                            <SelectItem key={al} value={al} className="text-xs">
                              {al}
                            </SelectItem>
                          ))}
                          <SelectItem value="Custom" className="text-xs text-muted-foreground">Other Airline</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={item.airline}
                        onChange={(e) => handleUpdateFlight(index, { airline: e.target.value })}
                        placeholder="Airline name..."
                        className="h-8 text-xs bg-white flex-1"
                      />
                    </div>
                  </div>

                  {/* Flight Number */}
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[11px] font-semibold text-slate-700">Flight Number</Label>
                    <Input
                      value={item.flightNumber}
                      onChange={(e) => handleUpdateFlight(index, { flightNumber: e.target.value })}
                      placeholder="e.g. SV-782"
                      className="h-8 text-xs font-mono font-bold bg-white"
                    />
                  </div>

                  {/* Flight Notes */}
                  <div className="space-y-1 lg:col-span-3">
                    <Label className="text-[11px] font-semibold text-slate-700">Flight Notes / Baggage</Label>
                    <Input
                      value={item.notes}
                      onChange={(e) => handleUpdateFlight(index, { notes: e.target.value })}
                      placeholder="e.g. 30kg + 7kg cabin baggage"
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  {/* Flight Price */}
                  <div className="space-y-1 lg:col-span-3">
                    <Label className="text-[11px] font-semibold text-slate-700">Total Airfare ({currency})</Label>
                    <NumericInput
                      min={0}
                      allowDecimals={true}
                      value={item.price}
                      onChange={(val) => handleUpdateFlight(index, { price: val })}
                      placeholder="0"
                      inputClassName="h-8 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Section 4: Transportation */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="border-b bg-slate-50/50 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bus className="h-4 w-4 text-primary" />
              4. Transportation & Route Transfers
            </CardTitle>
            <CardDescription className="text-xs">
              Select transport routes and vehicle types with auto-populated editable pricing from master database.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={handleAddTransport}
            size="sm"
            variant="outline"
            className="text-xs gap-1 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Transfer Route
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-3">
          {transports.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-slate-200 rounded-lg p-4">
              No transportation routes added. Click &quot;Add Transfer Route&quot; above to include vehicles.
            </div>
          ) : (
            transports.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end shadow-xs"
              >
                {/* Route Selector */}
                <div className="space-y-1 lg:col-span-4">
                  <Label className="text-[11px] font-semibold text-slate-700">Route / Sector (Master)</Label>
                  <Select
                    value={item.routeId || item.route}
                    onValueChange={(val) => {
                      const matchedRoute = routes.find((r) => r.id === val || r.routeName === val);
                      handleUpdateTransport(index, {
                        routeId: matchedRoute?.id || val,
                        route: matchedRoute?.routeName || (matchedRoute ? `${matchedRoute.city1?.name || ''} to ${matchedRoute.city2?.name || ''}` : val),
                      });
                    }}
                  >
                    <SelectTrigger className="text-xs bg-white h-8">
                      <SelectValue placeholder="Choose Route Sector..." />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.routeName || `${r.city1?.name || ''} to ${r.city2?.name || ''}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vehicle Type Selector */}
                <div className="space-y-1 lg:col-span-3">
                  <Label className="text-[11px] font-semibold text-slate-700">Vehicle Type (Master)</Label>
                  <Select
                    value={
                      item.vehicleTypeId ||
                      vehicleTypes.find((v) => v.vehicleName?.toLowerCase() === item.vehicleType?.toLowerCase())?.id ||
                      item.vehicleType ||
                      ''
                    }
                    onValueChange={(val) => {
                      const matchedVehicle = vehicleTypes.find((v) => v.id === val || v.vehicleName === val);
                      handleUpdateTransport(index, {
                        vehicleTypeId: matchedVehicle?.id || val,
                        vehicleType: matchedVehicle?.vehicleName || val,
                      });
                    }}
                  >
                    <SelectTrigger className="text-xs bg-white h-8">
                      <SelectValue placeholder="Choose Vehicle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.length > 0 ? (
                        vehicleTypes.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-xs">
                            {v.vehicleName} {v.paxCount ? `(${v.paxCount} Pax)` : ''}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="Sedan" className="text-xs">Sedan (4 Seater)</SelectItem>
                          <SelectItem value="GMC" className="text-xs">GMC / SUV (7 Seater)</SelectItem>
                          <SelectItem value="HiAce" className="text-xs">HiAce Van (10-14 Seater)</SelectItem>
                          <SelectItem value="Coaster" className="text-xs">Coaster (20-30 Seater)</SelectItem>
                          <SelectItem value="Luxury Bus" className="text-xs">Luxury Bus (49 Seater)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Qty */}
                <div className="space-y-1 lg:col-span-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Qty</Label>
                  <NumericInput
                    min={1}
                    value={item.vehicleCount}
                    onChange={(val) => handleUpdateTransport(index, { vehicleCount: val })}
                    inputClassName="h-8 text-xs font-bold"
                  />
                </div>

                {/* Price */}
                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-[11px] font-semibold text-slate-700">Price ({currency})</Label>
                  <NumericInput
                    min={0}
                    allowDecimals={true}
                    value={item.price}
                    onChange={(val) => handleUpdateTransport(index, { price: val })}
                    inputClassName="h-8 text-xs font-bold text-slate-900"
                  />
                </div>

                {/* Action */}
                <div className="lg:col-span-2 flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTransport(index)}
                    className="text-red-600 hover:bg-red-50 h-8 px-2 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Section 5: Visas & Additional Services */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="border-b bg-slate-50/50 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              5. Visas, Ziyarat & Additional Services
            </CardTitle>
            <CardDescription className="text-xs">
              Include Umrah visas with insurance, historical Ziyarat, permits, or high-speed train tickets.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={handleAddAdditionalItem}
            size="sm"
            variant="outline"
            className="text-xs gap-1 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Custom Service
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Visa Inclusion Toggle & Rates */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-slate-900">Include Umrah Visa & Insurance</Label>
                <p className="text-[11px] text-muted-foreground">Automatically calculate visa rates for {adultsCount} adults and {childrenCount} children.</p>
              </div>
              <Switch checked={includeVisas} onCheckedChange={setIncludeVisas} />
            </div>

            {includeVisas && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Adult Visa Rate ({currency})</Label>
                  <NumericInput
                    min={0}
                    allowDecimals={true}
                    value={adultVisaRate}
                    onChange={(val) => setAdultVisaRate(val)}
                    inputClassName="h-8 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Child Visa Rate ({currency})</Label>
                  <NumericInput
                    min={0}
                    allowDecimals={true}
                    value={childVisaRate}
                    onChange={(val) => setChildVisaRate(val)}
                    inputClassName="h-8 text-xs font-bold"
                  />
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 flex flex-col justify-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Visa Cost</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {currency} {totalVisaAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Additional Items List */}
          {additionalItems.length > 0 && (
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold text-slate-800">Additional Services & Activities</Label>
              {additionalItems.map((item, index) => (
                <div
                  key={index}
                  className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end shadow-xs"
                >
                  <div className="space-y-1 sm:col-span-6">
                    <Label className="text-[11px] font-semibold text-slate-700">Service Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => handleUpdateAdditionalItem(index, { description: e.target.value })}
                      placeholder="e.g. Haramain High Speed Train Tickets"
                      className="text-xs bg-white h-8"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] font-semibold text-slate-700">Quantity</Label>
                    <NumericInput
                      min={1}
                      value={item.quantity}
                      onChange={(val) => handleUpdateAdditionalItem(index, { quantity: val })}
                      inputClassName="h-8 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] font-semibold text-slate-700">Rate ({currency})</Label>
                    <NumericInput
                      min={0}
                      allowDecimals={true}
                      value={item.rate}
                      onChange={(val) => handleUpdateAdditionalItem(index, { rate: val })}
                      inputClassName="h-8 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {currency} {(item.total || 0).toLocaleString()}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAdditionalItem(index)}
                      className="text-red-600 hover:bg-red-50 h-8 px-2 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Financial Summary, Discounts & Inclusions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Col: Inclusions & Terms */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="border-b bg-slate-50/50 pb-2">
              <CardTitle className="text-xs font-bold text-slate-800">
                Package Inclusions, Exclusions & Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-emerald-800">Package Inclusions</Label>
                <Textarea
                  value={inclusions}
                  onChange={(e) => setInclusions(e.target.value)}
                  placeholder="• Hotel Stay as mentioned&#10;• Daily Breakfast&#10;• Flight tickets as specified&#10;• Private Ground Transfers&#10;• Umrah Visa Processing"
                  rows={3}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Package Exclusions</Label>
                <Textarea
                  value={exclusions}
                  onChange={(e) => setExclusions(e.target.value)}
                  placeholder="• Personal expenses & laundry&#10;• Room service / additional meals&#10;• Excess baggage charges"
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Terms & Conditions</Label>
                <Textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="• 50% advance upon confirmation&#10;• Subject to room and flight availability at the time of booking"
                  rows={2}
                  className="text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Grand Total Calculation & Per Pax Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="shadow-xs border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-900 text-white p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Financial Summary</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black">{currency} {grandTotal.toLocaleString()}</span>
                <span className="text-xs font-semibold text-slate-300">{totalPax} Total Pax</span>
              </div>
            </div>

            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-muted-foreground pb-1.5 border-b">
                <span>Accommodation ({hotels.length} Stays):</span>
                <strong className="text-slate-900">{currency} {totalHotelAmount.toLocaleString()}</strong>
              </div>

              {totalExtraBedAmount > 0 && (
                <div className="flex justify-between text-slate-700 pb-1.5 border-b">
                  <span>↳ Included Extra Beds:</span>
                  <strong>{currency} {totalExtraBedAmount.toLocaleString()}</strong>
                </div>
              )}

              {totalMealAmount > 0 && (
                <div className="flex justify-between text-emerald-700 pb-1.5 border-b">
                  <span>Meal Plans:</span>
                  <strong>{currency} {totalMealAmount.toLocaleString()}</strong>
                </div>
              )}

              {totalFlightAmount > 0 && (
                <div className="flex justify-between text-blue-700 pb-1.5 border-b">
                  <span>Flights ({flights.length} Sectors):</span>
                  <strong>{currency} {totalFlightAmount.toLocaleString()}</strong>
                </div>
              )}

              {totalTransportAmount > 0 && (
                <div className="flex justify-between text-muted-foreground pb-1.5 border-b">
                  <span>Transfers ({transports.length} Routes):</span>
                  <strong className="text-slate-900">{currency} {totalTransportAmount.toLocaleString()}</strong>
                </div>
              )}

              {totalVisaAmount > 0 && (
                <div className="flex justify-between text-muted-foreground pb-1.5 border-b">
                  <span>Visas & Health Insurance:</span>
                  <strong className="text-slate-900">{currency} {totalVisaAmount.toLocaleString()}</strong>
                </div>
              )}

              {totalAdditionalAmount > 0 && (
                <div className="flex justify-between text-muted-foreground pb-1.5 border-b">
                  <span>Additional Services:</span>
                  <strong className="text-slate-900">{currency} {totalAdditionalAmount.toLocaleString()}</strong>
                </div>
              )}

              <div className="flex justify-between text-slate-900 font-bold pt-1 pb-1.5 border-b text-[13px]">
                <span>Subtotal:</span>
                <span>{currency} {subtotal.toLocaleString()}</span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-muted-foreground">Discount Amount:</span>
                <NumericInput
                  min={0}
                  allowDecimals={true}
                  value={discountAmount}
                  onChange={(val) => setDiscountAmount(val)}
                  inputClassName="h-7 text-xs w-28 text-right font-bold text-red-600"
                />
              </div>

              {/* Pilgrim Rate Specification Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 mt-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Rate Per Pilgrim Specification
                </span>
                <div className="flex justify-between text-xs font-semibold text-slate-800">
                  <span>Per Adult Rate ({adultsCount} Adults):</span>
                  <strong className="text-slate-900 font-mono">{currency} {pricePerAdult.toLocaleString()}</strong>
                </div>
                {childrenCount > 0 && (
                  <div className="flex justify-between text-xs font-semibold text-slate-800">
                    <span>Per Child Rate ({childrenCount} Children):</span>
                    <strong className="text-slate-900 font-mono">{currency} {pricePerChild.toLocaleString()}</strong>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  onClick={() => handleSave('list')}
                  disabled={saving}
                  className="w-full text-xs font-bold gap-1.5 shadow-xs h-9"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEdit ? 'Save & Update Quotation' : 'Save & Finalize Quotation'}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSave('email')}
                    disabled={saving}
                    className="text-xs gap-1.5 h-8"
                  >
                    <Mail className="h-3.5 w-3.5 text-slate-600" />
                    Email to Client
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSave('whatsapp')}
                    disabled={saving}
                    className="text-xs gap-1.5 h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      {createdQuotation && (
        <>
          <DownloadQuotationDialog
            open={downloadDialogOpen}
            onOpenChange={(open) => {
              setDownloadDialogOpen(open);
              if (!open) {
                router.push('/dashboard/quotations');
              }
            }}
            quotation={createdQuotation}
          />
          <EmailQuotationDialog
            isOpen={emailDialogOpen}
            onClose={() => {
              setEmailDialogOpen(false);
              router.push('/dashboard/quotations');
            }}
            quotation={createdQuotation}
          />
          <WhatsAppQuotationDialog
            isOpen={whatsappDialogOpen}
            onClose={() => {
              setWhatsappDialogOpen(false);
              router.push('/dashboard/quotations');
            }}
            quotation={createdQuotation}
          />
        </>
      )}
    </div>
  );
}
