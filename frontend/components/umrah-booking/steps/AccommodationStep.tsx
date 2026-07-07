// Step 3: Accommodation Component

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Hotel, Plus, User, Info } from 'lucide-react';
import { Step3Data, Location, Hotel as HotelType, HotelBooking } from '@/lib/umrah/types';
import { useHotelCoverage } from '../hooks/useHotelCoverage';
import { HotelBookingTable } from '../components/HotelBookingTable';
import { HotelCoverageIndicator } from '../components/HotelCoverageIndicator';
import { ValidationMessage } from '../shared';
import { cn } from '@/lib/utils';
import { toDisplayDate, fromDisplayDate } from '@/lib/umrah/validation';
import { DatePicker } from '@/components/ui/date-picker';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS_AND_CHARS,
} from "@/components/ui/input-otp";

interface AccommodationStepProps {
  data: Step3Data;
  onChange: (data: Partial<Step3Data>) => void;
  locations: Location[];
  hotels: HotelType[];
  arrivalDate: string;
  departureDate: string;
  onLoadHotels: (locationId: string) => void;
  getHotelsForLocation: (locationId: string) => HotelType[];
  refreshHotels?: () => void;
  passengerCount?: number; // Add passenger count from step 1
  disabled?: boolean;
  isOneWay?: boolean;
}

export const AccommodationStep: React.FC<AccommodationStepProps> = ({
  data,
  onChange,
  locations,
  hotels,
  arrivalDate,
  departureDate,
  onLoadHotels,
  getHotelsForLocation,
  refreshHotels,
  passengerCount,
  disabled = false,
  isOneWay = false,
}) => {
  const MAX_PASSENGERS_IQAMA = 5;
  const canSelectIqama = !passengerCount || passengerCount <= MAX_PASSENGERS_IQAMA;

  // Force iqama if one-way ticket is chosen
  React.useEffect(() => {
    if (isOneWay && data.accommodationType !== 'iqama') {
      onChange({
        accommodationType: 'iqama',
        hotelBookings: undefined,
        iqamaDetails: data.iqamaDetails || {},
      });
    }
  }, [isOneWay, data.accommodationType, onChange, data.iqamaDetails]);

  const addHotelBooking = React.useCallback(() => {
    const existingBookings = data.hotelBookings || [];
    let checkInDate = '';

    if (existingBookings.length === 0) {
      checkInDate = arrivalDate;
    } else {
      const lastBooking = existingBookings[existingBookings.length - 1];
      checkInDate = lastBooking.checkOutDate || '';
    }

    onChange({
      hotelBookings: [
        ...existingBookings,
        {
          cityId: '',
          hotelId: '',
          checkInDate,
          checkOutDate: '',
        },
      ],
    });
  }, [data.hotelBookings, arrivalDate, onChange]);

  const removeHotelBooking = React.useCallback(
    (index: number) => {
      const updatedBookings = data.hotelBookings?.filter((_, i) => i !== index) || [];

      if (updatedBookings[index] && index > 0) {
        const previousHotel = updatedBookings[index - 1];
        if (previousHotel.checkOutDate) {
          updatedBookings[index].checkInDate = previousHotel.checkOutDate;
        }
      } else if (updatedBookings[index] && index === 0) {
        updatedBookings[index].checkInDate = arrivalDate;
      }

      onChange({ hotelBookings: updatedBookings });
    },
    [data.hotelBookings, arrivalDate, onChange]
  );

  const updateHotelBooking = React.useCallback(
    (index: number, field: keyof HotelBooking, value: string | string[]) => {
      const updatedBookings = [...(data.hotelBookings || [])];
      updatedBookings[index] = { ...updatedBookings[index], [field]: value };

      if (field === 'cityId' && typeof value === 'string') {
        updatedBookings[index].hotelId = '';
        onLoadHotels(value);
      }

      if (field === 'checkOutDate' && updatedBookings[index + 1] && typeof value === 'string') {
        updatedBookings[index + 1].checkInDate = value;
      }

      onChange({ hotelBookings: updatedBookings });
    },
    [data.hotelBookings, onChange, onLoadHotels]
  );

  const coverage = useHotelCoverage({
    arrivalDate,
    departureDate,
    hotelBookings: data.hotelBookings,
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-4">
        <Label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Accommodation Type *</Label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Hotel */}
          <div 
            className={cn(
              "relative p-4 rounded-xl border transition-all duration-500 group cursor-pointer overflow-hidden",
              data.accommodationType === 'hotel' 
                ? "bg-primary border-primary shadow-md scale-[1.01]" 
                : "bg-white border-secondary/10 hover:border-secondary/30",
              isOneWay && "opacity-50 cursor-not-allowed bg-gray-50 hover:border-secondary/10"
            )}
            onClick={() => {
              if (!disabled && !isOneWay) {
                onChange({ 
                  accommodationType: 'hotel',
                  iqamaDetails: undefined,
                  hotelBookings: data.hotelBookings || []
                });
              }
            }}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-500",
                data.accommodationType === 'hotel' ? "bg-white text-primary" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white"
              )}>
                <Hotel className="h-4 w-4" />
              </div>
              <div>
                <h3 className={cn(
                  "text-sm font-bold tracking-tight",
                  data.accommodationType === 'hotel' ? "text-white" : "text-primary"
                )}>Hotel Booking</h3>
                <p className={cn(
                  "text-[10px] font-medium opacity-60",
                  data.accommodationType === 'hotel' ? "text-secondary" : "text-muted-foreground"
                )}>
                  {isOneWay ? "Not available for one-way settings" : "Select hotels"}
                </p>
              </div>
            </div>
          </div>
          
          {/* Option 2: Iqama */}
          <div 
            className={cn(
              "relative p-4 rounded-xl border transition-all duration-500 group cursor-pointer overflow-hidden",
              data.accommodationType === 'iqama' 
                ? "bg-primary border-primary shadow-md scale-[1.01]" 
                : !canSelectIqama
                ? "bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed"
                : "bg-white border-secondary/10 hover:border-secondary/30"
            )}
            onClick={() => {
              if (!disabled && canSelectIqama) {
                onChange({ 
                  accommodationType: 'iqama',
                  hotelBookings: undefined,
                  iqamaDetails: data.iqamaDetails || {}
                });
              }
            }}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-500",
                data.accommodationType === 'iqama' ? "bg-white text-primary" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white"
              )}>
                <User className="h-4 w-4" />
              </div>
              <div>
                <h3 className={cn(
                  "text-sm font-bold tracking-tight",
                  data.accommodationType === 'iqama' ? "text-white" : "text-primary"
                )}>Iqama Sponsor</h3>
                <p className={cn(
                  "text-[10px] font-medium opacity-60",
                  data.accommodationType === 'iqama' ? "text-secondary" : "text-muted-foreground"
                )}>Stay with sponsor</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {data.accommodationType === 'hotel' && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-500">
          <div className="flex items-center justify-between border-b border-secondary/10 pb-3">
            <h4 className="text-sm font-bold text-primary uppercase italic tracking-wider">Hotel Bookings</h4>
            <Button 
              type="button" 
              onClick={addHotelBooking}
              className="h-8 px-4 rounded-lg bg-secondary text-primary font-bold uppercase shadow-sm hover:bg-secondary/90 transition-all active:scale-95 text-[9px]"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Hotel
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-secondary/10 shadow-sm overflow-hidden">
            <HotelBookingTable
              hotelBookings={data.hotelBookings || []}
              locations={locations}
              hotels={hotels}
              getHotelsForLocation={getHotelsForLocation}
              onUpdateBooking={updateHotelBooking}
              onRemoveBooking={removeHotelBooking}
              onAddBooking={addHotelBooking}
              disabled={disabled}
              showAddButton={true}
              arrivalDate={arrivalDate}
              departureDate={departureDate}
              onHotelsRefresh={refreshHotels}
            />
          </div>
        </div>
      )}

      {data.accommodationType === 'iqama' && (
        <div className="mt-6 p-6 rounded-2xl bg-gray-50/50 border border-secondary/10 space-y-6 animate-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="iqamaNumber" className="text-[10px] font-bold text-primary/60 uppercase ml-1">Iqama Number *</Label>
              <Input
                id="iqamaNumber"
                placeholder="2XXXXXXXXX"
                value={data.iqamaDetails?.iqamaNumber || ''}
                onChange={(e) => onChange({ iqamaDetails: { ...data.iqamaDetails, iqamaNumber: e.target.value } })}
                disabled={disabled}
                className="h-10 bg-white border-gray-100 rounded-lg font-bold text-primary focus:ring-secondary/20 text-xs tracking-widest shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="iqamaName" className="text-[10px] font-bold text-primary/60 uppercase ml-1">Iqama Name *</Label>
              <Input
                id="iqamaName"
                placeholder="Enter Name"
                value={data.iqamaDetails?.iqamaName || ''}
                onChange={(e) => onChange({ iqamaDetails: { ...data.iqamaDetails, iqamaName: e.target.value } })}
                disabled={disabled}
                className="h-10 bg-white border-gray-100 rounded-lg font-bold text-primary focus:ring-secondary/20 uppercase text-xs shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="iqamaDob" className="text-[10px] font-bold text-primary/60 uppercase ml-1">Date of Birth</Label>
              <DatePicker
                value={data.iqamaDetails?.iqamaDob || ''}
                onChange={(val) => onChange({ iqamaDetails: { ...data.iqamaDetails, iqamaDob: val } })}
                disabled={disabled}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="iqamaMobile" className="text-[10px] font-bold text-primary/60 uppercase ml-1">Sponsor Mobile Number *</Label>
              <div className="relative">
                <Input
                  id="iqamaMobile"
                  type="tel"
                  placeholder="+966 5X XXX XXXX"
                  value={data.iqamaDetails?.iqamaMobile || '+966'}
                  onChange={(e) => {
                    let val = e.target.value;
                    
                    // If deleted everything, keep the prefix
                    if (val.length < 4) {
                      val = '+966';
                    }
                    
                    // Always ensure it starts with +966
                    if (!val.startsWith('+966')) {
                      // Remove non-digits to clean up potential mess
                      const digits = val.replace(/\D/g, '');
                      // If it starts with 0 (like 05...), remove the 0
                      const cleanDigits = digits.startsWith('0') ? digits.substring(1) : digits;
                      val = '+966' + cleanDigits;
                    }

                    // Enforce only digits after +966
                    const prefix = '+966';
                    const body = val.substring(4).replace(/\D/g, '');
                    
                    // Saudi mobile numbers shouldn't start with 0 after prefix
                    const cleanBody = body.startsWith('0') ? body.substring(1) : body;
                    
                    // Limit to 9 digits (standard Saudi mobile length after prefix)
                    const limitedBody = cleanBody.substring(0, 9);
                    
                    onChange({ iqamaDetails: { ...data.iqamaDetails, iqamaMobile: prefix + limitedBody } });
                  }}
                  disabled={disabled}
                  className="h-10 bg-white border-gray-100 rounded-lg font-bold text-primary focus:ring-secondary/20 text-xs shadow-sm pl-3"
                />
              </div>
              <p className="text-[8px] font-bold text-secondary uppercase tracking-widest ml-1 animate-pulse">
                Format: +966 followed by 9 digits (e.g. +9665XXXXXXXX)
              </p>
            </div>

            <div className="space-y-3 sm:col-span-2">
              <Label htmlFor="iqamaNationalShortAddress" className="text-[10px] font-bold text-primary/60 uppercase ml-1">National Short Address *</Label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <InputOTP
                  maxLength={8}
                  pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                  value={data.iqamaDetails?.iqamaNationalShortAddress || ''}
                  onChange={(value) => onChange({ iqamaDetails: { ...data.iqamaDetails, iqamaNationalShortAddress: value } })}
                  disabled={disabled}
                >
                  <InputOTPGroup className="gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} className="h-10 w-9 rounded-lg border-gray-100 bg-white font-bold text-base text-primary shadow-sm" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-[8px] font-bold text-primary/40 uppercase tracking-widest">8-character short address</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
