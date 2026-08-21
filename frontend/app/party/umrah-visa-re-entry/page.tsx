'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getUser, hasRole } from '@/lib/auth';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

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
import { DisclaimerDialog } from '@/components/umrah-booking/shared/DisclaimerDialog';
import { OneWayDisclaimerDialog } from '@/components/umrah-booking/shared/OneWayDisclaimerDialog';

export default function UmrahVisaReEntryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  // Use our custom hooks
  const {
    bookingState,
    isLoading,
    partyId,
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
    selectedParty,
    globalAllowOneWayTicket,
    globalAllowWithoutTicket,
  } = useUmrahBooking();

  const [showOneWayDisclaimer, setShowOneWayDisclaimer] = useState(false);
  const [oneWayDisclaimerAccepted, setOneWayDisclaimerAccepted] = useState(false);

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
    
    if (!currentUser || !hasRole('party')) {
      router.push('/');
      return;
    }

    loadPartyData();
    loadInitialData();
  }, [router, loadPartyData, loadInitialData]);

  // Initialize with re_entry visaType
  useEffect(() => {
    updateStep1Data({ visaType: 're_entry' });
  }, [updateStep1Data]);

  const validateCurrentStep = () => {
    switch (bookingState.currentStep) {
      case 1:
        return validateStep1(bookingState.step1Data);
      case 2:
        return validateStep2(bookingState.step2Data, masterData.airports, bookingState.step1Data, masterData.umrahVisaMaster);
      case 3:
        return validateStep3(bookingState.step3Data, bookingState.step2Data.arrivalDate, bookingState.step2Data.departureDate, bookingState.step2Data);
      case 4:
        return validateStep4(
          bookingState.step4Data, 
          bookingState.step2Data.arrivalDate, 
          bookingState.step2Data.departureDate,
          undefined,
          bookingState.step2Data,
          masterData.locationMasters
        );
      case 5:
        return validateStep5Movements(bookingState.step5Data, bookingState.step1Data, bookingState.step2Data, bookingState.step3Data, bookingState.step4Data, masterData.locationMasters);
      case 6:
        return validateStep6(bookingState.step6Data || {}, bookingState.step1Data, bookingState.step3Data, bookingState.step2Data.passengerCount || bookingState.step1Data.passengerCount || 0, false, !!bookingState.step2Data.isOneWay, !!bookingState.step2Data.isWithoutTicket);
      default:
        return null;
    }
  };

  const nextStep = async () => {
    const validationError = validateCurrentStep();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (bookingState.currentStep === 2 && bookingState.step2Data.isOneWay && !oneWayDisclaimerAccepted) {
      setShowOneWayDisclaimer(true);
      return;
    }

    if (bookingState.currentStep === 3 && bookingState.step3Data.accommodationType === 'iqama') {
      const confirmed = window.confirm(
        "Please verify that all Iqama details are correct. Incorrect information will directly affect visa issuance. Do you want to proceed?"
      );
      if (!confirmed) return;
    }

    const success = await submitStep(bookingState.currentStep);
    
    // Special handling for step 3: Skip steps 4 and 5 if arrival airport is not Jeddah/Madinah
    if (success && bookingState.currentStep === 3 && !isJeddahOrMadinahAirport()) {
      // Skip steps 4 and 5, go directly to step 6
      setCurrentStep(6);
      return;
    }
    
    if (success && bookingState.currentStep === 6) {
      router.push('/party/bookings');
    }
  };

  const handleOneWayDisclaimerConfirm = async () => {
    setShowOneWayDisclaimer(false);
    setOneWayDisclaimerAccepted(true);
    const success = await submitStep(2);
    if (success) {
      setCurrentStep(3);
    }
  };

  // Helper: Check if arrival airport is Jeddah or Madinah
  const isJeddahOrMadinahAirport = (): boolean => {
    if (!bookingState.step2Data.arrivalAirportId || !masterData.locationMasters) {
      return false;
    }
    const arrivalAirport = masterData.locationMasters.find(
      (lm) => lm.id === bookingState.step2Data.arrivalAirportId && lm.locationType === 'AIRPORT'
    );
    if (!arrivalAirport) return false;
    
    const cityName = arrivalAirport.cityMaster?.name || arrivalAirport.city || '';
    const normalizedCity = cityName.toLowerCase().trim();
    return normalizedCity === 'jeddah' || normalizedCity === 'madinah' || normalizedCity === 'madina' || normalizedCity === 'medina';
  };

  const prevStep = () => {
    if (bookingState.currentStep === 6) {
      if (!isJeddahOrMadinahAirport()) {
        setCurrentStep(3);
        return;
      }
      // Check if transport is selected
      const hasTransport = bookingState.step4Data.selectedTransport || 
                           (bookingState.step4Data.selectedTransports && bookingState.step4Data.selectedTransports.length > 0);
      if (!hasTransport) {
        setCurrentStep(3);
        return;
      }
    }
    setCurrentStep(Math.max(bookingState.currentStep - 1, 1));
  };

  const goToStep = (stepId: number) => {
    if ((stepId === 4 || stepId === 5) && !isJeddahOrMadinahAirport()) {
      if (stepId === 4 || stepId === 5) {
        setCurrentStep(6);
        return;
      }
    }
    if (stepId <= bookingState.currentStep || bookingState.completedSteps.includes(stepId)) {
      setCurrentStep(stepId);
    }
  };

  const renderStepContent = () => {
    switch (bookingState.currentStep) {
      case 1:
        return (
          <BookingModeStep
            data={bookingState.step1Data}
            onChange={updateStep1Data}
            disabled={isLoading}
          />
        );

      case 2:
        return (
          <TravelDetailsStep
            data={bookingState.step2Data}
            onChange={updateStep2Data}
            airports={masterData.airports}
            disabled={isLoading}
            allowOneWayOption={globalAllowOneWayTicket || selectedParty?.allowOneWayTicket}
            allowWithoutTicketOption={globalAllowWithoutTicket || selectedParty?.allowWithoutTicket}
          />
        );

      case 3:
        return (
          <AccommodationStep
            data={bookingState.step3Data}
            onChange={updateStep3Data}
            locations={masterData.locations}
            hotels={masterData.hotels}
            arrivalDate={bookingState.step2Data.arrivalDate}
            departureDate={bookingState.step2Data.departureDate}
            onLoadHotels={loadHotels}
            getHotelsForLocation={getHotelsForLocation}
            refreshHotels={refreshHotels}
            passengerCount={bookingState.step2Data.passengerCount}
            disabled={isLoading}
            isOneWay={!!bookingState.step2Data.isOneWay}
          />
        );

      case 4:
        return (
          <TransportVehicleSelectionStep
            data={bookingState.step4Data}
            step1Data={bookingState.step1Data}
            step2Data={bookingState.step2Data}
            step3Data={bookingState.step3Data}
            locationMasters={masterData.locationMasters}
            onChange={(data) => {
              updateStep4Data(data);
              // Clear movements if transport is removed
              const hasTransport = data.selectedTransport || 
                                   (data.selectedTransports && data.selectedTransports.length > 0);
              if (!hasTransport) {
                updateStep5Data({ movements: [] });
              }
            }}
            disabled={isLoading}
            currency={partyCurrency || undefined}
          />
        );

      case 5:
        return (
          <MovementDetailsStep
            data={bookingState.step5Data}
            step1Data={bookingState.step1Data}
            step2Data={bookingState.step2Data}
            step3Data={bookingState.step3Data}
            step4Data={bookingState.step4Data}
            locationMasters={masterData.locationMasters}
            arrivalAirportId={bookingState.step2Data.arrivalAirportId}
            departureAirportId={bookingState.step2Data.departureAirportId}
            arrivalDate={bookingState.step2Data.arrivalDate}
            departureDate={bookingState.step2Data.departureDate}
            arrivalTime={bookingState.step2Data.arrivalTime}
            departureTime={bookingState.step2Data.departureTime}
            onChange={updateStep5Data}
            disabled={isLoading}
          />
        );

      case 6:
        return (
          <DocumentsStep
            data={bookingState.step6Data || {}}
            step1Data={bookingState.step1Data}
            step3Data={bookingState.step3Data}
            step2Data={bookingState.step2Data}
            onChange={updateStep6Data}
            disabled={isLoading}
            passengerCount={bookingState.step2Data.passengerCount || bookingState.step1Data.passengerCount || 0}
          />
        );

      default:
        return null;
    }
  };

  if (!isClient) return <LoadingSpinner />;
  if (!user) return null;

  return (
    <PartyLayout 
      title="Re-Entry Booking" 
      subtitle="Complete your application steps below"
    >
      <DisclaimerDialog open={showDisclaimer} onConfirm={() => setShowDisclaimer(false)} />
      <OneWayDisclaimerDialog open={showOneWayDisclaimer} onConfirm={handleOneWayDisclaimerConfirm} onCancel={() => setShowOneWayDisclaimer(false)} />

      <div className="p-4 lg:p-6 max-w-[1400px] mx-auto pb-24">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-primary uppercase">New Re-Entry Booking</h2>
        </div>

        <StepProgress
          currentStep={bookingState.currentStep}
          completedSteps={bookingState.completedSteps}
          onStepClick={goToStep}
          steps={[...INDIVIDUAL_STEPS]}
        />

        <Card className="border border-secondary/10 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-secondary/10 flex items-center gap-3 bg-gray-50/50">
            <div className="h-7 w-7 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-bold text-xs">
              0{bookingState.currentStep}
            </div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
              {INDIVIDUAL_STEPS[bookingState.currentStep - 1].title}
            </h3>
          </div>

          <div className="p-6 flex-1">
            {renderStepContent()}

            {/* Step Navigation CTAs */}
            <div className="mt-8 pt-6 border-t border-secondary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {bookingState.currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={isLoading}
                    className="h-10 px-5 rounded-xl border-secondary/25 text-primary font-bold uppercase tracking-wider hover:bg-secondary/40 text-xs transition-all"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push('/party/bookings')}
                  disabled={isLoading}
                  className="h-10 px-5 rounded-xl text-muted-foreground font-bold uppercase tracking-wider hover:bg-destructive/5 hover:text-destructive text-xs transition-all"
                >
                  Cancel
                </Button>
              </div>

              <Button
                type="button"
                onClick={nextStep}
                disabled={isLoading}
                className="h-10 px-6 rounded-xl bg-primary text-white font-bold uppercase tracking-wider shadow-sm hover:bg-primary/95 active:scale-[0.98] text-xs transition-all flex items-center gap-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {bookingState.currentStep < 6 ? 'Next Step' : 'Submit Application'}
                    </span>
                    {bookingState.currentStep < 6 && <ChevronRight className="h-4 w-4" />}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PartyLayout>
  );
}
