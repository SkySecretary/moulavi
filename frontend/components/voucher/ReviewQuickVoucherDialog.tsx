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
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Trash2, Truck, Users, MapPin, Loader2, CheckCircle2, XCircle, AlertCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { voucherAPI, cityMasterAPI, locationMasterAPI, partyAPI } from '@/lib/api';
import api from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatFlightNumber, toDisplayDate, fromDisplayDate } from '@/lib/umrah/validation';
import { DatePicker } from '@/components/ui/date-picker';

interface ReviewQuickVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any | null;
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
  cateringBrn?: string | null;
  cityId?: string;
  city?: string;
  hotelId?: string;
}

interface MovementDetail {
  sr: number;
  route?: string | null;
  date: string;
  time: string;
  from: string;
  fromLocation: string;
  fromCityId?: string;
  fromLocationId?: string;
  to: string;
  toLocation: string;
  toCityId?: string;
  toLocationId?: string;
  driverDetails1?: string;
  driverDetails2?: string;
  vehicleNumber?: string;
  paxCount?: number | null;
  price?: number | null;
  vehicleType?: string | null;
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
  from?: string;
  to?: string;
  etd: string;
  eta: string;
}

export function ReviewQuickVoucherDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: ReviewQuickVoucherDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Master Data
  const [cities, setCities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [umrahCompanies, setUmrahCompanies] = useState<any[]>([]);
  const [transportCompanies, setTransportCompanies] = useState<any[]>([]);
  const [hotelsByCity, setHotelsByCity] = useState<Map<string, any[]>>(new Map());
  const [airportsByCity, setAirportsByCity] = useState<Map<string, any[]>>(new Map());

  // Form State
  const [formData, setFormData] = useState({
    guestName: '',
    guestMobile: '',
    groupCode: '',
    paxCount: 1,
    reservationDate: '',
    partyId: '',
    umrahCompanyId: '',
    transportCompanyId: '',
    hotelSchedules: [] as HotelSchedule[],
    movementDetails: [] as MovementDetail[],
    flightDetails: [] as FlightDetail[],
  });

  useEffect(() => {
    if (open && request) {
      loadMasterData();
      initializeFromRequest(request);
      setShowRejectForm(false);
      setRejectionReason('');
    }
  }, [open, request]);

  const loadMasterData = async () => {
    try {
      const [citiesRes, locationsRes, partiesRes] = await Promise.all([
        cityMasterAPI.getActive(),
        locationMasterAPI.getActive(),
        partyAPI.getAll({ limit: '1000' }),
      ]);

      const citiesData = citiesRes.data?.cityMasters || citiesRes.data || [];
      const locationsData = locationsRes.data?.locationMasters || locationsRes.data || [];
      const partiesData = partiesRes.data?.data?.parties || partiesRes.data?.parties || [];

      setCities(citiesData);
      setLocations(locationsData);
      setParties(partiesData.filter((p: any) => p.isCustomer));

      const suppliers = partiesData.filter((p: any) => p.isSupplier);
      setUmrahCompanies(suppliers.filter((p: any) => {
        const types = p.supplierServiceTypes || [];
        return Array.isArray(types) && types.includes('umrah_service');
      }));
      setTransportCompanies(suppliers.filter((p: any) => {
        const types = p.supplierServiceTypes || [];
        return Array.isArray(types) && types.includes('transport_service');
      }));

      const hotelsMap = new Map<string, any[]>();
      const airportsMap = new Map<string, any[]>();

      locationsData.forEach((loc: any) => {
        const cityKey = (loc.city || loc.cityMaster?.name || '').toLowerCase().trim();
        if (!cityKey) return;
        const type = (loc.locationType || '').toUpperCase();
        if (type === 'HOTEL') {
          if (!hotelsMap.has(cityKey)) hotelsMap.set(cityKey, []);
          hotelsMap.get(cityKey)!.push(loc);
        } else if (type === 'AIRPORT') {
          if (!airportsMap.has(cityKey)) airportsMap.set(cityKey, []);
          airportsMap.get(cityKey)!.push(loc);
        }
      });

      setHotelsByCity(hotelsMap);
      setAirportsByCity(airportsMap);
    } catch (err) {
      console.error('Failed to load masters:', err);
    }
  };

  const initializeFromRequest = (req: any) => {
    const rawHotels = req.hotelSchedules && Array.isArray(req.hotelSchedules) ? req.hotelSchedules : [];
    const rawMovements = req.movementDetails && Array.isArray(req.movementDetails) ? req.movementDetails : [];
    const rawFlights = req.flightDetails && Array.isArray(req.flightDetails) ? req.flightDetails : [];

    setFormData({
      guestName: req.guestName || '',
      guestMobile: req.guestMobile || '',
      groupCode: req.groupCode || '',
      paxCount: req.paxCount || 1,
      reservationDate: req.reservationDate ? toDisplayDate(req.reservationDate) : toDisplayDate(new Date().toISOString()),
      partyId: req.partyId || req.party?.id || '',
      umrahCompanyId: req.umrahCompanyId || '',
      transportCompanyId: req.transportCompanyId || '',
      hotelSchedules: rawHotels.map((h: any, idx: number) => ({
        number: h.number || idx + 1,
        location: h.location || h.city || '',
        hotelName: h.hotelName || '',
        checkIn: h.checkIn ? toDisplayDate(h.checkIn) : '',
        checkOut: h.checkOut ? toDisplayDate(h.checkOut) : '',
        days: h.days || 1,
        brn: h.brn || '',
        cateringBrn: h.cateringBrn || '',
        cityId: h.cityId || '',
        city: h.location || h.city || '',
      })),
      movementDetails: rawMovements.map((m: any, idx: number) => ({
        sr: m.sr || idx + 1,
        route: m.route || null,
        date: m.date ? toDisplayDate(m.date) : '',
        time: m.time || '',
        from: m.from || '',
        fromLocation: m.fromLocation || '',
        fromLocationId: m.fromLocationId || '',
        to: m.to || '',
        toLocation: m.toLocation || '',
        toLocationId: m.toLocationId || '',
        driverDetails1: m.driverDetails1 || '',
        driverDetails2: m.driverDetails2 || '',
        vehicleNumber: m.vehicleNumber || '',
        paxCount: m.paxCount || req.paxCount || 1,
        vehicleType: m.vehicleType || '',
      })),
      flightDetails: rawFlights.map((f: any) => ({
        type: f.type || 'AA',
        date: f.date ? toDisplayDate(f.date) : '',
        carrier: f.carrier || '',
        number: f.number || '',
        arrivalAirportId: f.arrivalAirportId || f.fromLocationId || '',
        arrivalAirport: f.arrivalAirport || f.from || '',
        departureAirportId: f.departureAirportId || f.toLocationId || '',
        departureAirport: f.departureAirport || f.to || '',
        from: f.from || '',
        to: f.to || '',
        etd: f.etd || '',
        eta: f.eta || '',
      })),
    });
  };

  const calculateDays = (inStr: string, outStr: string) => {
    if (!inStr || !outStr) return 0;
    const inDate = new Date(fromDisplayDate(inStr));
    const outDate = new Date(fromDisplayDate(outStr));
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return 0;
    return Math.max(1, Math.ceil(Math.abs(outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const addHotel = () => {
    setFormData(prev => ({
      ...prev,
      hotelSchedules: [
        ...prev.hotelSchedules,
        {
          number: prev.hotelSchedules.length + 1,
          location: '',
          hotelName: '',
          checkIn: '',
          checkOut: '',
          days: 1,
          brn: '',
        }
      ]
    }));
  };

  const removeHotel = (idx: number) => {
    setFormData(prev => {
      const updated = prev.hotelSchedules.filter((_, i) => i !== idx);
      return {
        ...prev,
        hotelSchedules: updated.map((h, i) => ({ ...h, number: i + 1 }))
      };
    });
  };

  const addMovement = () => {
    setFormData(prev => ({
      ...prev,
      movementDetails: [
        ...prev.movementDetails,
        {
          sr: prev.movementDetails.length + 1,
          date: '',
          time: '20:30',
          from: '',
          fromLocation: '',
          to: '',
          toLocation: '',
          driverDetails1: '',
          driverDetails2: '',
          vehicleNumber: '',
          paxCount: prev.paxCount,
          vehicleType: '',
        }
      ]
    }));
  };

  const removeMovement = (idx: number) => {
    setFormData(prev => {
      const updated = prev.movementDetails.filter((_, i) => i !== idx);
      return {
        ...prev,
        movementDetails: updated.map((m, i) => ({ ...m, sr: i + 1 }))
      };
    });
  };

  const handleApprove = async () => {
    if (!formData.guestName || !formData.paxCount) {
      toast.error('Guest name and Pax count are required');
      return;
    }
    if (!formData.transportCompanyId) {
      toast.error('Please assign a Transport Company');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        guestName: formData.guestName,
        guestMobile: formData.guestMobile,
        groupCode: formData.groupCode,
        paxCount: formData.paxCount,
        reservationDate: fromDisplayDate(formData.reservationDate),
        partyId: formData.partyId || null,
        umrahCompanyId: formData.umrahCompanyId || null,
        transportCompanyId: formData.transportCompanyId || null,
        hotelSchedules: formData.hotelSchedules.map((h, idx) => ({
          number: idx + 1,
          location: h.location || h.city || '',
          hotelName: h.hotelName || '',
          checkIn: fromDisplayDate(h.checkIn),
          checkOut: fromDisplayDate(h.checkOut),
          days: calculateDays(h.checkIn, h.checkOut),
          brn: h.brn || null,
          cateringBrn: h.cateringBrn || null,
        })),
        movementDetails: formData.movementDetails.map((m, idx) => ({
          sr: idx + 1,
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
          paxCount: m.paxCount || formData.paxCount,
          vehicleType: m.vehicleType || null,
        })),
        flightDetails: formData.flightDetails.map((f) => ({
          type: f.type,
          date: fromDisplayDate(f.date),
          carrier: f.carrier,
          number: f.number,
          from: f.type === 'AA' ? (f.arrivalAirport || f.from || '') : 'JED',
          to: f.type === 'AD' ? (f.departureAirport || f.to || '') : 'JED',
          arrivalAirportId: f.arrivalAirportId || null,
          departureAirportId: f.departureAirportId || null,
          etd: f.etd || '',
          eta: f.eta || '',
        })),
      };

      const response = await voucherAPI.approveQuickRequest(request.id, payload);
      const generatedVoucher = response.data?.voucher;

      toast.success(response.data?.message || 'Quick voucher request approved and voucher generated!');

      // Trigger automatic PDF generation
      if (generatedVoucher) {
        try {
          const pdfData = {
            voucherNumber: generatedVoucher.voucherNumber,
            bookingReference: generatedVoucher.bookingReference || '',
            reservationNumber: generatedVoucher.voucherNumber,
            reservationDate: generatedVoucher.reservationDate,
            guestName: generatedVoucher.guestName,
            guestMobile: generatedVoucher.guestMobile || '',
            groupCode: generatedVoucher.groupCode || '',
            paxCount: generatedVoucher.paxCount,
            umrahCompany: generatedVoucher.umrahCompany || null,
            agentParty: generatedVoucher.party || null,
            transportCompany: generatedVoucher.transportCompany || null,
            hotelSchedules: payload.hotelSchedules,
            movementDetails: payload.movementDetails,
            flightDetails: payload.flightDetails,
          };

          const pdfRes = await api.post('/umrah-visa/generate-pdf', pdfData, { responseType: 'blob' });
          const blob = new Blob([pdfRes.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Voucher-${generatedVoucher.voucherNumber}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (pdfErr) {
          console.error('PDF generation error:', pdfErr);
        }
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('Approval failed:', err);
      toast.error(err?.response?.data?.error || 'Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setRejecting(true);
      await voucherAPI.rejectQuickRequest(request.id, rejectionReason);
      toast.success('Quick voucher request rejected');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('Rejection failed:', err);
      toast.error(err?.response?.data?.error || 'Failed to reject request');
    } finally {
      setRejecting(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b bg-slate-900 text-white flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-slate-950 font-black text-xs uppercase px-2 py-0.5">
                  Request #{request.requestNumber}
                </Badge>
                <DialogTitle className="text-lg font-bold text-white tracking-tight">
                  Review & Approve Quick Voucher Request
                </DialogTitle>
              </div>
              <DialogDescription className="text-slate-300 text-xs mt-1">
                Agency: <span className="font-bold text-sky-400">{request.party?.partyName || 'N/A'}</span> • Submitted on {new Date(request.createdAt).toLocaleString()}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-400/50 text-amber-300 bg-amber-950/30 text-xs uppercase">
                Status: {request.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 min-h-0 bg-slate-50/50">
          {/* Rejection Prompt Banner */}
          {showRejectForm && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                Reject Quick Voucher Request
              </div>
              <p className="text-xs text-rose-700">
                Please provide an optional reason for rejecting this request. The agency will be notified.
              </p>
              <Textarea
                placeholder="Enter rejection reason (optional)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-white border-rose-200 text-xs"
                rows={2}
              />
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowRejectForm(false)} className="text-xs">
                  Cancel
                </Button>
                <Button size="sm" variant="destructive" onClick={handleReject} disabled={rejecting} className="text-xs font-bold bg-rose-600 hover:bg-rose-700">
                  {rejecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                  Confirm Rejection
                </Button>
              </div>
            </div>
          )}

          {/* Section 1: Guest & Company Info */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-primary" />
              Reservation & Agency Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Reservation Date</Label>
                <DatePicker
                  value={formData.reservationDate}
                  onChange={(v) => setFormData({ ...formData, reservationDate: v })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Guest Name</Label>
                <Input
                  value={formData.guestName}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  className="h-9 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Guest Mobile</Label>
                <Input
                  value={formData.guestMobile}
                  onChange={(e) => setFormData({ ...formData, guestMobile: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Group Code</Label>
                <Input
                  value={formData.groupCode}
                  onChange={(e) => setFormData({ ...formData, groupCode: e.target.value.replace(/\s+/g, '') })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Pax Count</Label>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border h-9">
                  <Button variant="ghost" size="icon" onClick={() => setFormData({ ...formData, paxCount: Math.max(1, formData.paxCount - 1) })} className="h-7 w-7"><Minus className="h-3 w-3" /></Button>
                  <span className="flex-1 text-center font-bold text-xs">{formData.paxCount}</span>
                  <Button variant="ghost" size="icon" onClick={() => setFormData({ ...formData, paxCount: formData.paxCount + 1 })} className="h-7 w-7"><Plus className="h-3 w-3" /></Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Agency (Party)</Label>
                <Select value={formData.partyId} onValueChange={(v) => setFormData({ ...formData, partyId: v })}>
                  <SelectTrigger className="h-9 text-xs font-medium"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {parties.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.partyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Umrah Co.</Label>
                <Select value={formData.umrahCompanyId} onValueChange={(v) => setFormData({ ...formData, umrahCompanyId: v })}>
                  <SelectTrigger className="h-9 text-xs font-medium"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {umrahCompanies.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.partyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Transport Co. *</Label>
                <Select value={formData.transportCompanyId} onValueChange={(v) => setFormData({ ...formData, transportCompanyId: v })}>
                  <SelectTrigger className="h-9 text-xs font-bold border-primary/40"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {transportCompanies.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.partyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2: Hotel Stays */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Hotel Stays ({formData.hotelSchedules.length})
              </h3>
              <Button size="sm" variant="outline" onClick={addHotel} className="h-7 text-[10px] font-bold uppercase">
                <Plus className="h-3 w-3 mr-1" /> Add Stay
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-12 text-[10px] uppercase font-bold">#</TableHead>
                    <TableHead className="w-40 text-[10px] uppercase font-bold">City</TableHead>
                    <TableHead className="w-56 text-[10px] uppercase font-bold">Hotel Name</TableHead>
                    <TableHead className="w-36 text-[10px] uppercase font-bold">Check In</TableHead>
                    <TableHead className="w-36 text-[10px] uppercase font-bold">Check Out</TableHead>
                    <TableHead className="w-20 text-[10px] uppercase font-bold">Days</TableHead>
                    <TableHead className="w-36 text-[10px] uppercase font-bold">BRN</TableHead>
                    <TableHead className="w-12 text-center text-[10px] uppercase font-bold">Act</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.hotelSchedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4 text-xs text-slate-400">
                        No hotel stays defined.
                      </TableCell>
                    </TableRow>
                  ) : (
                    formData.hotelSchedules.map((h, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-bold text-xs">{h.number}</TableCell>
                        <TableCell>
                          <Input
                            value={h.location || h.city}
                            onChange={(e) => {
                              const updated = [...formData.hotelSchedules];
                              updated[idx].location = e.target.value;
                              updated[idx].city = e.target.value;
                              setFormData({ ...formData, hotelSchedules: updated });
                            }}
                            className="h-8 text-xs font-semibold"
                            placeholder="e.g. Makkah"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={h.hotelName}
                            onChange={(e) => {
                              const updated = [...formData.hotelSchedules];
                              updated[idx].hotelName = e.target.value;
                              setFormData({ ...formData, hotelSchedules: updated });
                            }}
                            className="h-8 text-xs font-semibold"
                            placeholder="Hotel Name"
                          />
                        </TableCell>
                        <TableCell>
                          <DatePicker
                            value={h.checkIn}
                            onChange={(v) => {
                              const updated = [...formData.hotelSchedules];
                              updated[idx].checkIn = v;
                              updated[idx].days = calculateDays(v, updated[idx].checkOut);
                              setFormData({ ...formData, hotelSchedules: updated });
                            }}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <DatePicker
                            value={h.checkOut}
                            onChange={(v) => {
                              const updated = [...formData.hotelSchedules];
                              updated[idx].checkOut = v;
                              updated[idx].days = calculateDays(updated[idx].checkIn, v);
                              setFormData({ ...formData, hotelSchedules: updated });
                            }}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="font-bold text-xs">{h.days}d</TableCell>
                        <TableCell>
                          <Input
                            value={h.brn || ''}
                            onChange={(e) => {
                              const updated = [...formData.hotelSchedules];
                              updated[idx].brn = e.target.value;
                              setFormData({ ...formData, hotelSchedules: updated });
                            }}
                            className="h-8 text-xs font-mono"
                            placeholder="BRN #"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" onClick={() => removeHotel(idx)} className="h-7 w-7 text-rose-500 hover:text-rose-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Section 3: Movement & Transport Itinerary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between bg-slate-900 text-white">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-sky-400" />
                Movements & Driver Assignment ({formData.movementDetails.length})
              </h3>
              <Button size="sm" variant="secondary" onClick={addMovement} className="h-7 text-[10px] font-bold uppercase bg-sky-500 text-white hover:bg-sky-600 border-none">
                <Plus className="h-3 w-3 mr-1" /> Add Segment
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-10 text-[10px] uppercase font-bold">Sr</TableHead>
                    <TableHead className="w-32 text-[10px] uppercase font-bold">Date</TableHead>
                    <TableHead className="w-24 text-[10px] uppercase font-bold">Time</TableHead>
                    <TableHead className="w-36 text-[10px] uppercase font-bold">From City</TableHead>
                    <TableHead className="w-44 text-[10px] uppercase font-bold">From Location</TableHead>
                    <TableHead className="w-36 text-[10px] uppercase font-bold">To City</TableHead>
                    <TableHead className="w-44 text-[10px] uppercase font-bold">To Location</TableHead>
                    <TableHead className="w-40 text-[10px] uppercase font-bold">Driver 1</TableHead>
                    <TableHead className="w-40 text-[10px] uppercase font-bold">Driver Mobile</TableHead>
                    <TableHead className="w-36 text-[10px] uppercase font-bold">Vehicle No</TableHead>
                    <TableHead className="w-10 text-center text-[10px] uppercase font-bold">Act</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.movementDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-4 text-xs text-slate-400">
                        No movement itinerary segments defined.
                      </TableCell>
                    </TableRow>
                  ) : (
                    formData.movementDetails.map((m, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-bold text-xs">{m.sr}</TableCell>
                        <TableCell>
                          <DatePicker
                            value={m.date}
                            onChange={(v) => {
                              const updated = [...formData.movementDetails];
                              updated[idx].date = v;
                              setFormData({ ...formData, movementDetails: updated });
                            }}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={m.time}
                            onChange={(e) => {
                              const updated = [...formData.movementDetails];
                              updated[idx].time = e.target.value;
                              setFormData({ ...formData, movementDetails: updated });
                            }}
                            className="h-8 text-xs font-mono"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={m.from}
                            onChange={(e) => {
                              const updated = [...formData.movementDetails];
                              updated[idx].from = e.target.value;
                              setFormData({ ...formData, movementDetails: updated });
                            }}
                            className="h-8 text-xs font-semibold"
                            placeholder="From City"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={m.fromLocation}
                            onChange={(e) => {
                              const updated = [...formData.movementDetails];
                              updated[idx].fromLocation = e.target.value;
                              setFormData({ ...formData, movementDetails: updated });
                            }}
                            className="h-8 text-xs"
                            placeholder="Airport / Hotel"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={m.to}
                            onChange={(e) => {
                              const updated = [...formData.movementDetails];
                              updated[idx].to = e.target.value;
                              setFormData({ ...formData, movementDetails: updated });
                            }}
                            className="h-8 text-xs font-semibold"
                            placeholder="To City"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={m.toLocation}
                            onChange={(e) => {
                              const updated = [...formData.movementDetails];
                              updated[idx].toLocation = e.target.value;
                              setFormData({ ...formData, movementDetails: updated });
                            }}
                            className="h-8 text-xs"
                            placeholder="Airport / Hotel"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={m.driverDetails1 || ''}
                            onChange={(e) => {
                              const updated = [...formData.movementDetails];
                              updated[idx].driverDetails1 = e.target.value;
                              setFormData({ ...formData, movementDetails: updated });
                            }}
                            className="h-8 text-xs"
                            placeholder="Driver name"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={m.driverDetails2 || ''}
                            onChange={(e) => {
                              const updated = [...formData.movementDetails];
                              updated[idx].driverDetails2 = e.target.value;
                              setFormData({ ...formData, movementDetails: updated });
                            }}
                            className="h-8 text-xs font-mono"
                            placeholder="5XXXXXXXX"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={m.vehicleNumber || ''}
                            onChange={(e) => {
                              const updated = [...formData.movementDetails];
                              updated[idx].vehicleNumber = e.target.value;
                              setFormData({ ...formData, movementDetails: updated });
                            }}
                            className="h-8 text-xs font-mono"
                            placeholder="Plate No"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" onClick={() => removeMovement(idx)} className="h-7 w-7 text-rose-500 hover:text-rose-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-4 border-t bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!showRejectForm && request.status === 'pending' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectForm(true)}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject Request
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Cancel
            </Button>
            {request.status === 'pending' && (
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 shadow-md active:scale-95"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                )}
                Approve & Generate Voucher
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
