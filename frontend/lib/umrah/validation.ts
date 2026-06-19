// Umrah Visa Booking Validation Utilities

import { BOOKING_LIMITS, FLIGHT_NUMBER_REGEX } from './constants';
import { Step1Data, Step2Data, Step3Data, Step4Data, Step5Data, Step6Data, Passenger, UmrahVisaMaster } from './types';

export const formatFlightNumber = (value: string): string => {
  // Remove all invalid characters and convert to uppercase
  let cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  // Airline codes are typically 2 or 3 characters. 
  // We'll auto-format if it looks like a standard flight number without a dash.
  if (cleaned.length > 2 && !value.includes('-')) {
    // If it starts with 2 letters/numbers and then more numbers, it's likely a 2-char code
    return `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`;
  }
  
  // If it already has a dash or is short, just return cleaned alphanumeric
  return value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
};

// Strict dd/mm/yy or dd/mm/yyyy validation regex
export const DATE_FORMAT_REGEX = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/;

/**
 * Validates a date string specifically in DD/MM/YY or YYYY-MM-DD format
 */
export const isValidStrictDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  return DATE_FORMAT_REGEX.test(dateStr) || /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
};

/**
 * Converts YYYY-MM-DD to DD/MM/YYYY
 */
export const toDisplayDate = (isoDate: string): string => {
  if (!isoDate) return '';
  // Check if it's already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoDate)) return isoDate;
  // If it's in DD/MM/YY format, we should probably keep it but it's better to convert to YYYY
  if (DATE_FORMAT_REGEX.test(isoDate)) {
    const parts = isoDate.split('/');
    if (parts.length === 3 && parts[2].length === 2) {
      const year = parseInt(parts[2], 10);
      const fullYear = year > 50 ? `19${parts[2]}` : `20${parts[2]}`;
      return `${parts[0]}/${parts[1]}/${fullYear}`;
    }
    return isoDate;
  }
  
  // Extract just the date part if it's a full ISO string
  const datePart = isoDate.split('T')[0];
  const parts = datePart.split('-');
  
  if (parts.length === 3) {
    // Check if it's YYYY-MM-DD or DD-MM-YYYY
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const [year, month, day] = parts;
      const d = day.padStart(2, '0');
      const m = month.padStart(2, '0');
      const y = year;
      return `${d}/${m}/${y}`;
    } else {
      // Assume DD-MM-YYYY
      const [day, month, year] = parts;
      const d = day.padStart(2, '0');
      const m = month.padStart(2, '0');
      const y = year.length === 2 ? (parseInt(year) > 50 ? `19${year}` : `20${year}`) : year;
      return `${d}/${m}/${y}`;
    }
  }

  // Fallback for other formats
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const y = String(date.getUTCFullYear());
  return `${d}/${m}/${y}`;
};

/**
 * Converts DD/MM/YY or DD/MM/YYYY to YYYY-MM-DD
 */
export const fromDisplayDate = (displayDate: string): string => {
  if (!displayDate) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(displayDate)) return displayDate.split('T')[0]; // Already in ISO format
  
  // Handle both / and - separators
  const parts = displayDate.includes('/') ? displayDate.split('/') : displayDate.split('-');
  if (parts.length !== 3) return displayDate;
  
  const [day, month, year] = parts;
  if (!day || !month || !year) return displayDate;

  // Pivot at 50 for 2-digit years
  let fullYear = year;
  if (year.length === 2) {
    fullYear = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
  }
  
  const fullMonth = month.padStart(2, '0');
  const fullDay = day.padStart(2, '0');
  
  return `${fullYear}-${fullMonth}-${fullDay}`;
};

/**
 * Safely extracts HH:mm from an ISO date string without timezone conversion
 */
export const extractTimeFromISO = (isoString: string | Date | null | undefined): string => {
  if (!isoString) return '';
  let str: string;
  if (isoString instanceof Date) {
    if (isNaN(isoString.getTime())) return '';
    str = isoString.toISOString();
  } else {
    str = isoString;
  }
  // Expecting YYYY-MM-DDTHH:mm:ss.sssZ or similar
  const timePart = str.split('T')[1];
  if (!timePart) return '';
  return timePart.substring(0, 5); // HH:mm
};

/**
 * Safely extracts YYYY-MM-DD from an ISO date string without timezone conversion
 */
export const extractDateFromISO = (isoString: string | Date | null | undefined): string => {
  if (!isoString) return '';
  let str: string;
  if (isoString instanceof Date) {
    if (isNaN(isoString.getTime())) return '';
    str = isoString.toISOString();
  } else {
    str = isoString;
  }
  return str.split('T')[0];
};

/**
 * Combines date and time into an ISO string without local timezone shifts
 */
export const combineDateAndTime = (dateStr: string, timeStr: string): string => {
  if (!dateStr) return '';
  // Ensure date is in YYYY-MM-DD
  const isoDate = fromDisplayDate(dateStr);
  const isoTime = timeStr || '00:00';
  return `${isoDate}T${isoTime}:00.000Z`;
};

export const calculateDuration = (arrival: string, departure: string) => {
  if (!arrival || !departure) return { days: 0, error: '' };

  const arrivalDate = new Date(fromDisplayDate(arrival));
  const departureDate = new Date(fromDisplayDate(departure));
  
  if (isNaN(arrivalDate.getTime()) || isNaN(departureDate.getTime())) {
    return { days: 0, error: '' };
  }

  if (departureDate <= arrivalDate) {
    return { days: 0, error: 'Departure date must be after arrival date' };
  }
  
  const diffTime = departureDate.getTime() - arrivalDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > BOOKING_LIMITS.MAX_TRAVEL_DAYS) {
    return { 
      days: diffDays, 
      error: `Travel duration (${diffDays} days) exceeds the maximum limit of ${BOOKING_LIMITS.MAX_TRAVEL_DAYS} days` 
    };
  }
  
  return { days: diffDays, error: '' };
};

export const calculateHotelCoverage = (arrivalDate: string, departureDate: string, hotelBookings: any[]) => {
  if (!arrivalDate || !departureDate || !hotelBookings || hotelBookings.length === 0) {
    return { totalCovered: 0, uncoveredDates: [], remainingDays: 0, totalBookedDays: 0 };
  }

  const arrival = new Date(fromDisplayDate(arrivalDate));
  const departure = new Date(fromDisplayDate(departureDate));
  
  if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) {
    return { totalCovered: 0, uncoveredDates: [], remainingDays: 0, totalBookedDays: 0 };
  }

  const allDates: string[] = [];
  
  const currentDate = new Date(arrival);
  while (currentDate < departure) {
    if (!isNaN(currentDate.getTime())) {
      allDates.push(currentDate.toISOString().split('T')[0]);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const coveredDates = new Set<string>();
  let totalBookedDays = 0; // Total days booked across all hotels (may exceed trip duration)
  
  hotelBookings.forEach(booking => {
    if (booking.checkInDate && booking.checkOutDate) {
      const checkIn = new Date(fromDisplayDate(booking.checkInDate));
      const checkOut = new Date(fromDisplayDate(booking.checkOutDate));
      
      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return;

      const current = new Date(checkIn);
      
      // Calculate total booked days for this hotel
      let hotelDays = 0;
      while (current < checkOut) {
        if (!isNaN(current.getTime())) {
          const dateStr = current.toISOString().split('T')[0];
          coveredDates.add(dateStr);
        }
        hotelDays++;
        current.setDate(current.getDate() + 1);
      }
      totalBookedDays += hotelDays;
    }
  });

  const uncoveredDates = allDates.filter(date => !coveredDates.has(date));
  
  return {
    totalCovered: coveredDates.size,
    uncoveredDates,
    remainingDays: uncoveredDates.length,
    totalBookedDays, // Total days booked (may exceed trip duration)
  };
};

export const validateStep1 = (data: Step1Data): string | null => {
  if (data.bookingMode === 'group_number') {
    if (!data.groupNumber?.trim()) {
      return 'Group number is required for group booking mode';
    }
    if (!data.groupName?.trim()) {
      return 'Group name is required for group booking mode';
    }
    if (!data.umrahVisaProviderId) {
      return 'Umrah visa providing company is required';
    }
  }
  return null;
};

export const validateStep2 = (data: Step2Data, airports: any[], step1Data?: Step1Data, umrahVisaMaster?: UmrahVisaMaster): string | null => {
  if (!data.arrivalDate || !data.arrivalTime || !data.arrivalAirportId || !data.arrivalFlightNumber) {
    return 'Please fill in all required arrival details';
  }

  if (!isValidStrictDate(data.arrivalDate)) {
    return 'Arrival date must be in DD/MM/YY format';
  }

  if (!data.departureDate || !data.departureTime || !data.departureAirportId || !data.departureFlightNumber) {
    return 'Please fill in all required departure details';
  }

  if (!isValidStrictDate(data.departureDate)) {
    return 'Departure date must be in DD/MM/YY format';
  }

  // Passenger count is required in Step 2 for both individual and group bookings
  if (!data.passengerCount || data.passengerCount < 1) {
    return 'Number of passengers (pax) is required and must be at least 1';
  }

  if (!FLIGHT_NUMBER_REGEX.test(data.arrivalFlightNumber)) {
    return 'Invalid arrival flight number format (e.g., 6E-6083 or SV-123)';
  }

  if (!FLIGHT_NUMBER_REGEX.test(data.departureFlightNumber)) {
    return 'Invalid departure flight number format (e.g., 6E-6083 or SV-123)';
  }

  const durationResult = calculateDuration(data.arrivalDate, data.departureDate);
  if (durationResult.error) {
    return durationResult.error;
  }

  // Validate against Umrah visa master dates
  if (umrahVisaMaster) {
    const arrivalDate = new Date(fromDisplayDate(data.arrivalDate));
    const departureDate = new Date(fromDisplayDate(data.departureDate));
    const lastArrivalDate = new Date(umrahVisaMaster.lastArrivalDate);
    const lastDepartureDate = new Date(umrahVisaMaster.lastDepartureDate);

    if (!isNaN(arrivalDate.getTime()) && !isNaN(lastArrivalDate.getTime()) && arrivalDate > lastArrivalDate) {
      return `Final Date of Umra Visa Arrival is ${umrahVisaMaster.lastArrivalDate}`;
    }

    if (!isNaN(departureDate.getTime()) && !isNaN(lastDepartureDate.getTime()) && departureDate > lastDepartureDate) {
      return `Final Date of Umra Visa Departure is ${umrahVisaMaster.lastDepartureDate}`;
    }
  }

  // Hotel bookings validation for group bookings (hotels moved to Step 2)
  if (data.hotelBookings && data.hotelBookings.length > 0) {
    const arrival = new Date(fromDisplayDate(data.arrivalDate));
    const departure = new Date(fromDisplayDate(data.departureDate));
    
    for (const booking of data.hotelBookings) {
      if (!booking.cityId || !booking.hotelId || !booking.checkInDate || !booking.checkOutDate) {
        return 'Please fill in all hotel booking details';
      }
      
      const checkIn = new Date(fromDisplayDate(booking.checkInDate));
      const checkOut = new Date(fromDisplayDate(booking.checkOutDate));
      
      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        return 'Invalid hotel check-in or check-out date';
      }
      
      // Check-out must be after check-in
      if (checkOut <= checkIn) {
        return 'Check-out date must be after check-in date';
      }
      
      // Check-in must not be before arrival date
      if (!isNaN(arrival.getTime()) && checkIn < arrival) {
        return `Hotel check-in date (${booking.checkInDate}) cannot be before arrival date (${data.arrivalDate})`;
      }
      
      // Check-out must not be after departure date
      if (!isNaN(departure.getTime()) && checkOut > departure) {
        return `Hotel check-out date (${booking.checkOutDate}) cannot be after departure date (${data.departureDate})`;
      }
    }

    const coverage = calculateHotelCoverage(data.arrivalDate, data.departureDate, data.hotelBookings);
    if (coverage.remainingDays > 0) {
      return `You have ${coverage.remainingDays} day${coverage.remainingDays > 1 ? 's' : ''} without accommodation coverage`;
    }
  }

  return null;
};

export const validateStep3 = (
  data: Step3Data, 
  arrivalDate: string, 
  departureDate: string, 
  step2Data?: { passengerCount?: number; arrivalAirportId?: string },
  locationMasters?: any[]
): string | null => {
  // Check if this is an individual booking (has accommodationType) or group booking (has transport selections)
  const isIndividualBooking = !!data.accommodationType;
  const isGroupBooking = !isIndividualBooking && (data.selectedTransports !== undefined || data.selectedTransport !== undefined);

  // For group bookings: Step 3 is transport vehicle selection
  if (isGroupBooking) {
    // Check if arrival airport is Jeddah or Madinah - transport is mandatory
    if (step2Data?.arrivalAirportId && locationMasters) {
      const arrivalAirport = locationMasters.find(
        (lm: any) => lm.id === step2Data.arrivalAirportId && lm.locationType === 'AIRPORT'
      );
      if (arrivalAirport) {
        const airportCity = (arrivalAirport.city || arrivalAirport.cityMaster?.name || '').toLowerCase().trim();
        const isJeddahOrMadinah = 
          airportCity.includes('jeddah') || 
          airportCity.includes('madinah') || 
          airportCity.includes('madina') || 
          airportCity.includes('medina');
        
        if (isJeddahOrMadinah && !data.selectedTransports && !data.selectedTransport) {
          return 'Transport is mandatory for arrivals at Jeddah or Madinah airports. Please select at least one transport vehicle.';
        }
      }
    }

    // Validate transport selection
    if (!data.selectedTransports && !data.selectedTransport) {
      return 'Please select at least one transport vehicle';
    }

    if (data.selectedTransports && data.selectedTransports.length > 0) {
      let totalCapacity = 0;
      for (const transport of data.selectedTransports) {
        if (!transport.routeId || !transport.transportId || !transport.vehicleTypeId) {
          return 'Please complete all transport selections';
        }
        if (transport.quantity && transport.quantity < 1) {
          return 'Transport quantity must be at least 1';
        }
        if ((transport as any).paxCapacity) {
          totalCapacity += ((transport as any).paxCapacity * transport.quantity);
        }
      }
      
      const paxCount = step2Data?.passengerCount || 0;
      if (totalCapacity > 0 && paxCount > 0 && totalCapacity < paxCount) {
        return `Total selected vehicle capacity (${totalCapacity} pax) is less than the number of passengers (${paxCount} pax). Please add more vehicles.`;
      }
    } else if (data.selectedTransport) {
      if (!data.selectedTransport.routeId || !data.selectedTransport.transportId || !data.selectedTransport.vehicleTypeId) {
        return 'Please complete transport selection';
      }
    }
    return null; // Group booking validation complete
  }

  // For individual bookings: Step 3 is accommodation details only (no movement segments needed)
  if (isIndividualBooking) {
    if (data.accommodationType === 'iqama') {
      // Validate passenger count for iqama (max 5)
      const passengerCount = step2Data?.passengerCount;
      if (passengerCount && passengerCount > 5) {
        return `Iqama accommodation is only allowed for up to 5 passengers. You have ${passengerCount} passengers.`;
      }
      
      if (!data.iqamaDetails?.iqamaNumber || !data.iqamaDetails?.iqamaName) {
        return 'Please fill in all required iqama details';
      }
      if (!data.iqamaDetails?.iqamaNationalShortAddress?.trim()) {
        return 'National short address is required for iqama accommodation';
      }
    } else if (data.hotelBookings && data.hotelBookings.length > 0) {
      // Individual booking with hotels in step 3 (backward compatibility)
      for (const booking of data.hotelBookings) {
        if (!booking.cityId || !booking.hotelId || !booking.checkInDate || !booking.checkOutDate) {
          return 'Please fill in all hotel booking details';
        }

        const checkIn = new Date(fromDisplayDate(booking.checkInDate));
        const checkOut = new Date(fromDisplayDate(booking.checkOutDate));

        if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
          return 'Invalid hotel check-in or check-out date';
        }

        if (checkOut <= checkIn) {
          return 'Check-out date must be after check-in date';
        }
      }

      // Note: Hotel coverage validation (all days covered) is NOT required for individual bookings
      // Individual bookings don't need to cover all days between arrival and departure

      // Ziyarah basic validations
      if (data.ziyarah && data.ziyarah.length) {
        for (const z of data.ziyarah) {
          if (!z.date) continue;
          const d = new Date(fromDisplayDate(z.date) + 'T00:00:00');
          if (isNaN(d.getTime())) continue;
          
          // 5 = Friday when using getUTCDay with date-only baseline
          if (d.getUTCDay() === 5) {
            return `${z.city} Ziyarah cannot be scheduled on Friday. Please adjust the date.`;
          }
          if (departureDate && z.date === departureDate) {
            return `${z.city} Ziyarah collides with departure date. Please choose another day.`;
          }
        }
      }
      }
      }

      return null;
      };

      export const validateStep4 = (
      data: Step4Data, 
      arrivalDate?: string,
      departureDate?: string,
      ziyarathCounts?: { [date: string]: number },
      step2Data?: { passengerCount?: number; arrivalAirportId?: string },
      locationMasters?: any[]
      ): string | null => {
      // Step 4: Movement Details (for group bookings) or Transport Selection (for individual)
      // Check if this is a group booking (has movements)
      const isGroupBooking = data.movements !== undefined;

      if (isGroupBooking) {
      // Validate unified movements array
      if (!data.movements || data.movements.length === 0) {
      return 'Please add movements. Select transport routes in Step 3 to auto-generate, or add manually.';
      }

      // Validate each movement
      for (const movement of data.movements) {
      if (!movement.fromLocationId || !movement.toLocationId) {
      return 'Please fill in from and to locations for all movements';
      }
      if (!movement.date) {
      return 'Date is required for all movements';
      }
      if (!movement.time) {
      return 'Time is required for all movements';
      }

      const moveDate = new Date(fromDisplayDate(movement.date));
      if (isNaN(moveDate.getTime())) {
        return `Invalid date format for movement: ${movement.date}`;
      }
      
      const isFriday = moveDate.getUTCDay() === 5;
      const hours = parseInt(movement.time.split(':')[0], 10);
      const isZiyarath = (movement as any).type === 'ziyarath' || (movement as any).tripType === 'ziyarath';

      if (isFriday && isZiyarath && hours < 14) {
      return `Ziyarah on Friday (${movement.date}) must start from 14:00 (2 PM) onwards.`;
      }

      if (locationMasters) {
      const fromLocation = locationMasters.find((lm: any) => lm.id === movement.fromLocationId);
      const toLocation = locationMasters.find((lm: any) => lm.id === movement.toLocationId);

      const currentCity = (fromLocation?.city || fromLocation?.cityMaster?.name || '').toLowerCase().trim();
      const nextCity = (toLocation?.city || toLocation?.cityMaster?.name || '').toLowerCase().trim();

      if ((currentCity === 'makkah' || currentCity === 'mecca') && 
          (nextCity === 'madinah' || nextCity === 'madina' || nextCity === 'medina') && 
          hours < 14) {
        return `Movement from Makkah to Madinah (${movement.date}) must start from 14:00 (2 PM) onwards.`;
      }
      }
      }

      // Validate ziyarath counts if counts are provided
      if (ziyarathCounts) {
      const ziyarathMovements = data.movements.filter(m => m.type === 'ziyarath' && m.date);
      for (const movement of ziyarathMovements) {
      const date = movement.date!;
      const count = ziyarathCounts[date] || 0;
      if (count >= 10) {
        return `Date ${date} has reached the maximum limit of 10 ziyaraths. Please choose another date.`;
      }
      }
      }

      return null; // Group booking validation complete
      }

      // For individual bookings: Step 4 is Transport Selection
      if (!data.selectedTransports && !data.selectedTransport) {
      return 'Please select at least one transport vehicle';
      }

      if (data.selectedTransports && data.selectedTransports.length > 0) {
      let totalCapacity = 0;
      for (const transport of data.selectedTransports) {
      if (!transport.routeId || !transport.transportId || !transport.vehicleTypeId) {
      return 'Please complete all transport selections';
      }
      if (transport.quantity && transport.quantity < 1) {
      return 'Transport quantity must be at least 1';
      }
      if ((transport as any).paxCapacity) {
      totalCapacity += ((transport as any).paxCapacity * transport.quantity);
      }
      }

      const paxCount = step2Data?.passengerCount || 0;
      if (totalCapacity > 0 && paxCount > 0 && totalCapacity < paxCount) {
      return `Total selected vehicle capacity (${totalCapacity} pax) is less than the number of passengers (${paxCount} pax). Please add more vehicles.`;
      }
      } else if (data.selectedTransport) {
      if (!data.selectedTransport.routeId || !data.selectedTransport.transportId || !data.selectedTransport.vehicleTypeId) {
      return 'Please complete transport selection';
      }
      }

      return null;
      };

      // For group bookings: Step 5 is documents
      export const validateStep5 = (data: Step5Data, step1Data: Step1Data, step3Data: Step3Data, isGroupVisa: boolean = false): string | null => {
      // For group bookings: Either ZIP file OR multiple documents are required
      const zipFile = data.panCardZipFile;
      const multipleDocs = data.documents;

      if (!zipFile && (!multipleDocs || multipleDocs.length === 0)) {
      return 'Please upload required documentation (ZIP file or multiple images/PDFs)';
      }

      // Validate ZIP file if provided
      if (zipFile) {
      const isValidZip = zipFile.type === 'application/zip' || zipFile.name.toLowerCase().endsWith('.zip');
      if (!isValidZip) {
      return 'Please upload a valid ZIP file (.zip)';
      }

      // Validate ZIP file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (zipFile.size > maxSize) {
      return 'ZIP file size exceeds 50MB limit. Please compress your files.';
      }
      }

      // Individual file size validation is already handled in the component for multipleDocs

      return null; // All validations passed
      };

      // For individual bookings: Step 5 is movement details
      export const validateStep5Movements = (
      data: Step5Data, 
      step1Data: Step1Data, 
      step2Data: Step2Data,
      step3Data: Step3Data, 
      step4Data: Step4Data,
      locationMasters: any[]
      ): string | null => {
      // Validate movements array
      if (!data.movements || data.movements.length === 0) {
      return 'Please add movements. Select transport routes in Step 4 to auto-generate, or add manually.';
      }

      // Validate each movement
      for (const movement of data.movements) {
      if (!movement.fromLocationId || !movement.toLocationId) {
      return 'Please fill in from and to locations for all movements';
      }
      if (!movement.date) {
      return 'Date is required for all movements';
      }
      if (!movement.time) {
      return 'Time is required for all movements';
      }

      const moveDate = new Date(fromDisplayDate(movement.date));
      if (isNaN(moveDate.getTime())) {
        return `Invalid date format for movement: ${movement.date}`;
      }
      
      const isFriday = moveDate.getUTCDay() === 5;
      const hours = parseInt(movement.time.split(':')[0], 10);
      const isZiyarath = (movement as any).type === 'ziyarath' || (movement as any).tripType === 'ziyarath';

      if (isFriday && isZiyarath && hours < 14) {
      return `Ziyarah on Friday (${movement.date}) must start from 14:00 (2 PM) onwards.`;
      }

      const fromLocation = locationMasters.find((lm: any) => lm.id === movement.fromLocationId);
      const toLocation = locationMasters.find((lm: any) => lm.id === movement.toLocationId);

      const currentCity = (fromLocation?.city || fromLocation?.cityMaster?.name || '').toLowerCase().trim();
      const nextCity = (toLocation?.city || toLocation?.cityMaster?.name || '').toLowerCase().trim();

      if ((currentCity === 'makkah' || currentCity === 'mecca') && 
      (nextCity === 'madinah' || nextCity === 'madina' || nextCity === 'medina') && 
      hours < 14) {
      return `Movement from Makkah to Madinah (${movement.date}) must start from 14:00 (2 PM) onwards.`;
      }
      }

      return null; // All validations passed
      };

export const validateStep6 = (
  data: Step6Data,
  step1Data: Step1Data,
  step3Data: Step3Data,
  passengerCount: number,
  isGroupVisa: boolean = false
): string | null => {
  const isIndividualWithoutGroupNumber = !isGroupVisa && step1Data.bookingMode !== 'group_number';

  // 1) Passport copies
  if (isIndividualWithoutGroupNumber) {
    if (!data.passportCopies || data.passportCopies.length !== passengerCount) {
      return `Exactly ${passengerCount} passport copy files are required (matching passenger count). Currently uploaded: ${data.passportCopies?.length || 0}`;
    }
  }

  // 2) Passenger photo
  if (isIndividualWithoutGroupNumber) {
    if (!data.passengerPhotos || data.passengerPhotos.length !== passengerCount) {
      return `Exactly ${passengerCount} passenger photos are required (matching passenger count). Currently uploaded: ${data.passengerPhotos?.length || 0}`;
    }
    if (!data.passportNumbers || data.passportNumbers.length !== passengerCount || data.passportNumbers.some(p => !p || p.trim() === '')) {
      return 'Please enter a passport number label for each passenger photo.';
    }
  }

  // 4) Iqama copies (mandatory for individual iqama type accommodation booking)
  if (!isGroupVisa && step3Data.accommodationType === 'iqama') {
    if (!data.iqamaCopies || data.iqamaCopies.length === 0) {
      return 'Iqama copy is required for Iqama accommodation type.';
    }
  }

  // 5) onward ticket (mandatory)
  if (!isGroupVisa) {
    if (!data.onwardTickets || data.onwardTickets.length === 0) {
      return 'Onward ticket copy is required.';
    }
  }

  // 6) return ticket (mandatory)
  if (!isGroupVisa) {
    if (!data.returnTickets || data.returnTickets.length === 0) {
      return 'Return ticket copy is required.';
    }
  }

  return null; // All validations passed
};
