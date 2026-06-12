// Simplified MovementDetailsStep using unified movements model
import React from 'react';
import { Step3Data, Step4Data, Step5Data, Movement, HotelBooking } from '@/lib/umrah/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table2, AlertCircle } from 'lucide-react';
import { MovementsTable } from '../components/MovementsTable';
import { generateMovementsFromRoutes, getSelectedRoutes } from '@/lib/umrah/generateMovements';
import { JourneyFlowSummary } from '../components/JourneyFlowSummary';
import { transportRouteMasterAPI } from '@/lib/api';
import { TransportRouteMaster } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface MovementDetailsStepProps {
  data: Step4Data | Step5Data; // Step 4 for group bookings, Step 5 for individual bookings
  onChange: (data: Partial<Step4Data> | Partial<Step5Data>) => void;
  step1Data?: any;
  step2Data?: any;
  step3Data?: Step3Data; // Transport selections from Step 3 (for group bookings)
  step4Data?: Step4Data; // Transport selections from Step 4 (for individual bookings)
  locationMasters?: any[];
  locations?: any[];
  hotelBookings?: HotelBooking[]; // From step2Data (for group bookings) or step3Data (for individual bookings)
  arrivalAirportId?: string;
  departureAirportId?: string;
  arrivalDate?: string;
  departureDate?: string;
  arrivalTime?: string;
  departureTime?: string;
  arrivalAirport?: {
    cityId?: string;
    cityMaster?: {
      id: string;
      name: string;
    };
  } | null;
  getAllHotelsForLocation?: (locationId: string) => any[];
  onLoadOptions?: (index: number, fromId?: string, toId?: string) => void;
  disabled?: boolean;
  bookingId?: string | null; // Optional booking ID for ziyarath count exclusion
}

export const MovementDetailsStep: React.FC<MovementDetailsStepProps> = ({
  data,
  onChange,
  step1Data,
  step2Data,
  step3Data,
  step4Data,
  locationMasters = [],
  locations = [],
  hotelBookings = [],
  arrivalAirportId,
  departureAirportId,
  arrivalDate,
  departureDate,
  arrivalTime,
  departureTime,
  getAllHotelsForLocation,
  onLoadOptions,
  disabled = false,
  bookingId = null,
}) => {
  const [availableRoutes, setAvailableRoutes] = React.useState<TransportRouteMaster[]>([]);
  const [loadingRoutes, setLoadingRoutes] = React.useState(false);

  // Determine if this is individual booking (movements in Step5Data) or group booking (movements in Step4Data)
  // For individual bookings: step4Data contains transport selections, step5Data contains movements
  // For group bookings: step3Data contains transport selections, step4Data contains movements
  // So if step4Data has transport selections, it's individual booking
  const isIndividualBooking = React.useMemo(() => {
    // Check if step4Data has transport selections (individual booking flow)
    if (step4Data && (step4Data.selectedTransport || (step4Data.selectedTransports && step4Data.selectedTransports.length > 0))) {
      return true;
    }
    // Check if step3Data has transport selections (group booking flow)
    if (step3Data && (step3Data.selectedTransport || (step3Data.selectedTransports && step3Data.selectedTransports.length > 0))) {
      return false;
    }
    // Default: if step4Data exists but no transport, assume individual (since we're in movements step)
    // This handles the case where transport might not be selected yet
    return !!step4Data;
  }, [step3Data, step4Data]);
  
  // Get hotel bookings: from step2Data for group bookings, from step3Data for individual bookings
  const actualHotelBookings = React.useMemo(() => {
    if (hotelBookings && hotelBookings.length > 0) return hotelBookings;
    if (step3Data?.hotelBookings && step3Data.hotelBookings.length > 0) return step3Data.hotelBookings;
    if (step2Data?.hotelBookings && step2Data.hotelBookings.length > 0) return step2Data.hotelBookings;
    return [];
  }, [hotelBookings, step2Data, step3Data]);

  // Get transport data: from step3Data for group bookings, from step4Data for individual bookings
  const transportData = React.useMemo(() => {
    if (isIndividualBooking && step4Data) {
      return step4Data;
    }
    return step3Data;
  }, [isIndividualBooking, step3Data, step4Data]);

  // Check if hotels are valid
  const areHotelsValid = React.useMemo(() => {
    if (actualHotelBookings.length === 0) return false;
    return actualHotelBookings.every(
      (booking: HotelBooking) =>
        booking.cityId &&
        booking.hotelId &&
        booking.checkInDate &&
        booking.checkOutDate
    );
  }, [actualHotelBookings]);

  // Helper: Find ziyarath LocationMaster by city name
  const findZiyarathByCity = React.useCallback((cityName: string): any => {
    const normalizedCity = cityName.toLowerCase().trim();
    return locationMasters.find(
      (lm: any) =>
        lm.locationType === 'ZIYARAT' &&
        (lm.city || '').toLowerCase() === normalizedCity
    );
  }, [locationMasters]);

  // Load available routes
  React.useEffect(() => {
    const loadRoutes = async () => {
      setLoadingRoutes(true);
      try {
        const response = await transportRouteMasterAPI.getActive();
        const routes: TransportRouteMaster[] = response.data.transportRouteMasters || [];
        setAvailableRoutes(routes);
      } catch (error: any) {
        console.error('Error loading routes:', error);
      } finally {
        setLoadingRoutes(false);
      }
    };

    loadRoutes();
  }, []);

  // Track previous dependencies to detect changes and reset manual edit flag
  const prevDepsRef = React.useRef({
    hotelBookings: actualHotelBookings,
    arrivalAirportId,
    departureAirportId,
    arrivalDate,
    departureDate,
    transportData,
  });
  const isManualEditRef = React.useRef<boolean>(false);
  const lastGeneratedHashRef = React.useRef<string>('');

  // Reset manual edit flag when key dependencies change
  React.useEffect(() => {
    const prev = prevDepsRef.current;
    const hasChanged = 
      prev.hotelBookings !== actualHotelBookings ||
      prev.arrivalAirportId !== arrivalAirportId ||
      prev.departureAirportId !== departureAirportId ||
      prev.arrivalDate !== arrivalDate ||
      prev.departureDate !== departureDate ||
      prev.transportData !== transportData;
          
    if (hasChanged) {
      isManualEditRef.current = false;
      prevDepsRef.current = {
        hotelBookings: actualHotelBookings,
        arrivalAirportId,
        departureAirportId,
        arrivalDate,
        departureDate,
        transportData,
      };
          }
  }, [actualHotelBookings, arrivalAirportId, departureAirportId, arrivalDate, departureDate, transportData]);

  // Helper: Find Jeddah City Center location (OTHERS type)
  const findJeddahCityCenter = React.useCallback((): any => {
    return locationMasters.find(
      (lm: any) =>
        lm.locationType === 'OTHERS' &&
        (lm.name?.toLowerCase().includes('jeddah') || lm.name?.toLowerCase().includes('city center')) &&
        (lm.city?.toLowerCase().includes('jeddah') || lm.cityMaster?.name?.toLowerCase().includes('jeddah'))
    );
  }, [locationMasters]);

  // Generate movements based on selected transport routes
  React.useEffect(() => {
    // Skip if user has manually edited movements
    if (isManualEditRef.current) {
      return;
    }

    // Check if transport is still selected - if not, clear movements
    const hasTransport = (transportData?.selectedTransports?.length ?? 0) > 0 || !!transportData?.selectedTransport;
    if (!hasTransport) {
      // Clear movements if no transport is selected
      if (movements.length > 0) {
        onChange({ movements: [] });
        lastGeneratedHashRef.current = '';
      }
      return;
    }

    // Check if accommodation is iqama
    const accommodationType = step3Data?.accommodationType;
    const isIqama = accommodationType === 'iqama';

    // For iqama: Generate default movement from airport to Jeddah City Center
    if (isIqama && hasTransport) {
      if (!arrivalAirportId || !arrivalDate) {
        return;
      }

      const jeddahCityCenter = findJeddahCityCenter();
      if (jeddahCityCenter) {
        const defaultMovement: Movement = {
          id: `movement-iqama-airport-to-citycenter`,
          type: 'transport',
          fromLocationId: arrivalAirportId,
          toLocationId: jeddahCityCenter.id,
          date: arrivalDate,
          time: arrivalTime || '20:30',
        };

        const movementsHash = JSON.stringify([defaultMovement].map(m => 
          `${m.type}-${m.fromLocationId}-${m.toLocationId}-${m.date}-${m.time}`
        ));

        if (movementsHash !== lastGeneratedHashRef.current) {
          lastGeneratedHashRef.current = movementsHash;
          onChange({ movements: [defaultMovement] });
        }
      }
      return; // Exit early for iqama, don't generate hotel-based movements
    }

    // For hotel bookings: Only auto-generate when hotels are valid
    if (!areHotelsValid) {
      return;
    }

    if (!arrivalAirportId || !departureAirportId || !arrivalDate || !departureDate) {
      return;
        }
        
    // Only generate if transport routes are selected
    if (hasTransport && transportData) {
      const selectedRoutes = getSelectedRoutes(transportData, availableRoutes);
      
      if (selectedRoutes.length > 0) {
        const generatedMovements = generateMovementsFromRoutes({
          hotelBookings: actualHotelBookings,
          arrivalAirportId,
          departureAirportId,
          arrivalDate,
          arrivalTime: arrivalTime || '20:30',
          departureDate,
          departureTime: departureTime || '20:30',
          locationMasters,
          findZiyarathByCity,
          selectedRoutes,
        });

        // Create a simple hash to prevent unnecessary updates
        const movementsHash = JSON.stringify(generatedMovements.map(m => 
          `${m.type}-${m.fromLocationId}-${m.toLocationId}-${m.date}-${m.time}`
        ));

        // Only update if the generated movements are different
        if (movementsHash !== lastGeneratedHashRef.current) {
          lastGeneratedHashRef.current = movementsHash;
          onChange({ movements: generatedMovements });
        }
      }
    }
  }, [
    areHotelsValid,
    actualHotelBookings,
    arrivalAirportId,
    departureAirportId,
    arrivalDate,
    departureDate,
    arrivalTime,
    departureTime,
    locationMasters,
    findZiyarathByCity,
    transportData,
    availableRoutes,
    onChange,
    step3Data,
    findJeddahCityCenter,
  ]);

  // Movement handlers - support both Step4Data (group) and Step5Data (individual)
  const movements = (data as Step4Data | Step5Data).movements || [];
  
  // Check if transport routes are selected
  const hasTransportSelected = (transportData?.selectedTransports?.length ?? 0) > 0 || !!transportData?.selectedTransport;
  
  // Determine the transport step number for messages
  const transportStepNumber = isIndividualBooking ? 4 : 3;
  
  const addMovement = React.useCallback(() => {
    isManualEditRef.current = true; // Mark as manual edit
    const newMovement: Movement = {
      id: `movement-${Date.now()}`,
      type: 'transport',
          fromLocationId: '',
          toLocationId: '',
      date: '',
      time: '20:30',
    };
    onChange({ movements: [...movements, newMovement] });
  }, [movements, onChange]);

  const removeMovement = React.useCallback(
    (index: number) => {
      isManualEditRef.current = true; // Mark as manual edit
      const updatedMovements = [...movements];
      updatedMovements.splice(index, 1);
      onChange({ movements: updatedMovements });
    },
    [movements, onChange]
  );

  const updateMovement = React.useCallback(
    (index: number, field: keyof Movement, value: any) => {
      isManualEditRef.current = true; // Mark as manual edit
      const updatedMovements = [...movements];
      updatedMovements[index] = { ...updatedMovements[index], [field]: value };
      onChange({ movements: updatedMovements });
    },
    [movements, onChange]
  );

  const addMovementAfter = React.useCallback(
    (index: number) => {
      isManualEditRef.current = true; // Mark as manual edit
      const newMovement: Movement = {
        id: `movement-${Date.now()}`,
        type: 'transport',
        fromLocationId: '',
        toLocationId: '',
        date: '',
        time: '20:30',
      };
      const updatedMovements = [...movements];
      updatedMovements.splice(index + 1, 0, newMovement);
      onChange({ movements: updatedMovements });
    },
    [movements, onChange]
  );

  // Convert movements to old format for JourneyFlowSummary (backward compatibility)
  const getTransportSegmentsForSummary = () => {
    return (movements || [])
      .filter((m) => m.type === 'transport')
      .map((m) => ({
        fromLocationId: m.fromLocationId,
        toLocationId: m.toLocationId,
        fromHotelId: m.fromLocationId,
        toHotelId: m.toLocationId,
        travelDate: m.date,
        travelTime: m.time,
        paxCount: m.paxCount || 0,
        price: m.price || 0,
      }));
  };

  const getZiyarathsForSummary = () => {
    return (movements || [])
      .filter((m) => m.type === 'ziyarath')
      .map((m) => ({
        id: m.id,
        ziyarathId: m.toLocationId,
        date: m.date,
        time: m.time,
      }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Movement Details - Compact */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-secondary/10 pb-3">
          <h4 className="text-sm font-bold text-primary uppercase italic tracking-wider">Movement Details</h4>
          <Button
            type="button"
            onClick={addMovement}
            disabled={disabled}
            className="h-8 px-4 rounded-lg bg-secondary text-primary font-bold uppercase shadow-sm hover:bg-secondary/90 transition-all active:scale-95 text-[9px]"
          >
            <Table2 className="h-3.5 w-3.5 mr-1.5" />
            Add Movement
          </Button>
        </div>

        {!hasTransportSelected && (
          <div className="p-3 rounded-xl bg-secondary/5 border border-secondary/20 flex items-center gap-3">
            <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-[9px] font-bold text-primary uppercase tracking-widest">
              Select transport routes in Step {transportStepNumber} to auto-generate movements.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-secondary/10 shadow-sm overflow-hidden">
          <MovementsTable
            movements={movements}
            locationMasters={locationMasters}
            onUpdateMovement={updateMovement}
            onRemoveMovement={removeMovement}
            onAddMovement={addMovementAfter}
            disabled={disabled}
            emptyMessage={`No movements found. Select routes or add manually.`}
            bookingId={bookingId}
          />
        </div>
      </div>

      {/* Summary Visualization - Compact */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-4 px-1">
           <div className="h-0.5 w-4 bg-secondary rounded-full" />
           <h4 className="text-[8px] font-bold text-primary/40 uppercase tracking-[0.3em]">Journey Summary</h4>
        </div>
        
        <div className="bg-primary/5 rounded-xl p-2 border border-secondary/10 shadow-inner scale-[0.98] origin-top">
          <JourneyFlowSummary
            transportSegments={getTransportSegmentsForSummary()}
            ziyaraths={getZiyarathsForSummary()}
            locations={locations}
            locationMasters={locationMasters}
          />
        </div>
      </div>
    </div>
  );
};
