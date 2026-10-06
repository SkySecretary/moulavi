'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { b2cAPI, locationMasterAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Calendar,
  Users,
  Hotel,
  Plane,
  Car,
  ShieldCheck,
  Sparkles,
  Loader2,
  Send,
  MessageSquare,
  ArrowRight,
  User,
  Phone,
  Mail,
  FileText,
  Clock,
  MapPin,
  Check,
} from 'lucide-react';

interface B2CCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculatorData: {
    persons: number;
    days: number;
    includeMadinah: boolean;
    makkahNights: number;
    madinahNights: number;
    tier: 'economy' | 'comfort' | 'luxury';
    currency: string;
    totalAmount: number;
    perPersonAmount: number;
  };
}

export function B2CCheckoutModal({
  open,
  onOpenChange,
  calculatorData,
}: B2CCheckoutModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // Form State Pre-filled from Calculator
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [nationality, setNationality] = useState('Indian');
  const [checkInDate, setCheckInDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );

  // Accommodations & Logistics
  const [hotels, setHotels] = useState<any[]>([]);
  const [airports, setAirports] = useState<any[]>([]);
  const [makkahHotelId, setMakkahHotelId] = useState('');
  const [madinahHotelId, setMadinahHotelId] = useState('');
  const [arrivalAirportId, setArrivalAirportId] = useState('');
  const [departureAirportId, setDepartureAirportId] = useState('');
  const [includeFlight, setIncludeFlight] = useState(true);
  const [includeTransport, setIncludeTransport] = useState(true);
  const [transportType, setTransportType] = useState('private_suv');

  // Additional Family Passengers
  const [familyMembers, setFamilyMembers] = useState<Array<{ fullName: string; passportNumber: string; gender: string }>>([]);

  useEffect(() => {
    if (open) {
      loadMasters();
      // Generate family member slots based on persons
      const count = Math.max(0, calculatorData.persons - 1);
      const members = [];
      for (let i = 0; i < count; i++) {
        members.push({
          fullName: `Family Member ${i + 2}`,
          passportNumber: '',
          gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
        });
      }
      setFamilyMembers(members);
      setStep(1);
      setConfirmedBooking(null);
    }
  }, [open, calculatorData.persons]);

  const loadMasters = async () => {
    try {
      const [hotelsRes, airportsRes] = await Promise.all([
        locationMasterAPI.getAll({ locationType: 'HOTEL', limit: 100 }),
        locationMasterAPI.getAll({ locationType: 'AIRPORT', limit: 200 }),
      ]);

      const rawHotels = hotelsRes.data?.locationMasters || (Array.isArray(hotelsRes.data) ? hotelsRes.data : []);
      const rawAirports = airportsRes.data?.locationMasters || (Array.isArray(airportsRes.data) ? airportsRes.data : []);

      setHotels(rawHotels);
      setAirports(rawAirports);

      const makkahDefault = rawHotels.find((h: any) => h.city?.toLowerCase().includes('makkah') || h.name?.toLowerCase().includes('makkah'));
      const madinahDefault = rawHotels.find((h: any) => h.city?.toLowerCase().includes('madinah') || h.name?.toLowerCase().includes('madinah'));
      const jeddahAirport = rawAirports.find((a: any) => a.code === 'JED');
      const calicutAirport = rawAirports.find((a: any) => a.code === 'CCJ') || rawAirports.find((a: any) => a.code === 'COK') || rawAirports[0];

      if (makkahDefault) setMakkahHotelId(makkahDefault.id);
      if (madinahDefault) setMadinahHotelId(madinahDefault.id);
      if (jeddahAirport) setArrivalAirportId(jeddahAirport.id);
      if (calicutAirport) setDepartureAirportId(calicutAirport.id);
    } catch (err) {
      console.error('Error loading checkout masters:', err);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Please enter the lead pilgrim name');
      return;
    }
    if (!mobileNumber.trim()) {
      toast.error('Please enter your WhatsApp mobile number for instant voucher & updates');
      return;
    }

    try {
      setSubmitting(true);
      const allPassengers = [
        {
          fullName: fullName.trim(),
          passportNumber: passportNumber.trim(),
          nationality,
          gender: 'MALE',
        },
        ...familyMembers.map((m) => ({
          fullName: m.fullName.trim() || 'Family Member',
          passportNumber: m.passportNumber.trim(),
          nationality,
          gender: m.gender,
        })),
      ];

      const payload = {
        fullName: fullName.trim(),
        passportNumber: passportNumber.trim(),
        nationality,
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        checkInDate,
        makkahNights: calculatorData.makkahNights,
        madinahNights: calculatorData.madinahNights,
        travelersCount: calculatorData.persons,
        makkahHotelId: makkahHotelId || undefined,
        madinahHotelId: calculatorData.includeMadinah ? madinahHotelId || undefined : undefined,
        arrivalAirportId: arrivalAirportId || undefined,
        departureAirportId: departureAirportId || undefined,
        isWithoutTicket: !includeFlight,
        accommodationType: 'hotel',
        passengers: allPassengers,
      };

      const res = await b2cAPI.submitCheckout(payload);
      if (res.data?.success) {
        setConfirmedBooking(res.data.booking || { bookingReference: `UMR-${Date.now().toString().slice(-6)}` });
        setStep(3);
        toast.success('Alhamdulillah! Your Family Umrah Reservation has been placed.');
      } else {
        throw new Error(res.data?.error || 'Failed to complete booking');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err.response?.data?.error || err.message || 'Booking submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white sm:rounded-2xl shadow-2xl border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header with Islamic Aesthetics */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 p-5 text-white relative overflow-hidden shrink-0">
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
                  Direct B2C Family Package
                </Badge>
                <span className="text-xs text-emerald-200">Instant VIP Reservation</span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold font-display text-white mt-1">
                Complete Your Family Umrah Booking
              </DialogTitle>
              <DialogDescription className="text-xs text-emerald-200/90 mt-0.5">
                {calculatorData.persons} Pilgrims • {calculatorData.days} Days Total {calculatorData.includeMadinah ? `(${calculatorData.makkahNights}N Makkah + ${calculatorData.madinahNights}N Madinah)` : `(${calculatorData.days}N Makkah)`}
              </DialogDescription>
            </div>

            <div className="text-right bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15">
              <span className="text-[10px] uppercase font-semibold text-amber-200 block">Total Package</span>
              <span className="text-lg font-bold font-mono text-amber-300">
                {calculatorData.currency} {calculatorData.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          {step !== 3 && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-emerald-800/60 text-xs">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center gap-1.5 font-semibold transition-colors ${
                  step === 1 ? 'text-amber-300' : 'text-emerald-300 hover:text-white'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 1 ? 'bg-amber-400 text-emerald-950 font-bold' : 'bg-emerald-800 text-white'
                }`}>1</span>
                Package Details
              </button>
              <span className="text-emerald-600">/</span>
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`flex items-center gap-1.5 font-semibold transition-colors ${
                  step === 2 ? 'text-amber-300' : 'text-emerald-400/80 hover:text-white'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 2 ? 'bg-amber-400 text-emerald-950 font-bold' : 'bg-emerald-800 text-white'
                }`}>2</span>
                Pilgrim Information
              </button>
            </div>
          )}
        </div>

        {/* Modal Body Container */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-slate-800">
          {step === 1 && (
            <div className="space-y-4">
              {/* Check-in Date & Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    Preferred Arrival Date in KSA
                  </Label>
                  <Input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    Stay Duration Breakdown
                  </Label>
                  <div className="h-9 px-3 bg-white rounded-md border border-slate-200 flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-600">🕋 Makkah: <strong>{calculatorData.makkahNights} Nights</strong></span>
                    {calculatorData.includeMadinah && (
                      <span className="text-emerald-700 font-semibold">🕌 Madinah: <strong>{calculatorData.madinahNights} Nights</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hotels Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Hotel className="h-4 w-4 text-amber-600" />
                    Selected Accommodations ({calculatorData.tier.toUpperCase()} Tier)
                  </Label>
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                    Breakfast & Wi-Fi Included
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        🕋 Makkah Hotel
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold">{calculatorData.makkahNights} Nights</span>
                    </div>
                    <Select value={makkahHotelId} onValueChange={setMakkahHotelId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select Makkah hotel..." />
                      </SelectTrigger>
                      <SelectContent>
                        {hotels
                          .filter((h) => h.city?.toLowerCase().includes('makkah') || h.name?.toLowerCase().includes('makkah') || !h.city)
                          .map((h) => (
                            <SelectItem key={h.id} value={h.id} className="text-xs">
                              {h.name} {h.starRating ? `(${h.starRating}★)` : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {calculatorData.includeMadinah ? (
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1.5 shadow-xs bg-emerald-50/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                          🕌 Madinah Hotel
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold">{calculatorData.madinahNights} Nights</span>
                      </div>
                      <Select value={madinahHotelId} onValueChange={setMadinahHotelId}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select Madinah hotel..." />
                        </SelectTrigger>
                        <SelectContent>
                          {hotels
                            .filter((h) => h.city?.toLowerCase().includes('madinah') || h.name?.toLowerCase().includes('madinah'))
                            .map((h) => (
                              <SelectItem key={h.id} value={h.id} className="text-xs">
                                {h.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-500">
                      Madinah visit not selected
                    </div>
                  )}
                </div>
              </div>

              {/* Flights & Transport preferences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Plane className="h-3.5 w-3.5 text-blue-600" />
                      Arrival Airport (KSA)
                    </Label>
                    <span className="text-[10px] text-slate-400">Jeddah / Madinah</span>
                  </div>
                  <Select value={arrivalAirportId} onValueChange={setArrivalAirportId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select airport..." />
                    </SelectTrigger>
                    <SelectContent>
                      {airports
                        .filter((a) => a.code === 'JED' || a.code === 'MED' || a.country?.countryCode === 'SAU' || a.code === 'RUH')
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id} className="text-xs">
                            🇸🇦 {a.code} • {a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Car className="h-3.5 w-3.5 text-emerald-600" />
                      Ground Transportation
                    </Label>
                    <span className="text-[10px] text-emerald-700 font-bold">Included</span>
                  </div>
                  <Select value={transportType} onValueChange={setTransportType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private_suv" className="text-xs">VIP Private GMC / SUV Transfer</SelectItem>
                      <SelectItem value="family_van" className="text-xs">Family HiAce / Luxury Van</SelectItem>
                      <SelectItem value="haramain_train" className="text-xs">Haramain Bullet Train + Private Cab</SelectItem>
                      <SelectItem value="vip_coach" className="text-xs">Luxury Tour Coach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Inclusions summary banner */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  All-Inclusive Family Guarantees:
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-emerald-800">
                  <span className="flex items-center gap-1">✓ Ministry Approved Umrah Visa</span>
                  <span className="flex items-center gap-1">✓ Medical & Hospitalization Insurance</span>
                  <span className="flex items-center gap-1">✓ 24/7 Airport Meet & Assist</span>
                  <span className="flex items-center gap-1">✓ Historical Ziyarah Tours</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Lead Pilgrim Information */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-emerald-600" />
                    Lead Pilgrim (Head of Family)
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                    Primary Contact
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Full Name (as in Passport) *</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Mohammed Farooq"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-8 text-xs bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>WhatsApp Mobile Number *</span>
                      <span className="text-[10px] text-emerald-700 font-bold">For instant voucher</span>
                    </Label>
                    <Input
                      type="tel"
                      placeholder="+91 98765 43210 / +966 50 123 4567"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="h-8 text-xs bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Email Address (Optional)</Label>
                    <Input
                      type="email"
                      placeholder="name@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Passport Number (Optional now)</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Z1234567"
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value)}
                      className="h-8 text-xs bg-white font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Family Members Breakdown */}
              {familyMembers.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-blue-600" />
                      Family Members ({familyMembers.length} Accompanying Pilgrims)
                    </Label>
                    <span className="text-[10px] text-slate-500">Can be finalized via WhatsApp later</span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {familyMembers.map((member, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs items-center"
                      >
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-semibold">Pilgrim #{idx + 2} Name</span>
                          <Input
                            type="text"
                            value={member.fullName}
                            onChange={(e) => {
                              const copy = [...familyMembers];
                              copy[idx].fullName = e.target.value;
                              setFamilyMembers(copy);
                            }}
                            className="h-7 text-xs bg-slate-50"
                            placeholder="Full name"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-semibold">Passport # (Optional)</span>
                          <Input
                            type="text"
                            value={member.passportNumber}
                            onChange={(e) => {
                              const copy = [...familyMembers];
                              copy[idx].passportNumber = e.target.value;
                              setFamilyMembers(copy);
                            }}
                            className="h-7 text-xs bg-slate-50 font-mono uppercase"
                            placeholder="Passport"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-semibold">Gender</span>
                          <Select
                            value={member.gender}
                            onValueChange={(val) => {
                              const copy = [...familyMembers];
                              copy[idx].gender = val;
                              setFamilyMembers(copy);
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs bg-slate-50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE" className="text-xs">Male</SelectItem>
                              <SelectItem value="FEMALE" className="text-xs">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && confirmedBooking && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div>
                <h3 className="text-xl font-bold font-display text-emerald-950">
                  Alhamdulillah! Your Reservation is Confirmed
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  Our dedicated Umrah concierge team has received your package request and is preparing your personalized itinerary and official visa documents.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Booking Reference:</span>
                  <strong className="font-mono text-sm text-emerald-700 font-bold">
                    {confirmedBooking.bookingReference || 'UMR-2026-CONFIRMED'}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Pilgrims:</span>
                  <span className="font-semibold text-slate-900">{calculatorData.persons} Persons</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-semibold text-slate-900">{calculatorData.days} Days Stay</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Estimated Total:</span>
                  <span className="font-mono font-bold text-amber-600 text-sm">
                    {calculatorData.currency} {calculatorData.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                <a
                  href={`https://wa.me/966500000000?text=Salam,%20I%20have%20booked%20Umrah%20Package%20ref:%20${confirmedBooking.bookingReference}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                >
                  <MessageSquare className="h-4 w-4" />
                  Connect with Concierge on WhatsApp
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs"
                >
                  Close & View Calculator
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {step !== 3 && (
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between gap-3 shrink-0">
            {step === 1 ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs text-slate-500"
                >
                  Back to Calculator
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 shadow-sm px-5"
                >
                  Proceed to Pilgrim Details
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Back to Details
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmitBooking}
                  disabled={submitting}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-emerald-950 text-xs font-bold gap-2 shadow-md px-6"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-emerald-950" />
                  )}
                  {submitting ? 'Confirming Reservation...' : 'Confirm Family Package Now'}
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
