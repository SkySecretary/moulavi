'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUser, hasRole } from '@/lib/auth';
import { ChevronRight, ChevronLeft, User, Loader2, ArrowLeft, KeyRound, Building2 } from 'lucide-react';
import { partyAPI } from '@/lib/api';

// Import our new components and hooks
import { useUmrahBooking, useMasterData } from '@/hooks/useUmrahBooking';
import { StepProgress, LoadingSpinner } from '@/components/umrah-booking/shared';
import { INDIVIDUAL_STEPS } from '@/lib/umrah/constants';
import { BookingModeStep } from '@/components/umrah-booking/steps/BookingModeStep';
import { TravelDetailsStep } from '@/components/umrah-booking/steps/TravelDetailsStep';
import { AccommodationStep } from '@/components/umrah-booking/steps/AccommodationStep';
import { TransportVehicleSelectionStep } from '@/components/umrah-booking/steps/TransportVehicleSelectionStep';
import { MovementDetailsStep } from '@/components/umrah-booking/steps/MovementDetailsStep';
import { DocumentsStep } from '@/components/umrah-booking/steps/DocumentsStep';
import { validateStep1, validateStep2, validateStep3, validateStep4, validateStep5Movements, validateStep6 } from '@/lib/umrah/validation';

interface Party {
  id: string;
  partyName: string;
  email: string;
}

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// Main content component that uses searchParams
function CreateIndividualContent() {
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
    updateStep6Data,
    setCurrentStep,
    loadPartyData,
    submitStep,
  } = useUmrahBooking();

  const {
    masterData,
    loadInitialData,
    loadHotels,
    getHotelsForLocation,
    refreshHotels,
  } = useMasterData();

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

  // Load party data when selectedPartyId changes (including from URL)
  useEffect(() => {
    if (selectedPartyId) {
      loadPartyData(selectedPartyId);
    }
  }, [selectedPartyId, loadPartyData]);

  const loadParties = async () => {
    try {
      setLoadingParties(true);
      const response = await partyAPI.getAll({ is_customer: 'true', page: '1', limit: '1000' });
      const partiesData = response.data.parties || [];
      setParties(partiesData);
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
      case 3: return validateStep3(bookingState.step3Data, bookingState.step2Data.arrivalDate, bookingState.step2Data.departureDate, bookingState.step2Data);
      case 4: return validateStep4(
        bookingState.step4Data, 
        bookingState.step2Data.arrivalDate, 
        bookingState.step2Data.departureDate,
        undefined,
        bookingState.step2Data,
        masterData.locationMasters
      );
      case 5: return validateStep5Movements(bookingState.step5Data, bookingState.step1Data, bookingState.step2Data, bookingState.step3Data, bookingState.step4Data, masterData.locationMasters);
      case 6: return validateStep6(bookingState.step6Data || { panCardZipFile: null }, bookingState.step1Data, bookingState.step3Data, false);
      default: return null;
    }
  };

  const nextStep = async () => {
    if (!selectedPartyId) { toast.error('Please select a party first'); return; }
    const validationError = validateCurrentStep();
    if (validationError) { toast.error(validationError); return; }
    const success = await submitStep(bookingState.currentStep);
    if (success && bookingState.currentStep === 6) router.push('/dashboard/umrah-visa/bookings');
  };

  const prevStep = () => {
    setCurrentStep(Math.max(bookingState.currentStep - 1, 1));
  };

  const goToStep = (stepId: number) => {
    if (stepId <= bookingState.currentStep || bookingState.completedSteps.includes(stepId)) setCurrentStep(stepId);
  };

  if (!isClient) return <LoadingSpinner />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-primary uppercase tracking-tight leading-none">Create Individual Visa</h1>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">Admin Management Portal</p>
          </div>
        </div>
        {selectedPartyId && (
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl bg-primary/5 border border-secondary/20 shadow-sm">
             <User className="h-3.5 w-3.5 text-secondary" />
             <span className="text-[10px] font-bold text-primary uppercase">{parties.find(p => p.id === selectedPartyId)?.partyName || 'Syncing...'}</span>
          </div>
        )}
      </header>

      <div className="p-4 lg:p-6 max-w-[1100px] mx-auto w-full flex-1 pb-24 overflow-auto">
        {!selectedPartyId ? (
          <div className="max-w-xl mx-auto mt-8">
            <Card className="border-0 shadow-2xl shadow-primary/5 rounded-[2rem] overflow-hidden">
              <div className="bg-primary p-8 text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-secondary border border-white/5"><User className="h-6 w-6" /></div>
                <CardTitle className="text-xl font-bold text-white uppercase tracking-tight">Select Party</CardTitle>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-primary/60 uppercase ml-1">Choose Partner Agency</Label>
                  <Select value={selectedPartyId} onValueChange={(v) => { setSelectedPartyId(v); setCurrentStep(1); }}>
                    <SelectTrigger className="h-12 rounded-xl border-gray-100 font-bold"><SelectValue placeholder="Select a party" /></SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-2xl p-1">{parties.map((p) => (<SelectItem key={p.id} value={p.id} className="text-xs font-bold p-3">{p.partyName}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <StepProgress currentStep={bookingState.currentStep} completedSteps={bookingState.completedSteps} onStepClick={goToStep} steps={[...INDIVIDUAL_STEPS]} />
            <Card className="border shadow-sm rounded-xl bg-white overflow-hidden">
              <div className="px-6 py-6 border-b border-secondary/10 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-bold text-xs">0{bookingState.currentStep}</div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider">{INDIVIDUAL_STEPS[bookingState.currentStep - 1].title}</h3>
              </div>
              <div className="p-6">
                {(() => {
                  switch (bookingState.currentStep) {
                    case 1: return <BookingModeStep data={bookingState.step1Data} onChange={updateStep1Data} disabled={isLoading} />;
                    case 2: return <TravelDetailsStep data={bookingState.step2Data} onChange={updateStep2Data} airports={masterData.airports} disabled={isLoading} />;
                    case 3: return <AccommodationStep data={bookingState.step3Data} onChange={updateStep3Data} locations={masterData.locations} hotels={masterData.hotels} arrivalDate={bookingState.step2Data.arrivalDate} departureDate={bookingState.step2Data.departureDate} onLoadHotels={loadHotels} getHotelsForLocation={getHotelsForLocation} refreshHotels={refreshHotels} passengerCount={bookingState.step2Data.passengerCount} disabled={isLoading} />;
                    case 4: return <TransportVehicleSelectionStep data={bookingState.step4Data} step1Data={bookingState.step1Data} step2Data={bookingState.step2Data} step3Data={bookingState.step3Data} locationMasters={masterData.locationMasters} onChange={(d) => { updateStep4Data(d); if (!(d.selectedTransport || (d.selectedTransports && d.selectedTransports.length > 0))) updateStep5Data({ movements: [] }); }} disabled={isLoading} currency={partyCurrency || undefined} />;
                    case 5: return <MovementDetailsStep data={bookingState.step5Data} step1Data={bookingState.step1Data} step2Data={bookingState.step2Data} step3Data={bookingState.step3Data} step4Data={bookingState.step4Data} locationMasters={masterData.locationMasters} arrivalAirportId={bookingState.step2Data.arrivalAirportId} departureAirportId={bookingState.step2Data.departureAirportId} arrivalDate={bookingState.step2Data.arrivalDate} departureDate={bookingState.step2Data.departureDate} arrivalTime={bookingState.step2Data.arrivalTime} departureTime={bookingState.step2Data.departureTime} onChange={updateStep5Data} disabled={isLoading} />;
                    case 6: return <DocumentsStep data={bookingState.step6Data || { panCardZipFile: null }} step1Data={bookingState.step1Data} step3Data={bookingState.step3Data} onChange={updateStep6Data} disabled={isLoading} />;
                    default: return null;
                  }
                })()}

                {/* Navigation - Attached to bottom of card */}
                <div className="mt-10 pt-8 border-t border-secondary/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {bookingState.currentStep > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        disabled={isLoading}
                        className="h-10 px-6 rounded-lg border-secondary/20 text-primary font-bold uppercase tracking-wider hover:bg-secondary transition-all text-xs"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => router.push('/dashboard/umrah-visa/bookings')}
                      disabled={isLoading}
                      className="h-10 px-6 rounded-lg text-muted-foreground font-bold uppercase tracking-wider hover:bg-destructive/5 hover:text-destructive transition-all text-xs"
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={isLoading || !selectedPartyId}
                      className="h-10 px-8 rounded-lg bg-primary text-white font-bold uppercase tracking-wider shadow-md hover:bg-primary/90 transition-all active:scale-[0.97] text-xs"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <>
                          <span>
                            {bookingState.currentStep < 6 ? 'Next Step' : 'Submit Application'}
                          </span>
                          {bookingState.currentStep < 6 && <ChevronRight className="h-4 w-4 ml-1" />}
                        </>
                      )}
                    </Button>
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

export default function AdminCreateIndividualUmrahVisaPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Protocol Initialization..." />}>
      <CreateIndividualContent />
    </Suspense>
  );
}
