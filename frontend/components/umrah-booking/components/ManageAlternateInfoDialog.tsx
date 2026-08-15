'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plane, Building, Truck, Route, Save, Info } from 'lucide-react';
import { umrahVisaAPI, locationMasterAPI, cityMasterAPI, vehicleTypeMasterAPI } from '@/lib/api';
import { toast } from 'sonner';
import { TravelDetailsForm } from './TravelDetailsForm';
import { AccommodationStep } from '../steps/AccommodationStep';
import { TransportVehicleSelectionStep } from '../steps/TransportVehicleSelectionStep';
import { MovementDetailsStep } from '../steps/MovementDetailsStep';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Airport, Location, Hotel as HotelType } from '@/lib/umrah/types';
import { toDisplayDate, fromDisplayDate, extractDateFromISO, extractTimeFromISO, combineDateAndTime } from '@/lib/umrah/validation';

interface ManageAlternateInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onSuccess: () => void;
}

export const ManageAlternateInfoDialog: React.FC<ManageAlternateInfoDialogProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState('travel');
  const [isSaving, setIsSaving] = useState(false);
  const [masterData, setMasterData] = useState<any>({
    airports: [],
    locations: [],
    hotels: [],
    cities: [],
    vehicleTypes: [],
    locationMasters: [],
  });
  const [loadingMaster, setLoadingMaster] = useState(false);

  // Form States for Alternate Info
  const [travelData, setTravelData] = useState<any>({
    arrivalDate: '',
    arrivalTime: '',
    arrivalFlightNumber: '',
    arrivalAirportId: '',
    departureDate: '',
    departureTime: '',
    departureFlightNumber: '',
    departureAirportId: '',
  });

  const [accommodationData, setAccommodationData] = useState<any>({
    accommodationType: 'hotel',
    hotelBookings: [],
    iqamaDetails: {},
  });

  const [transportBookings, setTransportBookings] = useState<any[]>([]);
  const [movementDetails, setMovementDetails] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && booking) {
      loadMasterData();
      initializeData();
    }
  }, [isOpen, booking]);

  const loadMasterData = async () => {
    try {
      setLoadingMaster(true);
      const [airportsRes, locationsRes, citiesRes, vehiclesRes] = await Promise.all([
        locationMasterAPI.getActive({ locationType: 'AIRPORT' }),
        locationMasterAPI.getActive(), 
        cityMasterAPI.getActive(), 
        vehicleTypeMasterAPI.getActive(), 
      ]);

      const airportsRaw = airportsRes.data.locationMasters || (Array.isArray(airportsRes.data) ? airportsRes.data : []);
      const locationsRaw = locationsRes.data.locationMasters || (Array.isArray(locationsRes.data) ? locationsRes.data : []);
      const citiesRaw = citiesRes.data.cityMasters || (Array.isArray(citiesRes.data) ? citiesRes.data : []);
      const vehicleTypes = vehiclesRes.data.data?.vehicleTypeMasters || (Array.isArray(vehiclesRes.data) ? vehiclesRes.data : []);

      // Mappings for legacy components
      const airports: Airport[] = airportsRaw.map((a: any) => ({
        id: a.id,
        airportCode: a.code,
        airportName: a.name,
      }));

      const locations: Location[] = citiesRaw.map((c: any) => ({
        id: c.id,
        destinationName: c.name,
      }));

      const hotels: HotelType[] = locationsRaw
        .filter((l: any) => l.locationType === 'HOTEL')
        .map((l: any) => ({
          id: l.id,
          name: l.name,
          hotelName: l.name,
          cityId: l.cityId,
        }));

      setMasterData({
        airports,
        locations,
        hotels,
        cities: citiesRaw,
        vehicleTypes,
        locationMasters: locationsRaw,
      });
    } catch (error) {
      console.error('Error loading master data:', error);
      toast.error('Failed to load required data');
    } finally {
      setLoadingMaster(false);
    }
  };

  const initializeData = () => {
    // Find existing alternate info if any
    const altTravel = booking?.travelDetails?.find((t: any) => t.isAlternate);
    const altHotels = booking?.hotelBookings?.filter((h: any) => h.isAlternate) || [];
    const altTransports = booking?.transportBookings?.filter((t: any) => t.isAlternate) || [];
    const altMovements = booking?.movementDetails?.filter((m: any) => m.isAlternate) || [];

    if (altTravel) {
      setTravelData({
        arrivalDate: toDisplayDate(extractDateFromISO(altTravel.arrivalDateTime)),
        arrivalTime: extractTimeFromISO(altTravel.arrivalDateTime),
        arrivalFlightNumber: altTravel.arrivalFlightNumber || '',
        arrivalAirportId: altTravel.arrivalAirportId || '',
        departureDate: toDisplayDate(extractDateFromISO(altTravel.departureDateTime)),
        departureTime: extractTimeFromISO(altTravel.departureDateTime),
        departureFlightNumber: altTravel.departureFlightNumber || '',
        departureAirportId: altTravel.departureAirportId || '',
      });
    } else {
      const today = toDisplayDate(extractDateFromISO(new Date().toISOString()));
      setTravelData({
        arrivalDate: today,

        arrivalTime: '20:30',
        arrivalFlightNumber: '',
        arrivalAirportId: '',
        departureDate: today,
        departureTime: '20:30',
        departureFlightNumber: '',
        departureAirportId: '',
      });
    }

    setAccommodationData({
      accommodationType: booking?.accommodationType || 'hotel',
      hotelBookings: altHotels.map((h: any) => ({
        id: h.id,
        cityId: h.cityId,
        hotelId: h.hotelId,
        checkInDate: toDisplayDate(extractDateFromISO(h.checkInDate)),
        checkOutDate: toDisplayDate(extractDateFromISO(h.checkOutDate)),
        brn: h.brn || [],
        cateringBrn: h.cateringBrn || [],
      })),
      iqamaDetails: (() => {
        const altIqama = booking?.sponsorIqamaDetails?.find((i: any) => i.isAlternate);
        if (altIqama) {
          return {
            iqamaNumber: altIqama.iqamaNumber || '',
            iqamaName: altIqama.iqamaSponserName || '',
            iqamaDob: altIqama.sponserDob ? toDisplayDate(extractDateFromISO(altIqama.sponserDob)) : '',
            iqamaMobile: altIqama.sponserMobileNumber || '',
            iqamaNationalShortAddress: altIqama.sponserNationalShortAddress || '',
          };
        }
        return {};
      })(),
      });

      setTransportBookings(altTransports.map((t: any) => ({
      id: t.id,
      transportId: t.transportMasterId, // Map to transportId for the step component
      transportMasterId: t.transportMasterId,
      travelDateTime: t.travelDateTime,
      quantity: 1, // Individual records in DB represent quantity 1
      })));

      setMovementDetails(altMovements.map((m: any) => ({
      id: m.id,
      travelDateTime: m.travelDateTime,
      fromLocationId: m.fromLocationId,
      toLocationId: m.toLocationId,
      date: m.travelDateTime ? toDisplayDate(extractDateFromISO(m.travelDateTime)) : '',
      time: m.travelDateTime ? extractTimeFromISO(m.travelDateTime) : '20:30',
      type: 'transport',
      })));

  };

  const handleSave = async () => {
    try {
      if (!travelData.arrivalDate || !travelData.departureDate) {
        toast.error('Arrival and departure dates are required');
        return;
      }

      setIsSaving(true);

      const arrivalDateTime = combineDateAndTime(travelData.arrivalDate, travelData.arrivalTime);
      const departureDateTime = combineDateAndTime(travelData.departureDate, travelData.departureTime);

      // Expand transport bookings based on quantity
      const expandedTransports: any[] = [];
      transportBookings.forEach((t: any) => {
        const qty = t.quantity || 1;
        for (let i = 0; i < qty; i++) {
          expandedTransports.push({
            transportMasterId: t.transportId || t.transportMasterId,
            travelDateTime: t.travelDateTime || arrivalDateTime,
          });
        }
      });

      const payload = {
        travelDetails: {
          arrivalDateTime,
          arrivalAirportId: travelData.arrivalAirportId,
          arrivalFlightNumber: travelData.arrivalFlightNumber,
          departureDateTime,
          departureAirportId: travelData.departureAirportId,
          departureFlightNumber: travelData.departureFlightNumber,
        },
        hotelBookings: accommodationData.accommodationType === 'hotel'
          ? accommodationData.hotelBookings.map((h: any) => ({
              isAlternate: true,
              cityId: h.cityId,
              hotelId: h.hotelId,
              checkInDate: combineDateAndTime(h.checkInDate, '20:30'),
              checkOutDate: combineDateAndTime(h.checkOutDate, '20:30'),
              brn: h.brn || [],
              cateringBrn: h.cateringBrn || [],
            }))
          : [],
        transportBookings: expandedTransports,
        movementDetails: movementDetails
          .filter((m: any) => m.fromLocationId && m.toLocationId) 
          .map(m => {
            let travelDateTime = m.travelDateTime;
            if (m.date && m.time) {
              travelDateTime = combineDateAndTime(m.date, m.time);
            }
            
            const fromLoc = masterData.locationMasters.find((l: any) => l.id === m.fromLocationId);
            const toLoc = masterData.locationMasters.find((l: any) => l.id === m.toLocationId);

            return {
              travelDateTime: travelDateTime || arrivalDateTime,
              fromCityId: fromLoc?.cityId || '',
              fromLocationId: m.fromLocationId,
              toCityId: toLoc?.cityId || '',
              toLocationId: m.toLocationId,
            };
          }),
        iqamaDetails: accommodationData.accommodationType === 'iqama' 
          ? {
              ...accommodationData.iqamaDetails,
              sponserDob: accommodationData.iqamaDetails.iqamaDob ? fromDisplayDate(accommodationData.iqamaDetails.iqamaDob) : undefined,
              iqamaSponserName: accommodationData.iqamaDetails.iqamaName, // Map iqamaName to backend field
            } 
          : null,
      };

      if (payload.movementDetails.length > 0 && payload.movementDetails.some(m => !m.fromCityId || !m.toCityId)) {
        toast.error('Some movement details are missing city information. Please check your selections.');
        setIsSaving(false);
        return;
      }

      await umrahVisaAPI.updateAlternateInfo(booking.id, payload);
      toast.success('Alternate booking information updated successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error saving alternate info:', error);
      toast.error(error.response?.data?.message || 'Failed to save alternate information');
    } finally {
      setIsSaving(false);
    }
  };

  const getHotelsForLocation = (cityId: string) => {
    return (masterData.hotels || []).filter((h: any) => h.cityId === cityId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2 text-secondary">
            <Route className="h-6 w-6" /> Manage Alternate Booking Information
          </DialogTitle>
          <DialogDescription>
            Add or update placeholder/dummy booking details. These will be stored separately from the main booking information.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>
            Alternate information is used when the final travel details are not yet confirmed. You can switch between main and alternate information in the booking view.
          </AlertDescription>
        </Alert>

        {loadingMaster ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-gray-500">Loading master data...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="travel" className="flex items-center gap-2">
                <Plane className="h-4 w-4" /> Flights
              </TabsTrigger>
              <TabsTrigger value="stay" className="flex items-center gap-2">
                <Building className="h-4 w-4" /> Stay
              </TabsTrigger>
              <TabsTrigger value="transport" className="flex items-center gap-2">
                <Truck className="h-4 w-4" /> Transport
              </TabsTrigger>
              <TabsTrigger value="movements" className="flex items-center gap-2">
                <Route className="h-4 w-4" /> Movements
              </TabsTrigger>
            </TabsList>

            <TabsContent value="travel" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <TravelDetailsForm 
                    data={travelData} 
                    onChange={(newData) => setTravelData({ ...travelData, ...newData })}
                    airports={masterData.airports || []}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stay" className="space-y-4">
              <div className="bg-white border rounded-lg p-1">
                <AccommodationStep 
                  data={accommodationData as any} 
                  onChange={(newData: any) => setAccommodationData({ ...accommodationData, ...newData })} 
                  locations={masterData.locations || []} 
                  hotels={masterData.hotels || []}
                  arrivalDate={travelData.arrivalDate}
                  departureDate={travelData.departureDate}
                  getHotelsForLocation={getHotelsForLocation}
                  onLoadHotels={async () => {}}
                  passengerCount={booking?.passengerCount}
                />
              </div>
            </TabsContent>

            <TabsContent value="transport" className="space-y-4">
              <div className="bg-white border rounded-lg">
                <TransportVehicleSelectionStep 
                  data={{ 
                    selectedTransports: transportBookings.map(t => ({ 
                      ...t, 
                      transportMaster: (masterData.locationMasters || []).find((l: any) => l.id === t.transportMasterId) 
                    })),
                  } as any}
                  step1Data={{ passengerCount: booking?.passengerCount } as any}
                  step2Data={{ 
                    arrivalDate: travelData.arrivalDate,
                    departureDate: travelData.departureDate,
                    arrivalAirportId: travelData.arrivalAirportId,
                    departureAirportId: travelData.departureAirportId,
                    hotelBookings: accommodationData.hotelBookings,
                  } as any}
                  step3Data={accommodationData as any} // For Iqama check
                  onChange={(newData: any) => {
                    if (newData.selectedTransports) {
                      setTransportBookings(newData.selectedTransports);
                    }
                  }}
                  locationMasters={masterData.locationMasters || []}
                />
              </div>
            </TabsContent>

            <TabsContent value="movements" className="space-y-4">
              <div className="bg-white border rounded-lg">
                <MovementDetailsStep 
                  data={{ 
                    movements: movementDetails,
                  } as any}
                  onChange={(newData: any) => {
                    if (newData.movements) {
                      setMovementDetails(newData.movements);
                    }
                  }}
                  locationMasters={masterData.locationMasters || []}
                  locations={masterData.locationMasters || []}
                  hotelBookings={accommodationData.hotelBookings}
                  step3Data={accommodationData as any} // Pass accommodation data for Iqama logic
                  arrivalDate={travelData.arrivalDate}
                  departureDate={travelData.departureDate}
                  arrivalTime={travelData.arrivalTime}
                  departureTime={travelData.departureTime}
                  arrivalAirportId={travelData.arrivalAirportId}
                  departureAirportId={travelData.departureAirportId}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="mt-6 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button 
            className="bg-secondary hover:bg-secondary/90 text-white" 
            onClick={handleSave} 
            disabled={isSaving || loadingMaster}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Alternate Information
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
