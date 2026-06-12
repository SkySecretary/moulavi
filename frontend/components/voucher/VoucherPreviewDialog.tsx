'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Minus, Trash2, Truck, Users, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { umrahVisaAPI, transportMasterAPI, transportRouteMasterAPI, cityMasterAPI, locationMasterAPI, partyAPI } from '@/lib/api';
import api from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { RouteType } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { formatFlightNumber, toDisplayDate, fromDisplayDate } from '@/lib/umrah/validation';
import { DatePicker } from '@/components/ui/date-picker';

interface VoucherPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  onSuccess: () => void;
}

interface HotelSchedule {
  number: number;
  location: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  days: number;
  brn?: string | null;
  cityId?: string;
  city?: string;
  hotelId?: string; // LocationMaster ID for the hotel
}

interface MovementDetail {
  sr: number;
  route: string;
  date: string;
  time: string;
  from: string; // City name
  fromLocation: string; // Specific location (Airport, Hotel, Ziyarat)
  fromCityId?: string;
  fromLocationId?: string;
  to: string; // City name
  toLocation: string; // Specific location (Airport, Hotel, Ziyarat)
  toCityId?: string;
  toLocationId?: string;
  driverDetails1?: string;
  driverDetails2?: string;
  vehicleNumber?: string;
  paxCount?: number | null;
  price?: number | null;
  vehicleType?: string | null;
  viaBdr?: boolean;
}

interface FlightDetail {
  type: 'AA' | 'AD';
  date: string;
  carrier: string;
  number: string;
  arrivalAirportId?: string;
  arrivalAirport?: string;
  departureAirportId?: string;
  departureAirport?: string;
  from?: string; // Legacy field, kept for backward compatibility
  to?: string; // Legacy field, kept for backward compatibility
  etd: string;
  eta: string;
}

interface TransportOption {
  transportId: string;
  routeId: string;
  route: {
    id: string;
    city1: { id: string; name: string } | null;
    city2: { id: string; name: string } | null;
    city3: { id: string; name: string } | null;
    city4: { id: string; name: string } | null;
    routeType: string;
  } | null;
  vehicleType: {
    id: string;
    vehicleName: string;
    paxCount: number;
  } | null;
  price: number;
  quantity: number;
}

export function VoucherPreviewDialog({
  open,
  onOpenChange,
  bookingId,
  onSuccess,
}: VoucherPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Master Data
  const [cities, setCities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [hotelsByCity, setHotelsByCity] = useState<Map<string, any[]>>(new Map());
  const [airportsByCity, setAirportsByCity] = useState<Map<string, any[]>>(new Map());
  const [bookingParty, setBookingParty] = useState<any>(null);
  const [transportCompanies, setTransportCompanies] = useState<any[]>([]);
  const [selectedTransportCompanyId, setSelectedTransportCompanyId] = useState<string>('');
  
  const [voucherData, setVoucherData] = useState({
    reservationDate: '',
    guestName: '',
    guestMobile: '',
    groupCode: '',
    paxCount: 0,
    vehicleType: '',
    bookingReference: '',
    umrahVisaProvider: null as {
      partyName: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      contactNumber?: string;
      whatsappNumber?: string;
      email?: string;
      logoPath?: string;
    } | null,
    hotelSchedules: [] as HotelSchedule[],
    movementDetails: [] as MovementDetail[],
    flightDetails: [] as FlightDetail[],
    transportOptions: [] as TransportOption[],
  });
  const [loadingTransports, setLoadingTransports] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeTypeFilter, setRouteTypeFilter] = useState<RouteType | 'all'>('all');
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [routeTransports, setRouteTransports] = useState<any[]>([]);
  const isLoadingRef = useRef(false);
  const loadedBookingIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Load data when dialog opens (only once per bookingId, prevent concurrent loads)
    if (open && bookingId && loadedBookingIdRef.current !== bookingId && !isLoadingRef.current) {
      isLoadingRef.current = true;
      loadedBookingIdRef.current = bookingId;
      
      const loadData = async () => {
        try {
          await loadMasterData();
          await loadVoucherData();
        } catch (error) {
          // Reset on error so it can retry
          loadedBookingIdRef.current = null;
        } finally {
          isLoadingRef.current = false;
        }
      };
      loadData();
    }
    
    // Reset when dialog closes
    if (!open) {
      loadedBookingIdRef.current = null;
      isLoadingRef.current = false;
    }
  }, [open, bookingId]);

  const loadMasterData = async () => {
    // Skip if already loaded
    if (cities.length > 0 && locations.length > 0 && transportCompanies.length > 0) return;
    
    try {
      const [citiesRes, locationsRes, partiesRes] = await Promise.all([
        cityMasterAPI.getActive(),
        locationMasterAPI.getActive(),
        partyAPI.getAll({ is_supplier: 'true', supplier_service_type: 'transport_service', limit: 1000 }),
      ]);
      
      const citiesData = citiesRes.data?.cityMasters || citiesRes.data || [];
      const locationsData = locationsRes.data?.locationMasters || locationsRes.data || [];
      const partiesData = partiesRes.data?.parties || partiesRes.data?.data?.parties || [];
      
      setCities(citiesData);
      setLocations(locationsData);
      
      // Transport companies - already filtered by API but keeping safety filter
      setTransportCompanies(partiesData.filter((p: any) => {
        const types = p.supplierServiceTypes || [];
        return p.isSupplier && Array.isArray(types) && types.includes('transport_service');
      }));
      
      // Group locations by city and type
      const hotelsByCityMap = new Map<string, any[]>();
      const airportsByCityMap = new Map<string, any[]>();
      
      locationsData.forEach((loc: any) => {
        const cityKey = (loc.city || loc.cityMaster?.name || '').toLowerCase();
        if (!cityKey) return;
        
        const locationType = (loc.locationType || '').toUpperCase();
        if (locationType === 'HOTEL') {
          if (!hotelsByCityMap.has(cityKey)) {
            hotelsByCityMap.set(cityKey, []);
          }
          hotelsByCityMap.get(cityKey)!.push(loc);
        } else if (locationType === 'AIRPORT') {
          if (!airportsByCityMap.has(cityKey)) {
            airportsByCityMap.set(cityKey, []);
          }
          airportsByCityMap.get(cityKey)!.push(loc);
        }
      });
      
      setHotelsByCity(hotelsByCityMap);
      setAirportsByCity(airportsByCityMap);
    } catch (error: any) {
      console.error('Error loading master data:', error);
      toast.error('Failed to load master data');
    }
  };

  const loadVoucherData = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const response = await umrahVisaAPI.getVoucherData(bookingId);
      const data = response.data;
      
      setBookingParty(data.party || null);
      
      // Get current cities state (use functional update to ensure we have latest)
      const currentCities = cities.length > 0 ? cities : (await cityMasterAPI.getActive()).data?.cityMasters || (await cityMasterAPI.getActive()).data || [];
      
      setVoucherData({
        reservationDate: data.reservationDate ? toDisplayDate(data.reservationDate) : '',
        guestName: data.guestName || '',
        guestMobile: data.guestMobile || '',
        groupCode: data.groupCode || '',
        paxCount: data.paxCount || 0,
        bookingReference: data.bookingReference || '',
        umrahVisaProvider: data.umrahVisaProvider || null,
        hotelSchedules: (data.hotelSchedules || []).map((hs: any) => {
          // Get city name from cities array if cityId is present
          const cityObj = currentCities.find((c: any) => c.id === hs.cityId);
          const cityName = cityObj?.name || hs.city || hs.location || '';
          
          return {
          ...hs,
            cityId: hs.cityId || '', // Use ID directly from backend
            city: cityName, // Use city name from cities array or fallback to backend value
            hotelId: hs.hotelId || '', // Use ID directly from backend
          checkIn: hs.checkIn ? toDisplayDate(hs.checkIn) : '',
          checkOut: hs.checkOut ? toDisplayDate(hs.checkOut) : '',
          };
        }),
        movementDetails: (data.movementDetails || []).map((m: any, idx: number) => {
          // Handle date format - backend sends DD-MM-YYYY, convert to DD/MM/YY for state
          const dateValue = m.date ? toDisplayDate(m.date) : '';

          // Get city names from cities array if cityIds are present
          const fromCityObj = currentCities.find((c: any) => c.id === m.fromCityId);
          const fromCityName = fromCityObj?.name || m.from || '';
          const toCityObj = currentCities.find((c: any) => c.id === m.toCityId);
          const toCityName = toCityObj?.name || m.to || '';

          return {
            ...m,
            sr: idx + 1,
            date: dateValue,
            time: m.time ? (typeof m.time === 'string' && m.time.includes('T') ? m.time.split('T')[1].slice(0, 5) : m.time.slice(0, 5)) : '',
            // Use IDs directly from backend
            fromCityId: m.fromCityId || '',
            fromLocationId: m.fromLocationId || '',
            toCityId: m.toCityId || '',
            toLocationId: m.toLocationId || '',
            // Ensure from/to and fromLocation/toLocation are properly set
            from: fromCityName, // Use city name from cities array or fallback to backend value
            fromLocation: m.fromLocation || '',
            to: toCityName, // Use city name from cities array or fallback to backend value
            toLocation: m.toLocation || '',
            driverDetails1: m.driverDetails1 || '',
            driverDetails2: m.driverDetails2 || '',
            vehicleNumber: m.vehicleNumber || '',
            vehicleType: m.vehicleType || data.vehicleType || '',
            viaBdr: !!m.viaBdr || !!m.viabadrOverride,
          };
        }),
        vehicleType: data.vehicleType || '',
        flightDetails: (data.flightDetails || []).map((fd: any) => ({
          ...fd,
          arrivalAirportId: fd.arrivalAirportId || '',
          arrivalAirport: fd.arrivalAirport || fd.from || '',
          departureAirportId: fd.departureAirportId || '',
          departureAirport: fd.departureAirport || fd.to || '',
          date: fd.date ? toDisplayDate(fd.date) : '',
        })),
        transportOptions: (data.transportOptions || []) as TransportOption[],
      });
      
      // Auto-select route from existing transport options if available
      if (data.transportOptions && data.transportOptions.length > 0) {
        const firstTransportRouteId = data.transportOptions[0]?.routeId;
        if (firstTransportRouteId) {
          setSelectedRouteId(firstTransportRouteId);
        }
      }

      // Initialize selectedTransportCompanyId from data
      setSelectedTransportCompanyId(data.transportCompany?.id || '');

    } catch (error: any) {
      console.error('Error loading voucher data:', error);
      toast.error(error.message || 'Failed to load voucher data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    if (timeString.includes('T')) {
      return timeString.split('T')[1].slice(0, 5);
    }
    return timeString.slice(0, 5);
  };

  const calculateDays = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Load all active routes
  useEffect(() => {
    if (open) {
      loadRoutes();
    }
  }, [open]);

  const loadRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const response = await transportRouteMasterAPI.getActive();
      const routes = response.data.transportRouteMasters || [];
      setAvailableRoutes(routes);
      
      // Auto-select first route if available
      if (routes.length > 0 && !selectedRouteId) {
        setSelectedRouteId(routes[0].id);
      }
    } catch (error: any) {
      console.error('Error loading routes:', error);
      toast.error('Failed to load routes');
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Filter routes by routeType
  const filteredRoutes = availableRoutes.filter(route => {
    if (routeTypeFilter === 'all') return true;
    return route.routeType === routeTypeFilter;
  });

  // Load transports when route is selected
  useEffect(() => {
    const loadTransports = async () => {
      if (!selectedRouteId) {
        setRouteTransports([]);
        return;
      }

      setLoadingTransports(true);
      try {
        const response = await transportMasterAPI.getByRoute(selectedRouteId);
        const transports = response.data.transportMasters || [];
        setRouteTransports(transports);
      } catch (error: any) {
        console.error('Error loading transports:', error);
        toast.error('Failed to load transport vehicles');
        setRouteTransports([]);
      } finally {
        setLoadingTransports(false);
      }
    };

    loadTransports();
  }, [selectedRouteId]);

  // Helper function to format route display
  const formatRouteDisplay = (route: any): string => {
    if (!route || Object.keys(route).length === 0) return 'No route';
    
    const cities = [
      route.city1?.name || (route.city1Id ? 'City 1' : null),
      route.city2?.name || (route.city2Id ? 'City 2' : null),
      route.city3?.name || (route.city3Id ? 'City 3' : null),
      route.city4?.name || (route.city4Id ? 'City 4' : null),
    ].filter(Boolean);
    
    if (cities.length === 0) return `Route (${route.routeType || 'Custom'})`;
    
    const routeString = cities.join(' → ');
    const routeTypeLabel = route.routeType
      ? route.routeType
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : '';
      
    return routeTypeLabel ? `${routeString} (${routeTypeLabel})` : routeString;
  };

  const handleTransportQuantityChange = (transportId: string, delta: number) => {
    const existingIndex = voucherData.transportOptions.findIndex(t => t.transportId === transportId);
    
    if (existingIndex >= 0) {
      // Update existing transport quantity
      const updated = [...voucherData.transportOptions];
      const currentQty = updated[existingIndex]?.quantity || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      if (newQty === 0) {
        // Remove if quantity becomes 0
        updated.splice(existingIndex, 1);
      } else {
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
      }
      setVoucherData({ ...voucherData, transportOptions: updated });
    } else {
      // Add new transport
      const transport = routeTransports.find(t => t.id === transportId);
      if (transport && transport.vehicleType) {
        const newTransport: TransportOption = {
          transportId: transport.id,
          routeId: transport.routeId,
          route: transport.route ? {
            id: transport.route.id,
            city1: transport.route.city1,
            city2: transport.route.city2,
            city3: transport.route.city3,
            city4: transport.route.city4,
            routeType: transport.route.routeType,
          } : null,
          vehicleType: transport.vehicleType,
          price: Number(transport.price),
          quantity: 1,
        };
        setVoucherData({
          ...voucherData,
          transportOptions: [...voucherData.transportOptions, newTransport],
        });
      }
    }
  };


  const handleHotelScheduleChange = (index: number, field: keyof HotelSchedule, value: any) => {
    const updated = [...voucherData.hotelSchedules];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'checkIn' || field === 'checkOut') {
      updated[index].days = calculateDays(updated[index].checkIn, updated[index].checkOut);
    }
    
    setVoucherData({ ...voucherData, hotelSchedules: updated });
  };

  const handleMovementChange = (index: number, field: keyof MovementDetail, value: any) => {
    const updated = [...voucherData.movementDetails];
    updated[index] = { ...updated[index], [field]: value };
    setVoucherData({ ...voucherData, movementDetails: updated });
  };

  const handleFlightChange = (index: number, field: keyof FlightDetail, value: any) => {
    const updated = [...voucherData.flightDetails];
    updated[index] = { ...updated[index], [field]: value };
    setVoucherData({ ...voucherData, flightDetails: updated });
  };

  const addHotel = () => {
    const newHotel: HotelSchedule = {
      number: voucherData.hotelSchedules.length + 1,
      location: '',
      hotelName: '',
      checkIn: '',
      checkOut: '',
      days: 0,
      brn: null,
      cityId: '',
      city: '',
    };
    setVoucherData({
      ...voucherData,
      hotelSchedules: [...voucherData.hotelSchedules, newHotel],
    });
  };

  const removeHotel = (index: number) => {
    const updated = voucherData.hotelSchedules.filter((_, i) => i !== index);
    // Re-number hotel numbers
    updated.forEach((h, idx) => {
      h.number = idx + 1;
    });
    setVoucherData({ ...voucherData, hotelSchedules: updated });
  };

  const addMovement = () => {
    const newMovement: MovementDetail = {
      sr: voucherData.movementDetails.length + 1,
      route: '',
      date: '',
      time: '',
      from: '',
      fromLocation: '',
      fromCityId: '',
      fromLocationId: '',
      to: '',
      toLocation: '',
      toCityId: '',
      toLocationId: '',
      driverDetails1: '',
      driverDetails2: '',
      vehicleNumber: '',
    };
    setVoucherData({
      ...voucherData,
      movementDetails: [...voucherData.movementDetails, newMovement],
    });
  };

  const removeMovement = (index: number) => {
    const updated = voucherData.movementDetails.filter((_, i) => i !== index);
    // Re-number
    updated.forEach((m, idx) => { m.sr = idx + 1; });
    setVoucherData({ ...voucherData, movementDetails: updated });
  };

  const handleSubmit = async () => {
    if (!selectedTransportCompanyId) {
      toast.error('Please select a Transport Company');
      return;
    }

    if (voucherData.transportOptions.length === 0) {
      toast.error('At least one transportation option must be selected');
      return;
    }

    try {
      setSubmitting(true);
      
      // Format data for submission
      // Note: reservationNumber and route numbers are NOT sent - they will be generated by backend
      const submissionData = {
        ...voucherData,
        reservationDate: fromDisplayDate(voucherData.reservationDate),
        transportCompanyId: selectedTransportCompanyId || undefined,
        vehicleType: voucherData.vehicleType || undefined,
        hotelSchedules: voucherData.hotelSchedules.map((hs, idx) => ({
          number: idx + 1,
          location: hs.city || hs.location || '', // Send city name as location (backend expects this)
          hotelName: hs.hotelName || '',
          checkIn: fromDisplayDate(hs.checkIn),
          checkOut: fromDisplayDate(hs.checkOut),
          days: hs.days || 0,
          brn: hs.brn || null,
        })),
        movementDetails: voucherData.movementDetails.map((md) => {
          const { route, ...rest } = md; // Remove route - will be generated by backend
          return {
            ...rest,
            date: fromDisplayDate(md.date),
            time: md.time,
            viaBdr: md.viaBdr,
            vehicleType: md.vehicleType,
          };
        }),
        flightDetails: voucherData.flightDetails.map((fd) => ({
          ...fd,
          date: fromDisplayDate(fd.date),
        })),
      };


      const response = await umrahVisaAPI.generateVoucher(bookingId, submissionData);
      const generatedVoucher = response.data?.data?.voucher || response.data?.voucher || response.data;
      
      if (!generatedVoucher) {
        throw new Error('Voucher was created but data was not returned');
      }
      
      toast.success('Voucher generated successfully!');
      
      // Generate and download PDF using the voucher data returned from backend
      try {
        const pdfData = {
          voucherNumber: generatedVoucher.voucherNumber,
          bookingReference: generatedVoucher.bookingReference || '',
          reservationNumber: generatedVoucher.reservationNumber || '',
          reservationDate: generatedVoucher.reservationDate,
          guestName: generatedVoucher.guestName,
          guestMobile: generatedVoucher.guestMobile || '',
          groupCode: generatedVoucher.groupCode || '',
          paxCount: generatedVoucher.paxCount,
          vehicleType: generatedVoucher.vehicleType || '',
          umrahCompany: generatedVoucher.umrahCompany || null,
          agentParty: generatedVoucher.agentParty || null,
          transportCompany: generatedVoucher.transportCompany || null,
          hotelSchedules: generatedVoucher.hotelSchedules || [],
          movementDetails: generatedVoucher.movementDetails || [],
          flightDetails: generatedVoucher.flightDetails || [],
        };

        // Call backend to generate PDF
        const pdfResponse = await api.post('/umrah-visa/generate-pdf', pdfData, {
          responseType: 'blob',
        });

        // Create blob and download
        const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${pdfData.voucherNumber.replace(/^UB-/, '')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        toast.error('Voucher saved but PDF generation failed');
      }
      
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate voucher');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Voucher Preview & Generation</DialogTitle>
            <DialogDescription>Loading voucher data...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <p>Loading voucher data...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle>Voucher Preview & Generation</DialogTitle>
          <DialogDescription>
            Review and edit voucher details before generating
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="space-y-6 pb-4">
            {/* Reservation Summary */}
            <div className="space-y-4 p-4 border rounded-lg bg-white">
              <h3 className="font-semibold text-lg">Reservation Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reservation Date</Label>
                  <DatePicker
                    value={voucherData.reservationDate}
                    onChange={(val) => setVoucherData({ ...voucherData, reservationDate: val })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Guest Name</Label>
                  <Input
                    value={voucherData.guestName}
                    onChange={(e) => setVoucherData({ ...voucherData, guestName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Guest Mobile</Label>
                  <Input
                    value={voucherData.guestMobile}
                    onChange={(e) => setVoucherData({ ...voucherData, guestMobile: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Group Code</Label>
                  <Input
                    value={voucherData.groupCode}
                    onChange={(e) => setVoucherData({ ...voucherData, groupCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pax Count</Label>
                  <Input
                    type="number"
                    value={voucherData.paxCount}
                    onChange={(e) => setVoucherData({ ...voucherData, paxCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vehicle Type</Label>
                  <Input
                    value={voucherData.vehicleType}
                    onChange={(e) => setVoucherData({ ...voucherData, vehicleType: e.target.value })}
                    placeholder="e.g. GMC, Hiace, Bus"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transport Company</Label>
                  <Select value={selectedTransportCompanyId} onValueChange={setSelectedTransportCompanyId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Transport Company" />
                    </SelectTrigger>
                    <SelectContent>
                      {transportCompanies.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.partyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Hotel Schedules */}
            <div className="space-y-4 p-4 border rounded-lg bg-white">
              <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Hotel Schedules</h3>
                <Button type="button" size="sm" onClick={addHotel} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Hotel
                </Button>
              </div>
              {voucherData.hotelSchedules.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No hotel bookings found. Click "Add Hotel" to add one.</p>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="min-w-[150px]">City</TableHead>
                        <TableHead className="min-w-[200px]">Hotel Name</TableHead>
                        <TableHead className="w-32">Number of Days</TableHead>
                        <TableHead className="w-40">Check In</TableHead>
                        <TableHead className="w-40">Check Out</TableHead>
                        <TableHead className="w-16">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {voucherData.hotelSchedules.map((hotel, idx) => {
                        // Get city name from cities array using cityId, fallback to hotel.city
                        const cityObj = cities.find(c => c.id === hotel.cityId);
                        const cityName = cityObj?.name || hotel.city || '';
                        const cityKey = cityName.toLowerCase();
                        const availableHotels = hotelsByCity.get(cityKey) || [];
                        
                        return (
                        <TableRow key={idx}>
                          <TableCell>{hotel.number}</TableCell>
                            <TableCell>
                              <Select
                                value={hotel.cityId || ''}
                                onValueChange={(value) => {
                                  const selectedCity = cities.find(c => c.id === value);
                                  handleHotelScheduleChange(idx, 'cityId', value);
                                  handleHotelScheduleChange(idx, 'city', selectedCity?.name || '');
                                  handleHotelScheduleChange(idx, 'location', selectedCity?.name || '');
                                  handleHotelScheduleChange(idx, 'hotelName', '');
                                  // Clear hotelId when city changes
                                  const updated = [...voucherData.hotelSchedules];
                                  (updated[idx] as any).hotelId = '';
                                  setVoucherData({ ...voucherData, hotelSchedules: updated });
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select City" />
                                </SelectTrigger>
                                <SelectContent>
                                  {cities.map((city) => (
                                    <SelectItem key={city.id} value={city.id}>
                                      {city.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={(hotel as any).hotelId || ''}
                                onValueChange={(value) => {
                                  const selectedHotel = availableHotels.find(l => l.id === value);
                                  if (selectedHotel) {
                                    handleHotelScheduleChange(idx, 'hotelName', selectedHotel.name);
                                    // Store hotelId in the hotel object
                                    const updated = [...voucherData.hotelSchedules];
                                    (updated[idx] as any).hotelId = value;
                                    setVoucherData({ ...voucherData, hotelSchedules: updated });
                                  }
                                }}
                                disabled={!hotel.cityId}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder={hotel.cityId ? "Select Hotel" : "Select city first"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableHotels.length === 0 ? (
                                    <SelectItem value="no-hotels" disabled>
                                      {hotel.cityId ? "No hotels in this city" : "Select city first"}
                                    </SelectItem>
                                  ) : (
                                    availableHotels.map((loc) => (
                                      <SelectItem key={loc.id} value={loc.id}>
                                        {loc.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          <TableCell>{hotel.days}</TableCell>
                          <TableCell>
                            <DatePicker
                              value={hotel.checkIn}
                              onChange={(val) => handleHotelScheduleChange(idx, 'checkIn', val)}
                              className="w-40"
                            />
                          </TableCell>
                          <TableCell>
                            <DatePicker
                              value={hotel.checkOut}
                              onChange={(val) => handleHotelScheduleChange(idx, 'checkOut', val)}
                              className="w-40"
                            />
                          </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeHotel(idx)}
                              >
                                <Trash2 className="h-4 w-4 text-primary" />
                              </Button>
                            </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Movement Details */}
            <div className="space-y-4 p-4 border rounded-lg bg-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Movement Details</h3>
                <Button type="button" size="sm" onClick={addMovement} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Movement
                </Button>
              </div>
              {voucherData.movementDetails.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No movement details found. Click "Add Movement" to add one.</p>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Sr</TableHead>
                        <TableHead className="w-32">Date</TableHead>
                        <TableHead className="w-24">Time</TableHead>
                        <TableHead className="min-w-[100px]">From City</TableHead>
                        <TableHead className="min-w-[120px]">From Location</TableHead>
                        <TableHead className="min-w-[100px]">To City</TableHead>
                        <TableHead className="min-w-[120px]">To Location</TableHead>
                        <TableHead className="min-w-[120px]">Driver Details 1</TableHead>
                        <TableHead className="min-w-[120px]">Driver Details 2</TableHead>
                        <TableHead className="min-w-[120px]">Vehicle No</TableHead>
                        <TableHead className="min-w-[100px]">Vehicle Type</TableHead>
                        <TableHead className="w-16">Bdr</TableHead>
                        <TableHead className="w-16">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {voucherData.movementDetails.map((movement, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{movement.sr}</TableCell>
                          <TableCell>
                            <DatePicker
                              value={movement.date}
                              onChange={(val) => handleMovementChange(idx, 'date', val)}
                              className="w-40"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={movement.time}
                              onChange={(e) => handleMovementChange(idx, 'time', e.target.value)}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Select
                                value={movement.fromCityId || ''}
                                onValueChange={(value) => {
                                  const selectedCity = cities.find(c => c.id === value);
                                  handleMovementChange(idx, 'fromCityId', value);
                                  handleMovementChange(idx, 'from', selectedCity?.name || '');
                                  handleMovementChange(idx, 'fromLocationId', '');
                                  handleMovementChange(idx, 'fromLocation', '');
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="From City" />
                                </SelectTrigger>
                                <SelectContent>
                                  {cities.map((city) => (
                                    <SelectItem key={city.id} value={city.id}>
                                      {city.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={movement.fromLocationId || ''}
                              onValueChange={(value) => {
                                // Get city name from cities array using fromCityId
                                const cityObj = cities.find(c => c.id === movement.fromCityId);
                                const cityName = cityObj?.name || movement.from || '';
                                const cityKey = cityName.toLowerCase();
                                const allLocations = [...(hotelsByCity.get(cityKey) || []), ...(airportsByCity.get(cityKey) || [])];
                                const selectedLocation = allLocations.find(l => l.id === value);
                                handleMovementChange(idx, 'fromLocationId', value);
                                handleMovementChange(idx, 'fromLocation', selectedLocation?.name || '');
                              }}
                              disabled={!movement.fromCityId}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={movement.fromCityId ? "From Location" : "Select city first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {(() => {
                                  // Get city name from cities array using fromCityId
                                  const cityObj = cities.find(c => c.id === movement.fromCityId);
                                  const cityName = cityObj?.name || movement.from || '';
                                  const cityKey = cityName.toLowerCase();
                                  const allLocations = [...(hotelsByCity.get(cityKey) || []), ...(airportsByCity.get(cityKey) || [])];
                                  return allLocations.length === 0 ? (
                                    <SelectItem value="no-locations" disabled>
                                      {movement.fromCityId ? "No locations in this city" : "Select city first"}
                                    </SelectItem>
                                  ) : (
                                    allLocations.map((loc) => (
                                      <SelectItem key={loc.id} value={loc.id}>
                                        {loc.name}
                                      </SelectItem>
                                    ))
                                  );
                                })()}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Select
                                value={movement.toCityId || ''}
                                onValueChange={(value) => {
                                  const selectedCity = cities.find(c => c.id === value);
                                  handleMovementChange(idx, 'toCityId', value);
                                  handleMovementChange(idx, 'to', selectedCity?.name || '');
                                  handleMovementChange(idx, 'toLocationId', '');
                                  handleMovementChange(idx, 'toLocation', '');
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="To City" />
                                </SelectTrigger>
                                <SelectContent>
                                  {cities.map((city) => (
                                    <SelectItem key={city.id} value={city.id}>
                                      {city.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={movement.toLocationId || ''}
                              onValueChange={(value) => {
                                // Get city name from cities array using toCityId
                                const cityObj = cities.find(c => c.id === movement.toCityId);
                                const cityName = cityObj?.name || movement.to || '';
                                const cityKey = cityName.toLowerCase();
                                const allLocations = [...(hotelsByCity.get(cityKey) || []), ...(airportsByCity.get(cityKey) || [])];
                                const selectedLocation = allLocations.find(l => l.id === value);
                                handleMovementChange(idx, 'toLocationId', value);
                                handleMovementChange(idx, 'toLocation', selectedLocation?.name || '');
                              }}
                              disabled={!movement.toCityId}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={movement.toCityId ? "To Location" : "Select city first"}>
                                  {movement.toLocation || (movement.toCityId ? "To Location" : "Select city first")}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {(() => {
                                  // Get city name from cities array using toCityId
                                  const cityObj = cities.find(c => c.id === movement.toCityId);
                                  const cityName = cityObj?.name || movement.to || '';
                                  const cityKey = cityName.toLowerCase();
                                  const allLocations = [...(hotelsByCity.get(cityKey) || []), ...(airportsByCity.get(cityKey) || [])];
                                  return allLocations.length === 0 ? (
                                    <SelectItem value="no-locations" disabled>
                                      {movement.toCityId ? "No locations in this city" : "Select city first"}
                                    </SelectItem>
                                  ) : (
                                    allLocations.map((loc) => (
                                      <SelectItem key={loc.id} value={loc.id}>
                                        {loc.name}
                                      </SelectItem>
                                    ))
                                  );
                                })()}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-2">
                            <Textarea
                              value={movement.driverDetails1 || ''}
                              onChange={(e) => handleMovementChange(idx, 'driverDetails1', e.target.value)}
                              className="min-w-[120px] min-h-[60px] resize-none text-sm"
                              placeholder="Driver 1"
                              rows={2}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Textarea
                              value={movement.driverDetails2 || ''}
                              onChange={(e) => handleMovementChange(idx, 'driverDetails2', e.target.value)}
                              className="min-w-[120px] min-h-[60px] resize-none text-sm"
                              placeholder="Driver 2"
                              rows={2}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Textarea
                              value={movement.vehicleNumber || ''}
                              onChange={(e) => handleMovementChange(idx, 'vehicleNumber', e.target.value)}
                              className="min-w-[120px] min-h-[60px] resize-none text-sm"
                              placeholder="Vehicle No"
                              rows={2}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              value={movement.vehicleType || ''}
                              onChange={(e) => handleMovementChange(idx, 'vehicleType', e.target.value)}
                              className="min-w-[100px] text-sm"
                              placeholder="Type"
                            />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={!!movement.viaBdr}
                              onCheckedChange={(checked) => handleMovementChange(idx, 'viaBdr', !!checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeMovement(idx)}
                            >
                              <Trash2 className="h-4 w-4 text-primary" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Flight Details */}
            <div className="space-y-4 p-4 border rounded-lg bg-white">
              <h3 className="font-semibold text-lg">Flight Details</h3>
              {voucherData.flightDetails.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No flight details found for this reservation.</p>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4">
                  <Table className="border border-slate-100 rounded-lg overflow-hidden">
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-16 text-[10px] font-bold uppercase py-3">Type</TableHead>
                        <TableHead className="w-32 text-[10px] font-bold uppercase py-3">Date</TableHead>
                        <TableHead className="w-24 text-[10px] font-bold uppercase py-3">Carrier</TableHead>
                        <TableHead className="w-24 text-[10px] font-bold uppercase py-3">Number</TableHead>
                        <TableHead className="w-28 text-[10px] font-bold uppercase py-3">Airport</TableHead>
                        <TableHead className="w-20 text-[10px] font-bold uppercase py-3">Dest</TableHead>
                        <TableHead className="w-28 text-[10px] font-bold uppercase py-3">ETD</TableHead>
                        <TableHead className="w-28 text-[10px] font-bold uppercase py-3">ETA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {voucherData.flightDetails.map((flight, idx) => (
                        <TableRow key={idx} className="h-12 border-slate-50 hover:bg-slate-50/30 transition-colors">
                          <TableCell>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              flight.type === 'AA' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {flight.type === 'AA' ? 'ARR' : 'DEP'}
                            </span>
                          </TableCell>
                          <TableCell className="text-[10px] font-medium text-slate-600">
                            <DatePicker
                              value={flight.date}
                              onChange={(val) => handleFlightChange(idx, 'date', val)}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={flight.carrier}
                              onChange={(e) => handleFlightChange(idx, 'carrier', e.target.value.toUpperCase())}
                              className="h-8 w-16 text-[10px] font-bold text-slate-900 border-slate-200 bg-white"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={flight.number}
                              onChange={(e) => {
                                const formatted = formatFlightNumber(e.target.value);
                                handleFlightChange(idx, 'number', formatted);
                              }}
                              className="h-8 w-16 text-[10px] font-bold text-slate-900 border-slate-200 bg-white"
                            />
                          </TableCell>
                          <TableCell>
                            {flight.type === 'AA' ? (
                              <Select
                                value={flight.arrivalAirportId || ''}
                                onValueChange={(value) => {
                                  const selectedAirport = locations.find((loc: any) => loc.id === value && (loc.locationType || '').toUpperCase() === 'AIRPORT');
                                  handleFlightChange(idx, 'arrivalAirportId', value);
                                  handleFlightChange(idx, 'arrivalAirport', selectedAirport?.name || '');
                                }}
                              >
                                <SelectTrigger className="h-8 w-24 text-[10px] font-bold text-slate-900 border-slate-200 bg-white">
                                  <SelectValue placeholder="Port" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {locations
                                    .filter((loc: any) => (loc.locationType || '').toUpperCase() === 'AIRPORT')
                                    .map((airport: any) => (
                                      <SelectItem key={airport.id} value={airport.id} className="text-[10px] font-medium">
                                        {airport.name || airport.code}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select
                                value={flight.departureAirportId || ''}
                                onValueChange={(value) => {
                                  const selectedAirport = locations.find((loc: any) => loc.id === value && (loc.locationType || '').toUpperCase() === 'AIRPORT');
                                  handleFlightChange(idx, 'departureAirportId', value);
                                  handleFlightChange(idx, 'departureAirport', selectedAirport?.name || '');
                                }}
                              >
                                <SelectTrigger className="h-8 w-24 text-[10px] font-bold text-slate-900 border-slate-200 bg-white">
                                  <SelectValue placeholder="Port" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {locations
                                    .filter((loc: any) => (loc.locationType || '').toUpperCase() === 'AIRPORT')
                                    .map((airport: any) => (
                                      <SelectItem key={airport.id} value={airport.id} className="text-[10px] font-medium">
                                        {airport.name || airport.code}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-[10px] font-bold text-slate-400">JED</span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={formatTime(flight.etd)}
                              onChange={(e) => handleFlightChange(idx, 'etd', e.target.value)}
                              className="h-8 w-24 text-[10px] font-bold text-slate-900 border-slate-200 bg-white"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={formatTime(flight.eta)}
                              onChange={(e) => handleFlightChange(idx, 'eta', e.target.value)}
                              className="h-8 w-24 text-[10px] font-bold text-slate-900 border-slate-200 bg-white"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Transport Options */}
            <div className="space-y-4 p-4 border rounded-lg bg-white">
              <h3 className="font-semibold text-lg">Transport Options</h3>
              
              {/* Route Summary */}
              {selectedRouteId && (
                <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatRouteDisplay(availableRoutes.find(r => r.id === selectedRouteId) || {})}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {voucherData.paxCount || 0} Passengers
                    </p>
                  </div>
                </div>
              )}

              {/* Filters */}
              {loadingRoutes ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Filter by Route Type</label>
                    <Select
                      value={routeTypeFilter}
                      onValueChange={(value) => setRouteTypeFilter(value as RouteType | 'all')}
                      disabled={loadingRoutes}
                    >
                      <SelectTrigger className="w-full border-gray-300">
                        <SelectValue placeholder="Select route type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Route Types</SelectItem>
                        <SelectItem value="fulltrip">Full Trip</SelectItem>
                        <SelectItem value="airporttocity">Airport to City</SelectItem>
                        <SelectItem value="citytocity">City to City</SelectItem>
                        <SelectItem value="citytoairport">City to Airport</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Select Route</label>
                    <Select
                      value={selectedRouteId || ''}
                      onValueChange={(value) => setSelectedRouteId(value || null)}
                      disabled={loadingRoutes || filteredRoutes.length === 0}
                    >
                      <SelectTrigger className="w-full border-gray-300">
                        <SelectValue placeholder="Select a route" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredRoutes.length === 0 ? (
                          <SelectItem value="__no_routes__" disabled>
                            No routes available
                          </SelectItem>
                        ) : (
                          filteredRoutes.map((route) => (
                            <SelectItem key={route.id} value={route.id}>
                              {formatRouteDisplay(route)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Transport Table */}
              {selectedRouteId && (
                <>
                  {loadingTransports ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-gray-600">Loading transport vehicles...</span>
                    </div>
                  ) : routeTransports.length === 0 ? (
                    <div className="text-center py-8">
                      <Truck className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No transport vehicles available for this route.</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-medium text-gray-700">Vehicle Name</TableHead>
                            <TableHead className="font-medium text-gray-700">Capacity</TableHead>
                            <TableHead className="font-medium text-gray-700">Price</TableHead>
                            <TableHead className="font-medium text-gray-700">Quantity</TableHead>
                            <TableHead className="font-medium text-gray-700 text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {routeTransports.map((transport) => {
                            if (!transport.vehicleType) return null;
                            const selectedTransport = voucherData.transportOptions.find(t => t.transportId === transport.id);
                            const quantity = selectedTransport?.quantity || 0;
                            const price = Number(transport.price);
                            const total = price * quantity;
                            const isSelected = quantity > 0;
                            return (
                              <TableRow 
                                key={transport.id}
                                className={isSelected ? 'bg-destructive/5' : ''}
                              >
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Truck className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                                    <span className="font-medium text-gray-900">{transport.vehicleType.vehicleName}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Users className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-700">{transport.vehicleType.paxCount} PAX</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium text-gray-900">{formatCurrency(price, bookingParty?.accountCurrency)}</span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTransportQuantityChange(transport.id, -1)}
                                      disabled={quantity === 0}
                                      className="h-7 w-7 p-0 border-gray-300 hover:bg-destructive/5 hover:border-red-300"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className={`text-sm font-medium w-8 text-center ${
                                      isSelected ? 'text-primary' : 'text-gray-900'
                                    }`}>
                                      {quantity}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTransportQuantityChange(transport.id, 1)}
                                      className="h-7 w-7 p-0 border-gray-300 hover:bg-destructive/5 hover:border-red-300"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className={`font-semibold ${
                                    isSelected ? 'text-primary' : 'text-gray-900'
                                  }`}>
                                    {formatCurrency(total, bookingParty?.accountCurrency)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-4 border-t flex-shrink-0 bg-white">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || voucherData.transportOptions.length === 0 || !selectedTransportCompanyId}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Voucher'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

