'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getUser, hasRole, removeUser } from '@/lib/auth';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowLeft, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

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

export default function UmrahVisaNewPage() {
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
    
    if (!currentUser || !hasRole('party')) {
      router.push('/');
      return;
    }

    loadPartyData();
    loadInitialData();
  }, [router, loadPartyData, loadInitialData]);


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
        return validateStep6(bookingState.step6Data || { panCardZipFile: null }, bookingState.step1Data, bookingState.step3Data, false);
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

    const success = await submitStep(bookingState.currentStep);
    
    // Special handling for step 3: Skip steps 4 and 5 if arrival airport is not Jeddah/Madinah
    if (success && bookingState.currentStep === 3 && !isJeddahOrMadinahAirport()) {
      // Skip steps 4 and 5, go directly to step 6
      setCurrentStep(6);
      return;
    }
    
    if (success && bookingState.currentStep === 6) {
      router.push('/party/dashboard');
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
    // Special handling for step 6:
    // - If arrival airport is not Jeddah/Madinah, go to step 3
    // - If no transport is selected, go to step 3 (not step 5)
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
    // Prevent going to steps 4 or 5 if arrival airport is not Jeddah/Madinah
    if ((stepId === 4 || stepId === 5) && !isJeddahOrMadinahAirport()) {
      // If trying to go to step 4 or 5 but airport is not Jeddah/Madinah, go to step 6 instead
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
            data={bookingState.step6Data || { panCardZipFile: null }}
            step1Data={bookingState.step1Data}
            step3Data={bookingState.step3Data}
            onChange={updateStep6Data}
            disabled={isLoading}
          />
        );

      default:
        return null;
    }
  };

  if (!isClient) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return (
    <PartyLayout 
      title="Umrah Visa" 
      subtitle="Complete your application steps below"
    >
      <div className="p-4 lg:p-6 max-w-[1100px] mx-auto pb-24">
        <DisclaimerDialog 
          open={showDisclaimer} 
          onConfirm={() => setShowDisclaimer(false)} 
        />
        <div className="w-full">
          {/* Step Progress - Compact UI */}
          <StepProgress
            currentStep={bookingState.currentStep}
            completedSteps={bookingState.completedSteps}
            onStepClick={goToStep}
            steps={[...INDIVIDUAL_STEPS]}
          />

          {/* Step Content */}
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card className="border shadow-sm overflow-hidden rounded-xl bg-white">
              <div className="px-6 py-8">
                <div className="flex items-center gap-4 mb-6 border-b border-secondary/10 pb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                    <ArrowLeft className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-primary uppercase tracking-tight">
                      Step 0{bookingState.currentStep}: {INDIVIDUAL_STEPS[bookingState.currentStep - 1].title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {INDIVIDUAL_STEPS[bookingState.currentStep - 1].description}
                    </p>
                  </div>
                </div>
                
                <div className="min-h-[300px]">
                  {renderStepContent()}
                </div>

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
                      onClick={() => router.push('/party/dashboard')}
                      disabled={isLoading}
                      className="h-10 px-6 rounded-lg text-muted-foreground font-bold uppercase tracking-wider hover:bg-destructive/5 hover:text-destructive transition-all text-xs"
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-1.5 mr-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={cn(
                          "h-1 rounded-full transition-all duration-500",
                          i + 1 <= bookingState.currentStep ? "w-4 bg-primary shadow-sm" : "w-1.5 bg-secondary/20"
                        )} />
                      ))}
                    </div>
                    
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={isLoading}
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
                            {bookingState.currentStep < 6 ? 'Next' : 'Submit Application'}
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
        </div>
      </div>
    </PartyLayout>
  );
}