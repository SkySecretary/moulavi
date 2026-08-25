// Umrah Visa Booking Custom Hooks

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { partyAPI } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { API_ENDPOINTS } from '@/lib/umrah/constants';
import { BookingState, MasterData, Step1Data, Step2Data, Step3Data, Step4Data, Step5Data, Step6Data } from '@/lib/umrah/types';
import { fromDisplayDate, toDisplayDate, extractDateFromISO } from '@/lib/umrah/validation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const useUmrahBooking = () => {
  const [bookingState, setBookingState] = useState<BookingState>({
    currentStep: 1,
    completedSteps: [],
    bookingId: null,
    step1Data: { bookingMode: 'travel_details' },
    step2Data: {
      arrivalDate: '',
      arrivalTime: '',
      arrivalAirportId: '',
      arrivalFlightNumber: '',
      departureDate: '',
      departureTime: '',
      departureAirportId: '',
      departureFlightNumber: '',
    },
    step3Data: { accommodationType: 'hotel' },
    step4Data: {
      selectedTransport: undefined,
    },
    step5Data: {
      movements: [], // For individual bookings: movements (Step 5)
    },
    step6Data: {
      panCardZipFile: null, // For individual bookings: documents (Step 6)
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
  const [selectedParty, setSelectedParty] = useState<any | null>(null);
  const [globalAllowOneWayTicket, setGlobalAllowOneWayTicket] = useState<boolean>(false);
  const [globalAllowWithoutTicket, setGlobalAllowWithoutTicket] = useState<boolean>(false);

  useEffect(() => {
    const fetchNusukSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/nusuk/settings`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setGlobalAllowOneWayTicket(!!data.allowOneWayTicket);
          setGlobalAllowWithoutTicket(!!data.allowWithoutTicket);
        }
      } catch (error) {
        console.error('Error loading Nusuk settings:', error);
      }
    };
    fetchNusukSettings();
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

  const updateStep6Data = useCallback((data: Partial<Step6Data>) => {
    setBookingState(prev => ({
      ...prev,
      step6Data: { ...prev.step6Data, ...data }
    }));
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setBookingState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const loadPartyData = useCallback(async (providedPartyId?: string) => {
    try {
      let party;
      if (providedPartyId) {
        // Use provided partyId (for admin/staff)
        const response = await partyAPI.getById(providedPartyId);
        party = response.data.party;
        setPartyId(providedPartyId);
        setSelectedParty(party);
      } else {
        // Only attempt to get party from current user if they are a party user
        const user = getUser();
        
        if (user?.role === 'party') {
          const response = await partyAPI.getMyParty();
          party = response.data.party;
          
          if (party) {
            setPartyId(party.id);
            setSelectedParty(party);
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
      toast.error('Failed to load party information');
    }
  }, []);

  const submitStep = useCallback(async (stepNumber: number) => {
    if (!partyId) {
      toast.error('Party information not found');
      return false;
    }

    setIsLoading(true);
    try {
      // Steps 1-4: Only validate (no DB writes)
      if (stepNumber < 5) {
        const endpoint = `${API_URL}${API_ENDPOINTS[`STEP${stepNumber}` as keyof typeof API_ENDPOINTS]}`;
        let payload: any;
        
        switch (stepNumber) {
          case 1:
            payload = { partyId, ...bookingState.step1Data };
            break;
          case 2:
            payload = {
              ...bookingState.step2Data,
              arrivalDate: fromDisplayDate(bookingState.step2Data.arrivalDate),
              departureDate: fromDisplayDate(bookingState.step2Data.departureDate),
              hotelBookings: bookingState.step2Data.hotelBookings?.map(h => ({
                ...h,
                checkInDate: fromDisplayDate(h.checkInDate),
                checkOutDate: fromDisplayDate(h.checkOutDate),
              }))
            };
            break;
          case 3:
            payload = {
              ...bookingState.step3Data,
              iqamaDetails: bookingState.step3Data.iqamaDetails ? {
                ...bookingState.step3Data.iqamaDetails,
                iqamaDob: fromDisplayDate(bookingState.step3Data.iqamaDetails.iqamaDob || ''),
              } : undefined,
              hotelBookings: bookingState.step3Data.hotelBookings?.map(h => ({
                ...h,
                checkInDate: fromDisplayDate(h.checkInDate),
                checkOutDate: fromDisplayDate(h.checkOutDate),
              }))
            };
            break;
          case 4:
            payload = {
              selectedTransport: bookingState.step4Data.selectedTransport,
              selectedTransports: bookingState.step4Data.selectedTransports,
            };
            break;
        }

        if (stepNumber <= 4) {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json();
          
          if (response.ok) {
            // Special handling for step 3: Check if arrival airport is Jeddah or Madinah
            // If not, skip steps 4 and 5, go directly to step 6 (documents)
            let nextStep = stepNumber + 1;
            if (stepNumber === 3) {
              // Check if arrival airport is Jeddah or Madinah
              const arrivalAirportId = bookingState.step2Data.arrivalAirportId;
              const requiresTransport = arrivalAirportId && 
                (arrivalAirportId.toLowerCase().includes('jeddah') || 
                 arrivalAirportId.toLowerCase().includes('madinah') ||
                 arrivalAirportId.toLowerCase().includes('medina'));
              
              // For now, we'll check this in the page component where we have access to locationMasters
              // Here we'll just proceed normally, the page component will handle the skip logic
              nextStep = 4;
            } else if (stepNumber === 4) {
              // Special handling for step 4: Check if transport is selected
              // If no transport selected, skip to step 6 (documents)
              // If transport selected, go to step 5 (movements)
              const hasTransport = bookingState.step4Data.selectedTransport || 
                                   (bookingState.step4Data.selectedTransports && bookingState.step4Data.selectedTransports.length > 0);
              nextStep = hasTransport ? 5 : 6; // Skip to documents if no transport
            }
            
            setBookingState(prev => ({
              ...prev,
              completedSteps: [...prev.completedSteps, stepNumber],
              currentStep: nextStep
            }));
            
            toast.success(`Step ${stepNumber} validated successfully`);
            return true;
          } else {
            if (data.details && Array.isArray(data.details)) {
              data.details.forEach((err: any) => {
                toast.error(err.message || 'Validation error');
              });
            } else {
              toast.error(data.error || `Failed to validate step ${stepNumber}`);
            }
            return false;
          }
        }
      } 
      // Step 5: Validate movements (no DB writes)
      else if (stepNumber === 5) {
        // Step 5 is movements validation - just move to next step
        setBookingState(prev => ({
          ...prev,
          completedSteps: [...prev.completedSteps, 5],
          currentStep: 6
        }));
        
        toast.success('Step 5 validated successfully');
        return true;
      }
      // Step 6: Send ALL data to create-booking endpoint with ZIP file or multiple documents (FormData)
      else if (stepNumber === 6) {
        // Create FormData for file upload
        const formData = new FormData();
        
        // Add ZIP file if present (legacy)
        const zipFile = bookingState.step6Data?.panCardZipFile;
        if (zipFile) {
          formData.append('panCardZipFile', zipFile);
        }

        // Add multiple documents if present (legacy)
        const documents = (bookingState.step6Data as any)?.documents;
        if (documents && Array.isArray(documents)) {
          documents.forEach((file: File) => {
            formData.append('documents', file);
          });
        }

        // Add split documents to FormData (new feature)
        const docFields = [
          'passportCopies',
          'passengerPhotos',
          'panCardCopies',
          'iqamaCopies',
          'onwardTickets',
          'returnTickets',
          'nationalAddresses',
          'umrahVisaCopies',
          'nusukBookingCopies'
        ];
        docFields.forEach(field => {
          const files = (bookingState.step6Data as any)?.[field];
          if (files && Array.isArray(files)) {
            files.forEach((file: File) => {
              formData.append(field, file);
            });
          }
        });

        // Add passportNumbers metadata
        if (bookingState.step6Data?.passportNumbers) {
          formData.append('passportNumbers', JSON.stringify(bookingState.step6Data.passportNumbers));
        }

        // Add JSON data as string
        formData.append('partyId', partyId);
        formData.append('step1', JSON.stringify(bookingState.step1Data));
        if (bookingState.step1Data.visaType) {
          formData.append('visaType', bookingState.step1Data.visaType);
        }
        const visaNumber = bookingState.step6Data?.umrahVisaNumber || bookingState.step1Data?.umrahVisaNumber;
        if (visaNumber) {
          formData.append('umrahVisaNumber', visaNumber);
        }
        
        // Convert dates to ISO for backend
        const step2ISO = {
          ...bookingState.step2Data,
          arrivalDate: fromDisplayDate(bookingState.step2Data.arrivalDate),
          departureDate: fromDisplayDate(bookingState.step2Data.departureDate),
        };
        formData.append('step2', JSON.stringify(step2ISO));
        
        const step3ISO = {
          ...bookingState.step3Data,
          hotelBookings: bookingState.step3Data.hotelBookings?.map(hb => ({
            ...hb,
            checkInDate: fromDisplayDate(hb.checkInDate),
            checkOutDate: fromDisplayDate(hb.checkOutDate),
          })),
          iqamaDetails: bookingState.step3Data.iqamaDetails ? {
            ...bookingState.step3Data.iqamaDetails,
            iqamaDob: bookingState.step3Data.iqamaDetails.iqamaDob ? fromDisplayDate(bookingState.step3Data.iqamaDetails.iqamaDob) : undefined,
          } : undefined,
        };
        formData.append('step3', JSON.stringify(step3ISO));
        
        formData.append('step4', JSON.stringify({
          selectedTransport: bookingState.step4Data.selectedTransport,
          selectedTransports: bookingState.step4Data.selectedTransports,
        }));
        // Add movements from step5Data ONLY if transport is selected
        const hasTransport = bookingState.step4Data.selectedTransport || 
                             (bookingState.step4Data.selectedTransports && bookingState.step4Data.selectedTransports.length > 0);
        if (hasTransport && bookingState.step5Data.movements && bookingState.step5Data.movements.length > 0) {
          const movementsISO = bookingState.step5Data.movements.map(m => ({
            ...m,
            date: fromDisplayDate(m.date || ''),
          }));
          formData.append('step5', JSON.stringify({
            movements: movementsISO,
          }));
        }

        const response = await fetch(`${API_URL}/umrah-visa/create-booking`, {
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
            completedSteps: [...prev.completedSteps, 6],
          }));
          
          toast.success('Booking completed successfully!');
          return true;
        } else {
          if (data.details && Array.isArray(data.details)) {
            data.details.forEach((err: any) => {
              toast.error(err.message || 'Validation error');
            });
          } else {
            toast.error(data.error || 'Failed to create booking');
          }
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`Error submitting step ${stepNumber}:`, error);
      toast.error(`Failed to complete step ${stepNumber}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [partyId, bookingState]);

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
    updateStep6Data,
    setCurrentStep,
    loadPartyData,
    submitStep,
    selectedParty,
    globalAllowOneWayTicket,
    globalAllowWithoutTicket,
  };
};

export const useMasterData = () => {
  const [masterData, setMasterData] = useState<MasterData>({
    airports: [],
    locations: [],
    hotels: [],
    transportOptions: [],
    hotelsByLocation: {},
    locationMasters: [],
  });

  const loadAirports = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}${API_ENDPOINTS.AIRPORTS}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      
      // Handle new LocationMaster format: { locationMasters: [...] }
      // Transform to backward compatible format if needed
      const airports = data.locationMasters 
        ? data.locationMasters.map((loc: any) => ({
            id: loc.id,
            airportCode: loc.code,
            airportName: loc.name,
            city: loc.city,
            country: loc.country?.countryName || 'Saudi Arabia',
          }))
        : data; // Fallback to old format if array
      
      setMasterData(prev => ({ ...prev, airports }));
    } catch (error) {
      console.error('Error loading airports:', error);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    try {
      // Load cities instead of destinations
      const cityResponse = await fetch(`${API_URL}${API_ENDPOINTS.CITIES}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (cityResponse.ok) {
        const cityData = await cityResponse.json();
        // Convert CityMaster to Location format for compatibility
        const cities = cityData.cityMasters || cityData.data?.cityMasters || [];
        const convertedLocations = cities.map((city: any) => ({
          id: city.id,
          destinationCode: city.name.substring(0, 3).toUpperCase(),
          destinationName: city.name,
          city: city.name,
          cityId: city.id,
          country: city.country?.countryName || 'Saudi Arabia',
          isActive: city.isActive,
        }));
        setMasterData(prev => ({ ...prev, locations: convertedLocations }));
      } else {
        console.error('Failed to load cities');
        setMasterData(prev => ({ ...prev, locations: [] }));
      }
    } catch (error) {
      console.error('Error loading cities:', error);
      setMasterData(prev => ({ ...prev, locations: [] }));
    }
  }, []);

  const loadTransportOptions = useCallback(async (airportId: string) => {
    try {
      const response = await fetch(`${API_URL}${API_ENDPOINTS.TRANSPORT_OPTIONS}/${airportId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      setMasterData(prev => ({ ...prev, transportOptions: data.transportOptions || [] }));
      return data.requiresTransport;
    } catch (error) {
      console.error('Error loading transport options:', error);
      return false;
    }
  }, []);

  const loadHotels = useCallback(async (cityId: string) => {
    try {
      // cityId is now the city's ID (was locationId for destinations)
      if (masterData.hotelsByLocation[cityId]) {
        setMasterData(prev => ({ ...prev, hotels: masterData.hotelsByLocation[cityId] }));
        return;
      }

      // Fetch hotels by cityId
      const response = await fetch(`${API_URL}${API_ENDPOINTS.HOTELS}/${cityId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      
      // Transform LocationMaster hotels to Hotel format
      const hotels = (Array.isArray(data) ? data : []).map((hotel: any) => ({
        id: hotel.id,
        name: hotel.name,
        hotelName: hotel.name, // For backward compatibility
        code: hotel.code,
        cityId: hotel.cityId,
        city: hotel.cityMaster || (hotel.city && typeof hotel.city === 'string' ? { id: hotel.cityId, name: hotel.city } : hotel.city),
      }));
      
      setMasterData(prev => ({
        ...prev,
        hotelsByLocation: { ...prev.hotelsByLocation, [cityId]: hotels },
        hotels: hotels
      }));
    } catch (error) {
      console.error('Error loading hotels:', error);
    }
  }, [masterData.hotelsByLocation]);

  const getHotelsForLocation = useCallback((cityId: string) => {
    // Filter hotels by cityId from LocationMaster's cityId field
    // Transform LocationMaster to Hotel format
    if (!cityId) return [];
    const hotelLocationMasters = masterData.locationMasters?.filter((lm: any) => 
      lm.locationType === 'HOTEL' && lm.cityId === cityId
    ) || [];
    
    // Transform LocationMaster to Hotel format
    return hotelLocationMasters.map((lm: any) => ({
      id: lm.id,
      name: lm.name,
      hotelName: lm.name, // For backward compatibility
      code: lm.code,
      cityId: lm.cityId,
      city: lm.cityMaster || (lm.city ? { id: lm.cityId, name: lm.city } : undefined),
    }));
  }, [masterData.locationMasters]);

  const loadAllLocationMasters = useCallback(async () => {
    try {
      // Load all LocationMaster entries (all types: AIRPORT, DESTINATION, ZIYARAT, HOTEL, OTHERS)
      const response = await fetch(`${API_URL}/location-masters/active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      
      const locationMasters = data.locationMasters || [];
      setMasterData(prev => ({ ...prev, locationMasters }));
    } catch (error) {
      console.error('Error loading location masters:', error);
      setMasterData(prev => ({ ...prev, locationMasters: [] }));
    }
  }, []);

  const loadUmrahVisaMaster = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/umrah-visa/masters/dates`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      
      const umrahVisaMaster = data.umrahVisaMaster || null;
      setMasterData(prev => ({ ...prev, umrahVisaMaster }));
    } catch (error) {
      console.error('Error loading Umrah visa master dates:', error);
      setMasterData(prev => ({ ...prev, umrahVisaMaster: undefined }));
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    await Promise.all([
      loadAirports(),
      loadLocations(),
      loadAllLocationMasters(),
      loadUmrahVisaMaster(),
    ]);
  }, [loadAirports, loadLocations, loadAllLocationMasters, loadUmrahVisaMaster]);

  return {
    masterData,
    loadInitialData,
    loadAirports,
    loadLocations,
    loadTransportOptions,
    loadHotels,
    getHotelsForLocation,
    loadAllLocationMasters,
    refreshHotels: loadAllLocationMasters,
    loadUmrahVisaMaster,
  };
};
