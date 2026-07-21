'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { getUser, hasRole } from '@/lib/auth';
import { ChevronRight, ChevronLeft, Plane, Users, Home, User, Truck, ArrowLeft, Loader2 } from 'lucide-react';
import { partyAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

// Import our new components and hooks
import { useGroupUmrahBooking } from '@/hooks/useGroupUmrahBooking';
import { useMasterData } from '@/hooks/useUmrahBooking';
import { StepProgress, LoadingSpinner } from '@/components/umrah-booking/shared';
import { GroupDetailsStep } from '@/components/umrah-booking/steps/GroupDetailsStep';
import { TravelDetailsStep } from '@/components/umrah-booking/steps/TravelDetailsStep';
import { MovementDetailsStep } from '@/components/umrah-booking/steps/MovementDetailsStep';
import { TransportVehicleSelectionStep } from '@/components/umrah-booking/steps/TransportVehicleSelectionStep';
import { GroupDocumentsStep } from '@/components/umrah-booking/steps/GroupDocumentsStep';
import { validateStep1, validateStep2, validateStep3, validateStep4, validateStep5 } from '@/lib/umrah/validation';

interface Party {
  id: string;
  partyName: string;
  partyCode?: string;
  email: string;
}

function CreateGroupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [loadingParties, setLoadingParties] = useState(true);
  const [selectedPartyId, setSelectedPartyId] = useState<string>(searchParams.get('partyId') || '');

  // Use our custom hooks
  const {
    bookingState,
    isLoading,
    partyCurrency,
    updateStep1Data,
    updateStep2Data,
    updateStep3Data,
    updateStep4Data,
    updateStep5Data,
    setCurrentStep,
    loadPartyData,
    submitStep,
    addPassenger,
    removePassenger,
    addHotelBooking,
    removeHotelBooking,
    hasStepDataChanged,
    globalAllowOneWayTicket,
    globalAllowWithoutTicket,
    selectedParty,
  } = useGroupUmrahBooking();

  const {
    masterData,
    loadInitialData,
    loadHotels,
    getHotelsForLocation,
  } = useMasterData();

  const steps = [
    { id: 1, title: 'Group Details', description: 'Group number and name', icon: 'Users' },
    { id: 2, title: 'Travel & Hotel', description: 'Flight and hotel info', icon: 'Plane' },
    { id: 3, title: 'Transport', description: 'Vehicle selection', icon: 'Truck' },
    { id: 4, title: 'Movements', description: 'Itinerary details', icon: 'Home' },
    { id: 5, title: 'Verification', description: 'Asset upload', icon: 'User' },
  ];

  useEffect(() => {
    setIsClient(true);
    const currentUser = getUser();
    setUser(currentUser);
    if (!currentUser || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    loadParties();
    loadInitialData();
  }, [router, loadInitialData]);

  useEffect(() => {
    if (selectedPartyId) {
      loadPartyData(selectedPartyId);
    }
  }, [selectedPartyId, loadPartyData]);

  const loadParties = async () => {
    try {
      setLoadingParties(true);
      const response = await partyAPI.getAll({ is_customer: 'true', page: '1', limit: '1000' });
      setParties(response.data.parties || []);
    } catch (error) {
      console.error('Error loading parties:', error);
    } finally {
      setLoadingParties(false);
    }
  };

  const validateCurrentStep = () => {
    switch (bookingState.currentStep) {
      case 1: return validateStep1(bookingState.step1Data);
      case 2: return validateStep2(bookingState.step2Data, masterData.airports, bookingState.step1Data, masterData.umrahVisaMaster);
      case 3: return validateStep3(bookingState.step3Data, bookingState.step2Data.arrivalDate, bookingState.step2Data.departureDate, bookingState.step2Data, masterData.locationMasters);
      case 4: return validateStep4(
        bookingState.step4Data, 
        bookingState.step2Data.arrivalDate, 
        bookingState.step2Data.departureDate,
        undefined,
        undefined,
        masterData.locationMasters
      );
      case 5: return validateStep5(bookingState.step5Data, bookingState.step1Data, bookingState.step3Data, true);
      default: return null;
    }
  };

  const nextStep = async () => {
    if (!selectedPartyId) { toast.error('Please select a party first'); return; }
    const validationError = validateCurrentStep();
    if (validationError) { toast.error(validationError); return; }
    const success = await submitStep(bookingState.currentStep);
    if (success && bookingState.currentStep === 5) router.push('/dashboard/umrah-visa/bookings');
  };

  const prevStep = () => setCurrentStep(Math.max(bookingState.currentStep - 1, 1));

  const goToStep = (stepId: number) => {
    if (stepId <= bookingState.currentStep || bookingState.completedSteps.includes(stepId)) setCurrentStep(stepId);
  };

  const renderStepContent = () => {
    switch (bookingState.currentStep) {
      case 1:
        return <GroupDetailsStep data={bookingState.step1Data} onChange={updateStep1Data} disabled={isLoading} />;
      case 2:
        return <TravelDetailsStep data={bookingState.step2Data} onChange={updateStep2Data} airports={masterData.airports} disabled={isLoading} isGroupBooking={true} locations={masterData.locations} hotels={masterData.hotels} arrivalDate={bookingState.step2Data.arrivalDate} departureDate={bookingState.step2Data.departureDate} onLoadHotels={loadHotels} getHotelsForLocation={getHotelsForLocation} onAddHotelBooking={addHotelBooking} onRemoveHotelBooking={removeHotelBooking} allowOneWayOption={globalAllowOneWayTicket || selectedParty?.allowOneWayTicket} allowWithoutTicketOption={globalAllowWithoutTicket || selectedParty?.allowWithoutTicket} />;
      case 3:
        return <TransportVehicleSelectionStep data={bookingState.step3Data} step1Data={bookingState.step1Data} step2Data={bookingState.step2Data} locationMasters={masterData.locationMasters} onChange={updateStep3Data} disabled={isLoading} currency={partyCurrency || undefined} />;
      case 4:
        const arrivalAirport = masterData.locationMasters?.find(lm => lm.id === bookingState.step2Data.arrivalAirportId && lm.locationType === 'AIRPORT');
        return <MovementDetailsStep data={bookingState.step4Data} onChange={updateStep4Data} locations={masterData.locations} locationMasters={masterData.locationMasters} hotelBookings={bookingState.step2Data.hotelBookings || []} arrivalAirportId={bookingState.step2Data.arrivalAirportId} departureAirportId={bookingState.step2Data.departureAirportId} arrivalDate={bookingState.step2Data.arrivalDate} departureDate={bookingState.step2Data.departureDate} arrivalTime={bookingState.step2Data.arrivalTime} departureTime={bookingState.step2Data.departureTime} arrivalAirport={arrivalAirport} getAllHotelsForLocation={getHotelsForLocation} step3Data={bookingState.step3Data} disabled={isLoading} />;
      case 5:
        return <GroupDocumentsStep data={bookingState.step5Data} step1Data={bookingState.step1Data} step3Data={bookingState.step3Data} onChange={updateStep5Data} onStep1DataChange={updateStep1Data} onAddPassenger={addPassenger} onRemovePassenger={removePassenger} disabled={isLoading} />;
      default:
        return null;
    }
  };

  if (!isClient) return <LoadingSpinner />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-primary uppercase tracking-tight leading-none">Create Group Visa</h1>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">Admin Portal</p>
          </div>
        </div>
        {selectedPartyId && (
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl bg-primary/5 border border-secondary/20 shadow-sm">
             <Users className="h-3.5 w-3.5 text-secondary" />
             <span className="text-[10px] font-bold text-primary uppercase">{parties.find(p => p.id === selectedPartyId)?.partyName || 'Syncing...'}</span>
          </div>
        )}
      </header>

      <div className="p-4 lg:p-6 max-w-[1400px] mx-auto w-full flex-1 pb-24 overflow-auto">
        {!selectedPartyId ? (
          <div className="max-w-xl mx-auto mt-8">
            <Card className="border-0 shadow-2xl shadow-primary/5 rounded-[2rem] overflow-hidden">
              <div className="bg-primary p-8 text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-secondary border border-white/5"><Users className="h-6 w-6" /></div>
                <CardTitle className="text-xl font-bold text-white uppercase tracking-tight">Select Party</CardTitle>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-primary/60 uppercase ml-1">Choose Partner Agency</Label>
                  <SearchableSelect
                    options={parties.map(p => ({ value: p.id, label: p.partyName }))}
                    value={selectedPartyId}
                    onValueChange={(v) => { setSelectedPartyId(v); setCurrentStep(1); }}
                    placeholder="Select a party"
                    searchPlaceholder="Search agency..."
                    className="h-12 rounded-xl border-gray-100"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <StepProgress currentStep={bookingState.currentStep} completedSteps={bookingState.completedSteps} onStepClick={goToStep} steps={steps} />
            <Card className="border shadow-sm rounded-xl bg-white overflow-hidden">
              <div className="px-6 py-6 border-b border-secondary/10 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-bold text-xs">0{bookingState.currentStep}</div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider">{steps[bookingState.currentStep - 1].title}</h3>
              </div>
              <div className="p-6">
                {renderStepContent()}

                {/* Navigation - Attached to bottom of card */}
                <div className="mt-10 pt-8 border-t border-secondary/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {bookingState.currentStep > 1 && <Button variant="outline" onClick={prevStep} disabled={isLoading} className="h-10 px-6 rounded-lg border-secondary/20 text-primary font-bold uppercase text-xs hover:bg-secondary"><ChevronLeft className="h-4 w-4 mr-1" /> Previous</Button>}
                    <Button variant="ghost" onClick={() => router.push('/dashboard/umrah-visa/bookings')} disabled={isLoading} className="h-10 px-6 rounded-lg text-muted-foreground font-bold uppercase text-xs hover:bg-destructive/5 hover:text-destructive">Cancel</Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={nextStep} disabled={isLoading} className="h-10 px-8 rounded-lg bg-primary text-white font-bold uppercase shadow-md hover:bg-primary/90 transition-all text-xs">{isLoading ? 'Syncing...' : bookingState.currentStep < 5 ? 'Next Step' : 'Submit Application'}{bookingState.currentStep < 5 && <ChevronRight className="h-4 w-4 ml-1" />}</Button>
                    {bookingState.currentStep < 5 && bookingState.completedSteps.includes(bookingState.currentStep) && hasStepDataChanged(bookingState.currentStep) && (
                      <div className="hidden sm:flex items-center justify-center text-[8px] font-bold text-orange-400 border border-orange-400/20 px-2 py-1 rounded-md animate-pulse uppercase tracking-widest">Unsaved Changes</div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminCreateGroupUmrahVisaPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Protocol Initialization..." />}>
      <CreateGroupContent />
    </Suspense>
  );
}
