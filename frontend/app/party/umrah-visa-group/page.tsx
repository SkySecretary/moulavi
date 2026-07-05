'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getUser, hasRole, removeUser } from '@/lib/auth';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowLeft, ChevronRight, ChevronLeft, Plane, Users, Home, User, Truck, Loader2 } from 'lucide-react';

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
import { umrahVisaAPI } from '@/lib/api';
import { DisclaimerDialog } from '@/components/umrah-booking/shared/DisclaimerDialog';
import { OneWayDisclaimerDialog } from '@/components/umrah-booking/shared/OneWayDisclaimerDialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export default function GroupUmrahVisaPage() {
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
    setCurrentStep,
    loadPartyData,
    submitStep,
    addPassenger,
    removePassenger,
    addHotelBooking,
    removeHotelBooking,
    hasStepDataChanged,
    selectedParty,
    globalAllowOneWayTicket,
  } = useGroupUmrahBooking();

  const [showOneWayDisclaimer, setShowOneWayDisclaimer] = useState(false);
  const [oneWayDisclaimerAccepted, setOneWayDisclaimerAccepted] = useState(false);

  const {
    masterData,
    loadInitialData,
    loadHotels,
    getHotelsForLocation,
  } = useMasterData();

  const steps = [
    {
      id: 1,
      title: 'Group Details',
      description: 'Group number and name',
      icon: 'Users',
    },
    {
      id: 2,
      title: 'Travel & Hotel Details',
      description: 'Flight and hotel information',
      icon: 'Plane',
    },
    {
      id: 3,
      title: 'Transport Vehicle Selection',
      description: 'Select transport vehicle for your route',
      icon: 'Truck',
    },
    {
      id: 4,
      title: 'Movement Details',
      description: 'Transportation and movement',
      icon: 'Home',
    },
    {
      id: 5,
      title: 'PAN Cards Upload',
      description: 'Upload ZIP file with PAN cards',
      icon: 'User',
    },
  ];

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


  const validateCurrentStep = async (): Promise<string | null> => {
    switch (bookingState.currentStep) {
      case 1:
        return validateStep1(bookingState.step1Data);
      case 2:
        return validateStep2(bookingState.step2Data, masterData.airports, bookingState.step1Data, masterData.umrahVisaMaster);
      case 3:
        return validateStep3(bookingState.step3Data, bookingState.step2Data.arrivalDate, bookingState.step2Data.departureDate, bookingState.step2Data, masterData.locationMasters);
      case 4:
        // Fetch ziyarath counts for validation
        const ziyarathMovements = bookingState.step4Data.movements?.filter(m => m.type === 'ziyarath' && m.date) || [];
        const ziyarathDates = ziyarathMovements.map(m => m.date!).filter((date, index, self) => self.indexOf(date) === index);
        
        let ziyarathCounts: { [date: string]: number } = {};
        if (ziyarathDates.length > 0) {
          try {
            const response = await umrahVisaAPI.getZiyarathCounts(
              ziyarathDates,
              bookingState.bookingId || undefined
            );
            ziyarathCounts = response.data || {};
          } catch (error) {
            console.error('Error fetching ziyarath counts for validation:', error);
            // Continue with validation even if counts fetch fails
          }
        }
        return validateStep4(
          bookingState.step4Data,
          bookingState.step2Data.arrivalDate,
          bookingState.step2Data.departureDate,
          ziyarathCounts,
          undefined,
          masterData.locationMasters
        );
      case 5:
        return validateStep5(bookingState.step5Data, bookingState.step1Data, bookingState.step3Data, true); // true = isGroupVisa
      default:
        return null;
    }
  };

  const nextStep = async () => {
    const validationError = await validateCurrentStep();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (bookingState.currentStep === 2 && bookingState.step2Data.isOneWay && !oneWayDisclaimerAccepted) {
      setShowOneWayDisclaimer(true);
      return;
    }

    const success = await submitStep(bookingState.currentStep);
    if (success && bookingState.currentStep === 5) {
      router.push('/party/dashboard');
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

  const prevStep = () => {
    setCurrentStep(Math.max(bookingState.currentStep - 1, 1));
  };

  const goToStep = (stepId: number) => {
    if (stepId <= bookingState.currentStep || bookingState.completedSteps.includes(stepId)) {
      setCurrentStep(stepId);
    }
  };

  const renderStepContent = () => {
    switch (bookingState.currentStep) {
      case 1:
        return (
          <GroupDetailsStep
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
            isGroupBooking={true}
            locations={masterData.locations}
            hotels={masterData.hotels}
            arrivalDate={bookingState.step2Data.arrivalDate}
            departureDate={bookingState.step2Data.departureDate}
            onLoadHotels={loadHotels}
            getHotelsForLocation={getHotelsForLocation}
            onAddHotelBooking={addHotelBooking}
            onRemoveHotelBooking={removeHotelBooking}
            allowOneWayOption={globalAllowOneWayTicket || selectedParty?.allowOneWayTicket}
          />
        );

      case 3:
        return (
          <TransportVehicleSelectionStep
            data={bookingState.step3Data}
            step1Data={bookingState.step1Data}
            step2Data={bookingState.step2Data}
            locationMasters={masterData.locationMasters}
            onChange={updateStep3Data}
            disabled={isLoading}
            currency={partyCurrency || undefined}
          />
        );

      case 4:
        // Find arrival airport in locationMasters to get cityId
        const arrivalAirport = masterData.locationMasters?.find(
          (lm) => lm.id === bookingState.step2Data.arrivalAirportId && lm.locationType === 'AIRPORT'
        );
        
        return (
          <MovementDetailsStep
            data={bookingState.step4Data}
            onChange={updateStep4Data}
            locations={masterData.locations}
            locationMasters={masterData.locationMasters}
            hotelBookings={bookingState.step2Data.hotelBookings || []}
            arrivalAirportId={bookingState.step2Data.arrivalAirportId}
            departureAirportId={bookingState.step2Data.departureAirportId}
            arrivalDate={bookingState.step2Data.arrivalDate}
            departureDate={bookingState.step2Data.departureDate}
            arrivalTime={bookingState.step2Data.arrivalTime}
            departureTime={bookingState.step2Data.departureTime}
            arrivalAirport={arrivalAirport}
            getAllHotelsForLocation={getHotelsForLocation}
            step3Data={bookingState.step3Data}
            disabled={isLoading}
            bookingId={bookingState.bookingId}
          />
        );

      case 5:
        return (
          <GroupDocumentsStep
            data={bookingState.step5Data}
            step1Data={bookingState.step1Data}
            step3Data={bookingState.step3Data}
            onChange={updateStep5Data}
            onStep1DataChange={updateStep1Data}
            onAddPassenger={addPassenger}
            onRemovePassenger={removePassenger}
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
      title="Group Umrah Visa" 
      subtitle="Complete your group application steps below"
      >
      <div className="p-4 lg:p-6 max-w-[1400px] mx-auto pb-24">
        <DisclaimerDialog 
          open={showDisclaimer} 
          onConfirm={() => setShowDisclaimer(false)} 
        />
        <OneWayDisclaimerDialog
          open={showOneWayDisclaimer}
          onConfirm={handleOneWayDisclaimerConfirm}
          onCancel={() => setShowOneWayDisclaimer(false)}
        />
        <div className="w-full">
          {/* Step Progress - Compact UI */}
          <StepProgress
            currentStep={bookingState.currentStep}
            completedSteps={bookingState.completedSteps}
            onStepClick={goToStep}
            steps={steps}
          />

          {/* Step Content */}
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card className="border shadow-sm overflow-hidden rounded-xl bg-white">
              <div className="px-6 py-8">
                <div className="flex items-center gap-4 mb-6 border-b border-secondary/10 pb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                    {(() => {
                      const map:any = { Users, Plane, Home, Truck, User };
                      const Icon = map[steps[bookingState.currentStep - 1].icon];
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-primary uppercase tracking-tight">
                      Step 0{bookingState.currentStep}: {steps[bookingState.currentStep - 1].title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">{steps[bookingState.currentStep - 1].description}</p>
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
                    <div className="hidden sm:flex flex-col items-end mr-2 pr-4 border-r border-white/10">
                       <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={cn(
                              "h-1 rounded-full transition-all duration-500",
                              i + 1 <= bookingState.currentStep ? "w-4 bg-primary shadow-sm" : "w-1.5 bg-secondary/20"
                            )} />
                          ))}
                       </div>
                       {bookingState.currentStep < 5 && bookingState.completedSteps.includes(bookingState.currentStep) && hasStepDataChanged(bookingState.currentStep) && (
                         <span className="text-[7px] font-bold text-orange-400 uppercase tracking-widest mt-0.5 animate-pulse italic">Unsaved Changes</span>
                       )}
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
                            {bookingState.currentStep < 5 ? 'Next' : 'Submit Application'}
                          </span>
                          {bookingState.currentStep < 5 && <ChevronRight className="h-4 w-4 ml-1" />}
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