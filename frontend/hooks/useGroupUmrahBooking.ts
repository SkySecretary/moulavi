import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { partyAPI } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/umrah/constants';
import { BookingState, MasterData, Step1Data, Step2Data, Step3Data, Step4Data, Step5Data } from '@/lib/umrah/types';
import { fromDisplayDate } from '@/lib/umrah/validation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const useGroupUmrahBooking = () => {
  const [bookingState, setBookingState] = useState<BookingState>({
    currentStep: 1,
    completedSteps: [],
    bookingId: null,
    step1Data: {
      bookingMode: 'group_number',
      groupNumber: '',
      groupName: '',
      umrahVisaProviderId: undefined,
    },
    step2Data: {
      arrivalDate: '',
      arrivalTime: '',
      arrivalAirportId: '',
      arrivalFlightNumber: '',
      departureDate: '',
      departureTime: '',
      departureAirportId: '',
      departureFlightNumber: '',
      passengerCount: undefined, // Moved from step1Data to match individual bookings
      hotelBookings: [], // Moved from step3Data for group bookings
    },
    step3Data: {
      // Step 3 is now transport vehicle selection
      selectedTransport: undefined,
      selectedTransports: undefined,
    },
    step4Data: {
      // Step 4 is now movement details
      movements: [], // NEW: Unified movements array
    },
    step5Data: {
      passengers: [{
        fullName: '',
        isLeadPassenger: true,
        panCardPhoto: null,
        passportFront: null,
        passportBack: null,
        iqamaPhoto: null,
        hotelBooking: null,
        ticketCopy: null,
      }],
      panCardZipFile: null, // ZIP file for group bookings
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyCurrency, setPartyCurrency] = useState<{
    id: string;
    currencyCode: string;
    symbol: string;
    exchangeRate: number;
  } | null>(null);
  const [stepDataHashes, setStepDataHashes] = useState<{[key: number]: string}>({});

  // Generate hash for step data to detect changes
  const generateStepDataHash = useCallback((stepNumber: number): string => {
    let dataToHash = '';
    switch (stepNumber) {
      case 1:
        dataToHash = JSON.stringify(bookingState.step1Data);
        break;
      case 2:
        dataToHash = JSON.stringify(bookingState.step2Data);
        break;
      case 3:
        dataToHash = JSON.stringify(bookingState.step3Data);
        break;
      case 4:
        dataToHash = JSON.stringify(bookingState.step4Data);
        break;
      case 5:
        dataToHash = JSON.stringify(bookingState.step5Data);
        break;
    }
    return btoa(dataToHash).slice(0, 16);
  }, [bookingState]);

  // Check if step data has changed since last submission
  const hasStepDataChanged = useCallback((stepNumber: number): boolean => {
    const currentHash = generateStepDataHash(stepNumber);
    const lastHash = stepDataHashes[stepNumber];
    return currentHash !== lastHash;
  }, [generateStepDataHash, stepDataHashes]);

  const loadPartyData = useCallback(async (providedPartyId?: string) => {
    try {
      let party;
      if (providedPartyId) {
        // Use provided partyId (for admin/staff)
        const response = await partyAPI.getById(providedPartyId);
        party = response.data.party;
        setPartyId(providedPartyId);
      } else {
        // Only attempt to get party from current user if they are a party user
        const { getUser } = await import('@/lib/auth');
        const user = getUser();
        
        if (user?.role === 'party') {
          const response = await partyAPI.getMyParty();
          party = response.data.party;
          
          if (party) {
            setPartyId(party.id);
          } else {
            toast.error('Party information not found');
          }
        }
      }

      if (party && party.accountCurrency) {
        setPartyCurrency({
          id: party.accountCurrency.id,
          currencyCode: party.accountCurrency.currencyCode,
          symbol: party.accountCurrency.symbol,
          exchangeRate: party.accountCurrency.exchangeRate,
        });
      }
    } catch (error: any) {
      console.error('Error loading party data:', error);
      toast.error('Failed to load party data');
    }
  }, []);

  const updateStep1Data = useCallback((data: Partial<Step1Data>) => {
    setBookingState(prev => ({
      ...prev,
      step1Data: { ...prev.step1Data, ...data }
    }));
  }, []);

  const updateStep2Data = useCallback((data: Partial<Step2Data>) => {
    setBookingState(prev => ({
      ...prev,
      step2Data: { ...prev.step2Data, ...data }
    }));
  }, []);

  const updateStep3Data = useCallback((data: Partial<Step3Data>) => {
    setBookingState(prev => ({
      ...prev,
      step3Data: { ...prev.step3Data, ...data }
    }));
  }, []);

  const updateStep4Data = useCallback((data: Partial<Step4Data>) => {
    setBookingState(prev => ({
      ...prev,
      step4Data: { ...prev.step4Data, ...data }
    }));
  }, []);

  const updateStep5Data = useCallback((data: Partial<Step5Data>) => {
    setBookingState(prev => ({
      ...prev,
      step5Data: { ...prev.step5Data, ...data }
    }));
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setBookingState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const submitStep1 = async () => {
    if (!partyId) return false;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/umrah-visa/group/step1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          partyId,
          ...bookingState.step1Data,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setBookingState(prev => ({
          ...prev,
          completedSteps: [...prev.completedSteps, 1],
          currentStep: 2,
        }));
        setStepDataHashes(prev => ({ ...prev, 1: generateStepDataHash(1) }));
        toast.success('Step 1 validated successfully');
        return true;
      } else {
        toast.error(data.error || 'Failed to validate step 1');
        return false;
      }
    } catch (error) {
      console.error('Error validating step 1:', error);
      toast.error('Failed to validate step 1');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep2 = async () => {
    setIsLoading(true);
    try {
      // Convert dates to ISO for backend
      const step2ISO = {
        ...bookingState.step2Data,
        arrivalDate: fromDisplayDate(bookingState.step2Data.arrivalDate),
        departureDate: fromDisplayDate(bookingState.step2Data.departureDate),
        hotelBookings: bookingState.step2Data.hotelBookings?.map(hb => ({
          ...hb,
          checkInDate: fromDisplayDate(hb.checkInDate),
          checkOutDate: fromDisplayDate(hb.checkOutDate),
        })),
      };

      const response = await fetch(`${API_URL}/umrah-visa/group/step2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(step2ISO),
      });

      const data = await response.json();
      
      if (response.ok) {
        setBookingState(prev => ({
          ...prev,
          completedSteps: [...prev.completedSteps, 2],
          currentStep: 3,
        }));
        setStepDataHashes(prev => ({ ...prev, 2: generateStepDataHash(2) }));
        toast.success('Step 2 validated successfully');
        return true;
      } else {
        toast.error(data.error || 'Failed to validate step 2');
        return false;
      }
    } catch (error) {
      console.error('Error validating step 2:', error);
      toast.error('Failed to validate step 2');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep3 = async () => {
    // Step 3: Transport Vehicle Selection - just validate and move to next step
    setIsLoading(true);
    try {
      // Validate that at least one transport has quantity > 0
      const hasTransports = !!(
        bookingState.step3Data.selectedTransports && 
        bookingState.step3Data.selectedTransports.length > 0 &&
        bookingState.step3Data.selectedTransports.some(st => st.quantity > 0)
      ) || !!bookingState.step3Data.selectedTransport;
      
      if (!hasTransports) {
        toast.error('Please select at least one transport vehicle');
        return false;
      }

        setBookingState(prev => ({
          ...prev,
          completedSteps: [...prev.completedSteps, 3],
          currentStep: 4,
        }));
        setStepDataHashes(prev => ({ ...prev, 3: generateStepDataHash(3) }));
      toast.success('Transport vehicle selected');
        return true;
    } catch (error) {
      console.error('Error validating step 3:', error);
      toast.error('Failed to validate transport selection');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep4 = async () => {
    // Step 4: Movement Details - just validate and move to next step
    setIsLoading(true);
    try {
      // Movements are validated in the validation function
      // Just move to next step if valid
      setBookingState(prev => ({
        ...prev,
        completedSteps: [...prev.completedSteps, 4],
        currentStep: 5,
      }));
      setStepDataHashes(prev => ({ ...prev, 4: generateStepDataHash(4) }));
      toast.success('Step 4 validated successfully');
      return true;
    } catch (error) {
      console.error('Error validating step 4:', error);
      toast.error('Failed to validate step 4');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep5 = async () => {
    if (!partyId) return false;

    setIsLoading(true);
    try {
      // Convert dates to ISO for backend
      const step2ISO = {
        ...bookingState.step2Data,
        arrivalDate: fromDisplayDate(bookingState.step2Data.arrivalDate),
        departureDate: fromDisplayDate(bookingState.step2Data.departureDate),
        hotelBookings: bookingState.step2Data.hotelBookings?.map(hb => ({
          ...hb,
          checkInDate: fromDisplayDate(hb.checkInDate),
          checkOutDate: fromDisplayDate(hb.checkOutDate),
        })),
      };

      // Step 3 is transport selection, Step 4 is movements
      // Backend expects: step3 = movements, step4 = transport
      // So we need to swap them for backend compatibility
      const step3PayloadForBackend = {
        // Movements from step4Data (convert dates to ISO)
        movements: (bookingState.step4Data.movements || []).map(m => ({
          ...m,
          date: fromDisplayDate(m.date || ''),
        })),
        hotelBookings: step2ISO.hotelBookings || [],
      };
      
      const step4PayloadForBackend = {
        // Transport selections from step3Data
        selectedTransport: bookingState.step3Data.selectedTransport,
        selectedTransports: bookingState.step3Data.selectedTransports,
      };

      // Create FormData for file upload
      const formData = new FormData();
      
      // Add ZIP file if present (legacy)
      const zipFile = bookingState.step5Data.panCardZipFile;
      if (zipFile) {
        formData.append('panCardZipFile', zipFile);
      }

      // Add multiple documents if present (new feature)
      const documents = (bookingState.step5Data as any)?.documents;
      if (documents && Array.isArray(documents)) {
        documents.forEach((file: File) => {
          formData.append('documents', file);
        });
      }

      // Add JSON data as string
      formData.append('partyId', partyId);
      formData.append('step1', JSON.stringify(bookingState.step1Data));
      formData.append('step2', JSON.stringify(step2ISO));
      formData.append('step3', JSON.stringify(step3PayloadForBackend));
      formData.append('step4', JSON.stringify(step4PayloadForBackend));

      const response = await fetch(`${API_URL}/umrah-visa/group/create-booking`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        setBookingState(prev => ({
          ...prev,
          bookingId: data.data.bookingId,
          completedSteps: [...prev.completedSteps, 5],
        }));
        toast.success('Group Umrah visa booking completed successfully!');
        return true;
      } else {
        toast.error(data.error || 'Failed to create booking');
        return false;
      }
    } catch (error) {
      console.error('Error creating group booking:', error);
      toast.error('Failed to create booking');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep = async (stepNumber: number) => {
    const shouldSubmit = !bookingState.completedSteps.includes(stepNumber) || hasStepDataChanged(stepNumber);
    
    if (shouldSubmit) {
      switch (stepNumber) {
        case 1:
          return await submitStep1();
        case 2:
          return await submitStep2();
        case 3:
          return await submitStep3();
        case 4:
          return await submitStep4();
        case 5:
          return await submitStep5();
        default:
          return false;
      }
    } else {
      // Step already completed and data hasn't changed, just move to next step
      setCurrentStep(Math.min(stepNumber + 1, 5));
      return true;
    }
  };

  const addPassenger = useCallback(() => {
    setBookingState(prev => ({
      ...prev,
      step5Data: {
        ...prev.step5Data,
        passengers: [...(prev.step5Data.passengers ?? []), {
          fullName: '',
          isLeadPassenger: false,
          panCardPhoto: null,
          passportFront: null,
          passportBack: null,
          iqamaPhoto: null,
          hotelBooking: null,
          ticketCopy: null,
        }]
      }
    }));
  }, []);

  const removePassenger = useCallback((index: number) => {
    setBookingState(prev => {
      const passengers = prev.step5Data.passengers ?? [];
      if (passengers.length <= 1) return prev;
      
      return {
        ...prev,
        step5Data: {
          ...prev.step5Data,
          passengers: passengers.filter((_, i) => i !== index)
        }
      };
    });
  }, []);

  const addHotelBooking = useCallback(() => {
    // Add hotel booking to step2Data for group bookings
    setBookingState(prev => {
      const existingBookings = prev.step2Data.hotelBookings || [];
      let checkInDate = '';
      
      if (existingBookings.length === 0) {
        checkInDate = prev.step2Data.arrivalDate;
      } else {
        const lastBooking = existingBookings[existingBookings.length - 1];
        checkInDate = lastBooking.checkOutDate || '';
      }
      
      return {
        ...prev,
        step2Data: {
          ...prev.step2Data,
          hotelBookings: [
            ...existingBookings,
            {
              cityId: '',
              hotelId: '',
              checkInDate,
              checkOutDate: '',
            },
          ],
        },
      };
    });
  }, []);

  const removeHotelBooking = useCallback((index: number) => {
    setBookingState(prev => {
      const updatedBookings = prev.step2Data.hotelBookings?.filter((_, i) => i !== index) || [];
      
      // Update check-in date of subsequent hotels
      if (updatedBookings[index] && index > 0) {
        const previousHotel = updatedBookings[index - 1];
        if (previousHotel.checkOutDate) {
          updatedBookings[index].checkInDate = previousHotel.checkOutDate;
        }
      } else if (updatedBookings[index] && index === 0) {
        updatedBookings[index].checkInDate = prev.step2Data.arrivalDate;
      }
      
      return {
        ...prev,
        step2Data: {
          ...prev.step2Data,
          hotelBookings: updatedBookings,
        },
      };
    });
  }, []);

  return {
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
  };
};
