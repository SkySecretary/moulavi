// Step 2: Travel Details Component

import React from 'react';
import { Step2Data, Airport } from '@/lib/umrah/types';
import { calculateDuration } from '@/lib/umrah/validation';
import { TravelDetailsForm } from '../components/TravelDetailsForm';
import { HotelBookingTable } from '../components/HotelBookingTable';
import { HotelCoverageIndicator } from '../components/HotelCoverageIndicator';
import { useHotelCoverage } from '../hooks/useHotelCoverage';
import { Hotel, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TravelDetailsStepProps {
  data: Step2Data;
  onChange: (data: Partial<Step2Data>) => void;
  airports: Airport[];
  disabled?: boolean;
  // Optional props for group bookings (hotel section)
  isGroupBooking?: boolean;
  locations?: any[];
  hotels?: any[];
  arrivalDate?: string;
  departureDate?: string;
  onLoadHotels?: (locationId: string) => void;
  getHotelsForLocation?: (locationId: string) => any[];
  onAddHotelBooking?: () => void;
  onRemoveHotelBooking?: (index: number) => void;
  allowOneWayOption?: boolean;
}

export const TravelDetailsStep: React.FC<TravelDetailsStepProps> = ({
  data,
  onChange,
  airports,
  disabled = false,
  isGroupBooking = false,
  locations = [],
  hotels = [],
  arrivalDate,
  departureDate,
  onLoadHotels,
  getHotelsForLocation,
  onAddHotelBooking,
  onRemoveHotelBooking,
  allowOneWayOption = false,
}) => {
  const [durationDays, setDurationDays] = React.useState(0);
  const [durationError, setDurationError] = React.useState('');

  // Hotel bookings from step2Data (for group bookings)
  const hotelBookings = (data as any).hotelBookings || [];

  // Check if hotels are valid/complete (for group bookings)
  const areHotelsValid = React.useMemo(() => {
    if (!isGroupBooking || hotelBookings.length === 0) return false;
    return hotelBookings.every(
      (booking: any) =>
        booking.cityId &&
        booking.hotelId &&
        booking.checkInDate &&
        booking.checkOutDate
    );
  }, [isGroupBooking, hotelBookings]);

  // Hotel coverage calculation (for group bookings)
  const coverage = useHotelCoverage({
    arrivalDate: arrivalDate || data.arrivalDate,
    departureDate: departureDate || data.departureDate,
    hotelBookings: hotelBookings,
  });

  const handleDateChange = (field: 'arrivalDate' | 'departureDate', value: string) => {
    onChange({ [field]: value });

    const arrival = field === 'arrivalDate' ? value : data.arrivalDate;
    const departure = field === 'departureDate' ? value : data.departureDate;

    const result = calculateDuration(arrival, departure);
    setDurationDays(result.days);
    setDurationError(result.error);
  };

  const handleAirportChange = async (field: 'arrivalAirportId' | 'departureAirportId', value: string) => {
    onChange({ [field]: value });
  };

  // Update hotel booking handler (for group bookings)
  const updateHotelBooking = React.useCallback(
    (index: number, field: keyof typeof hotelBookings[0], value: string | string[]) => {
      const updatedBookings = [...hotelBookings];
      updatedBookings[index] = { ...updatedBookings[index], [field]: value };

      if (field === 'cityId' && onLoadHotels) {
        updatedBookings[index].hotelId = '';
        onLoadHotels(value as string);
      }

      if (field === 'checkOutDate' && updatedBookings[index + 1]) {
        updatedBookings[index + 1].checkInDate = value as string;
      }

      onChange({ hotelBookings: updatedBookings } as any);
    },
    [hotelBookings, onChange, onLoadHotels]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Passenger Count - Compact */}
      <div className="bg-primary/5 rounded-2xl p-4 border border-secondary/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
          <Users className="h-16 w-16 text-primary" />
        </div>
        <div className="relative z-10 max-w-sm">
          <Label htmlFor="passengerCount" className="text-[10px] font-bold text-primary/60 uppercase ml-1 tracking-widest">No. of Passengers (Pax) *</Label>
          <div className="relative mt-1">
            <Input
              id="passengerCount"
              type="number"
              min="1"
              placeholder="0"
              value={data.passengerCount || ''}
              onChange={(e) => onChange({ passengerCount: parseInt(e.target.value) || undefined })}
              disabled={disabled}
              className="h-10 bg-white border-gray-100 rounded-lg font-bold text-primary focus:ring-secondary/20 text-base pl-10"
            />
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
          </div>
        </div>
      </div>

      {/* Travel Details - Compact */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-secondary/10 pb-3">
          <h4 className="text-sm font-bold text-primary uppercase italic tracking-wider">Travel Details</h4>
          {durationDays > 0 && (
            <div className={cn(
              "px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all shadow-sm",
              durationError 
                ? "bg-destructive/5 border-destructive/20 text-destructive" 
                : "bg-emerald-50 border-emerald-500/20 text-emerald-700"
            )}>
              {durationError ? `Error` : `Duration: ${durationDays} Days`}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl overflow-hidden">
          <TravelDetailsForm
            data={data}
            onChange={onChange}
            airports={airports}
            disabled={disabled}
            durationDays={durationDays}
            durationError={durationError}
            onDateChange={handleDateChange}
            onAirportChange={handleAirportChange}
            allowOneWayOption={allowOneWayOption}
          />
        </div>
      </div>

      {/* Hotel Booking (Group Only) - Compact */}
      {isGroupBooking && (
        <div className="space-y-6 animate-in slide-in-from-top-2 duration-500">
          <div className="p-4 rounded-2xl bg-secondary/5 border border-secondary/10 flex items-center gap-3">
            <Hotel className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
              Hotel accommodation required for group bookings.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-secondary/10 pb-3">
              <h4 className="text-sm font-bold text-primary uppercase italic tracking-wider">Hotel Bookings</h4>
              {onAddHotelBooking && (
                <Button
                  type="button"
                  onClick={onAddHotelBooking}
                  disabled={disabled}
                  className="h-8 px-4 rounded-lg bg-secondary text-primary font-bold uppercase shadow-sm hover:bg-secondary/90 transition-all active:scale-95 text-[9px]"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Hotel
                </Button>
              )}
            </div>

            {hotelBookings.length > 0 && (
              <div className="scale-90 origin-left mb-2">
                <HotelCoverageIndicator
                  coveredDays={coverage.coveredDays}
                  totalDays={coverage.totalDays}
                  coveragePercentage={coverage.coveragePercentage}
                  remainingDays={coverage.remainingDays}
                  totalBookedDays={coverage.totalBookedDays}
                  daysBeyond={coverage.daysBeyond}
                />
              </div>
            )}

            {getHotelsForLocation && (
              <div className="bg-white rounded-xl border border-secondary/10 shadow-sm overflow-hidden">
                <HotelBookingTable
                  hotelBookings={hotelBookings}
                  locations={locations}
                  hotels={hotels}
                  getHotelsForLocation={getHotelsForLocation}
                  onUpdateBooking={updateHotelBooking}
                  onRemoveBooking={onRemoveHotelBooking}
                  onAddBooking={onAddHotelBooking}
                  disabled={disabled}
                  showAddButton={false}
                  arrivalDate={arrivalDate || data.arrivalDate}
                  departureDate={departureDate || data.departureDate}
                  hideInventory={isGroupBooking}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
