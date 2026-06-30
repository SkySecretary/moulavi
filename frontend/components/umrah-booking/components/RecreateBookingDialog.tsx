'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Loader2, Plane, Building, Users, Route } from 'lucide-react';
import { umrahVisaAPI, locationMasterAPI, partyAPI } from '@/lib/api';
import { toast } from 'sonner';
import { toDisplayDate, extractDateFromISO, extractTimeFromISO, combineDateAndTime } from '@/lib/umrah/validation';
import { useRouter } from 'next/navigation';

interface RecreateBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  selectedPassengerIds: string[];
  onSuccess: () => void;
}

export const RecreateBookingDialog: React.FC<RecreateBookingDialogProps> = ({
  isOpen,
  onClose,
  booking,
  selectedPassengerIds,
  onSuccess,
}) => {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [loadingMaster, setLoadingMaster] = useState(false);
  
  // Master Lists
  const [airports, setAirports] = useState<any[]>([]);
  const [umrahCompanies, setUmrahCompanies] = useState<any[]>([]);
  const [transportCompanies, setTransportCompanies] = useState<any[]>([]);

  // Form states
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('20:30');
  const [arrivalAirportId, setArrivalAirportId] = useState('');
  const [arrivalFlightNumber, setArrivalFlightNumber] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('20:30');
  const [departureAirportId, setDepartureAirportId] = useState('');
  const [departureFlightNumber, setDepartureFlightNumber] = useState('');
  const [brn, setBrn] = useState('');
  
  const [umrahVisaProviderId, setUmrahVisaProviderId] = useState('');
  const [transportCompanyId, setTransportCompanyId] = useState('');

  // Editable lists states
  const [hotels, setHotels] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);

  const selectedPassengers = booking?.passengers?.filter((p: any) => 
    selectedPassengerIds.includes(p.id)
  ) || [];

  useEffect(() => {
    if (isOpen && booking) {
      loadMasterData();
      initializeForm();
    }
  }, [isOpen, booking]);

  const loadMasterData = async () => {
    try {
      setLoadingMaster(true);
      const [airportsRes, umrahCompaniesRes, transportCompaniesRes] = await Promise.all([
        locationMasterAPI.getActive({ locationType: 'AIRPORT' }),
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
      ]);

      const airportsRaw = airportsRes.data.locationMasters || (Array.isArray(airportsRes.data) ? airportsRes.data : []);
      setAirports(airportsRaw);
      setUmrahCompanies(umrahCompaniesRes.data?.parties || umrahCompaniesRes.data || []);
      setTransportCompanies(transportCompaniesRes.data?.parties || transportCompaniesRes.data || []);
    } catch (error) {
      console.error('Error loading master data:', error);
      toast.error('Failed to load airports and companies master list');
    } finally {
      setLoadingMaster(false);
    }
  };

  const initializeForm = () => {
    // Populate form with parent travel details
    const mainTravel = booking.travelDetails?.find((t: any) => !t.isAlternate);
    if (mainTravel) {
      if (mainTravel.arrivalDateTime) {
        setArrivalDate(toDisplayDate(extractDateFromISO(mainTravel.arrivalDateTime)));
        setArrivalTime(extractTimeFromISO(mainTravel.arrivalDateTime));
      }
      setArrivalAirportId(mainTravel.arrivalAirportId || '');
      setArrivalFlightNumber(mainTravel.arrivalFlightNumber || '');

      if (mainTravel.departureDateTime) {
        setDepartureDate(toDisplayDate(extractDateFromISO(mainTravel.departureDateTime)));
        setDepartureTime(extractTimeFromISO(mainTravel.departureDateTime));
      }
      setDepartureAirportId(mainTravel.departureAirportId || '');
      setDepartureFlightNumber(mainTravel.departureFlightNumber || '');
      setBrn(mainTravel.brn || '');
    }

    setUmrahVisaProviderId(booking.umrahVisaProviderId || '');
    setTransportCompanyId(booking.transportCompanyId || '');

    // Populate hotels and movements
    if (booking.hotelBookings) {
      setHotels(booking.hotelBookings.filter((hb: any) => !hb.isAlternate).map((hb: any) => ({
        cityId: hb.cityId,
        hotelId: hb.hotelId,
        cityName: hb.city?.name || 'N/A',
        hotelName: hb.hotel?.name || 'N/A',
        checkInDate: toDisplayDate(hb.checkInDate),
        checkOutDate: toDisplayDate(hb.checkOutDate),
        brn: hb.brn || '',
        isAlternate: false
      })));
    }

    if (booking.movementDetails) {
      setMovements(booking.movementDetails.filter((md: any) => !md.isAlternate).map((md: any) => {
        let dateStr = '';
        let timeStr = '20:30';
        if (md.travelDateTime) {
          dateStr = toDisplayDate(extractDateFromISO(md.travelDateTime));
          timeStr = extractTimeFromISO(md.travelDateTime);
        }
        return {
          id: md.id,
          date: dateStr,
          time: timeStr,
          fromLocationId: md.fromLocationId,
          toLocationId: md.toLocationId,
          fromCityId: md.fromCityId,
          toCityId: md.toCityId,
          fromName: `${md.fromCity?.name || md.fromLocation?.cityMaster?.name || 'N/A'} - ${md.fromLocation?.name || 'N/A'}`,
          toName: `${md.toCity?.name || md.toLocation?.cityMaster?.name || 'N/A'} - ${md.toLocation?.name || 'N/A'}`,
          isAlternate: false
        };
      }));
    }
  };

  const handleRecreate = async () => {
    if (selectedPassengerIds.length === 0) {
      toast.error('No passengers selected');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        passengerIds: selectedPassengerIds,
        arrivalDateTime: combineDateAndTime(arrivalDate, arrivalTime),
        departureDateTime: combineDateAndTime(departureDate, departureTime),
        arrivalAirportId,
        arrivalFlightNumber,
        departureAirportId,
        departureFlightNumber,
        brn,
        umrahVisaProviderId,
        transportCompanyId,
        hotels: hotels.map((h: any) => ({
          cityId: h.cityId,
          hotelId: h.hotelId,
          checkInDate: combineDateAndTime(h.checkInDate, '20:30'),
          checkOutDate: combineDateAndTime(h.checkOutDate, '20:30'),
          brn: h.brn,
          isAlternate: false
        })),
        movements: movements.map((m: any) => ({
          travelDateTime: combineDateAndTime(m.date, m.time),
          fromCityId: m.fromCityId,
          fromLocationId: m.fromLocationId,
          toCityId: m.toCityId,
          toLocationId: m.toLocationId,
          isAlternate: false
        }))
      };

      const response = await umrahVisaAPI.recreateBooking(booking.id, payload);
      toast.success('Booking recreated/split successfully!');
      onSuccess();
      onClose();
      
      // Redirect to the new booking view page!
      if (response.data?.bookingId) {
        router.push(`/dashboard/umrah-visa/visa-management/view/${response.data.bookingId}`);
      }
    } catch (error: any) {
      console.error('Error recreating booking:', error);
      toast.error(error.response?.data?.error || 'Failed to split booking');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Recreate / Split Booking
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Recreate a separate booking with different travel or supplier details for selected passengers under the same group code.
          </DialogDescription>
        </DialogHeader>

        {loadingMaster ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-650" />
            <span className="ml-2 text-sm text-gray-500">Loading master files...</span>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Selected Passengers list summary */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block mb-2">
                Selected Passengers ({selectedPassengers.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedPassengers.map((p: any) => (
                  <div key={p.id} className="bg-white border px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-800 shadow-sm flex items-center gap-1.5">
                    <span>{p.fullName}</span>
                    <span className="text-[10px] text-gray-400 font-mono">({p.passportNumber || 'No Passport'})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Travel details section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Arrival */}
              <div className="border-l-4 border-sky-500 pl-4 py-1 space-y-4">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Plane className="h-4 w-4 text-sky-500" /> Arrival Settings
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-500">Arrival Date</Label>
                    <DatePicker value={arrivalDate} onChange={setArrivalDate} disabled={submitting} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-500">Arrival Time</Label>
                    <TimePicker value={arrivalTime} onChange={setArrivalTime} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-gray-500">Arrival Airport</Label>
                  <Select value={arrivalAirportId} onValueChange={setArrivalAirportId}>
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue placeholder="Select airport" />
                    </SelectTrigger>
                    <SelectContent>
                      {airports.map(a => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.code} - {a.name || a.airportName} ({a.city || ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-gray-500">Arrival Flight Number</Label>
                  <Input 
                    value={arrivalFlightNumber} 
                    onChange={(e) => setArrivalFlightNumber(e.target.value.toUpperCase())} 
                    placeholder="e.g. SV-123"
                    className="text-xs h-9 bg-white"
                  />
                </div>
              </div>

              {/* Departure */}
              <div className="border-l-4 border-orange-500 pl-4 py-1 space-y-4">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Plane className="h-4 w-4 text-orange-500 rotate-90" /> Departure Settings
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-500">Departure Date</Label>
                    <DatePicker value={departureDate} onChange={setDepartureDate} disabled={submitting} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-500">Departure Time</Label>
                    <TimePicker value={departureTime} onChange={setDepartureTime} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-gray-500">Departure Airport</Label>
                  <Select value={departureAirportId} onValueChange={setDepartureAirportId}>
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue placeholder="Select airport" />
                    </SelectTrigger>
                    <SelectContent>
                      {airports.map(a => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.code} - {a.name || a.airportName} ({a.city || ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-gray-500">Departure Flight Number</Label>
                  <Input 
                    value={departureFlightNumber} 
                    onChange={(e) => setDepartureFlightNumber(e.target.value.toUpperCase())} 
                    placeholder="e.g. SV-124"
                    className="text-xs h-9 bg-white"
                  />
                </div>
              </div>
            </div>
            {/* Hotel Bookings (Editable) */}
            {hotels.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-indigo-650" /> Hotel Bookings
                </span>
                <div className="space-y-3">
                  {hotels.map((h, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border text-xs space-y-3">
                      <div className="flex justify-between items-center font-bold text-gray-800">
                        <span>{h.cityName} - {h.hotelName}</span>
                        <span className="text-[10px] text-gray-400 font-normal">Hotel Booking #{idx + 1}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-gray-500">Check-In Date</Label>
                          <DatePicker
                            value={h.checkInDate}
                            onChange={(val) => {
                              setHotels(prev => prev.map((item, i) => i === idx ? { ...item, checkInDate: val } : item));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-gray-500">Check-Out Date</Label>
                          <DatePicker
                            value={h.checkOutDate}
                            onChange={(val) => {
                              setHotels(prev => prev.map((item, i) => i === idx ? { ...item, checkOutDate: val } : item));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-gray-500">Hotel BRN</Label>
                          <Input
                            value={h.brn}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHotels(prev => prev.map((item, i) => i === idx ? { ...item, brn: val } : item));
                            }}
                            placeholder="BRN Code"
                            className="text-xs h-9 bg-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Movements (Editable) */}
            {movements.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Route className="h-4 w-4 text-amber-600" /> Movement Schedule
                </span>
                <div className="space-y-3">
                  {movements.map((m, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border text-xs space-y-3">
                      <div className="flex justify-between items-center font-bold text-gray-800">
                        <span>{m.fromName} → {m.toName}</span>
                        <span className="text-[10px] text-gray-400 font-normal">Movement #{idx + 1}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-gray-500">Travel Date</Label>
                          <DatePicker
                            value={m.date}
                            onChange={(val) => {
                              setMovements(prev => prev.map((item, i) => i === idx ? { ...item, date: val } : item));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-gray-500">Travel Time</Label>
                          <TimePicker
                            value={m.time}
                            onChange={(val) => {
                              setMovements(prev => prev.map((item, i) => i === idx ? { ...item, time: val } : item));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-gray-500">Travel BRN</Label>
                <Input 
                  value={brn} 
                  onChange={(e) => setBrn(e.target.value)} 
                  placeholder="Leave empty to copy parent"
                  className="text-xs h-9 bg-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-gray-500">Umrah Company Supplier</Label>
                <Select value={umrahVisaProviderId} onValueChange={setUmrahVisaProviderId}>
                  <SelectTrigger className="text-xs h-9 bg-white">
                    <SelectValue placeholder="Select Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {umrahCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.partyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-gray-500">Transport Company</Label>
                <Select value={transportCompanyId} onValueChange={setTransportCompanyId}>
                  <SelectTrigger className="text-xs h-9 bg-white">
                    <SelectValue placeholder="Select Transport Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {transportCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.partyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRecreate}
            disabled={submitting || selectedPassengerIds.length === 0 || loadingMaster}
            className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Splitting Booking...
              </>
            ) : (
              'Recreate Booking'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
