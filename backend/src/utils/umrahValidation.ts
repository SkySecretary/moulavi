// Enhanced validation utilities for Umrah visa bookings

import { VALIDATION_RULES, getRouteById, getTransportById, getTransportPrice } from '../config/umrahConfig';
import { parseSafeDate } from './dateParser';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate Umrah visa booking data
 */
export function validateUmrahBooking(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate booking mode requirements
  if (data.bookingMode === 'group_number') {
    if (!data.groupNumber || data.groupNumber.trim() === '') {
      errors.push('Group number is required for group booking mode');
    }
    if (!data.groupName || data.groupName.trim() === '') {
      errors.push('Group name is required for group booking mode');
    }
  }

  // Validate flight details
  if (!data.flightNumber || data.flightNumber.trim() === '') {
    errors.push('Flight number is required');
  }

  // Validate dates
  if (!data.arrivalDate || !data.departureDate) {
    errors.push('Arrival and departure dates are required');
  } else {
    const arrival = parseSafeDate(data.arrivalDate);
    const departure = parseSafeDate(data.departureDate);
    
    if (!arrival || !departure) {
      errors.push('Invalid date format for arrival or departure');
    } else {
      if (arrival >= departure) {
        errors.push('Departure date must be after arrival date');
      }
      
      const diffTime = departure.getTime() - arrival.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > VALIDATION_RULES.MAX_TRAVEL_DAYS) {
        errors.push(`Travel duration cannot exceed ${VALIDATION_RULES.MAX_TRAVEL_DAYS} days`);
      }
      
      if (diffDays < 1) {
        errors.push('Travel duration must be at least 1 day');
      }
    }
  }

  // Validate arrival airport
  if (!data.arrivalAirport) {
    errors.push('Arrival airport/route is required');
  } else {
    const route = getRouteById(data.arrivalAirport);
    if (!route) {
      errors.push('Invalid arrival airport/route selected');
    }
  }

  // Validate transport requirements
  if (data.arrivalAirport) {
    const route = getRouteById(data.arrivalAirport);
    if (route?.requiresTransport) {
      if (!data.transportType) {
        errors.push('Transport type is required for this route');
      }
      if (!data.transportPax) {
        errors.push('Transport passenger count is required for this route');
      }
      
      if (data.transportType && data.transportPax) {
        const transport = getTransportById(data.transportType);
        if (transport && !transport.paxOptions.includes(data.transportPax)) {
          errors.push(`Invalid passenger count for selected transport type`);
        }
        
        const price = getTransportPrice(data.arrivalAirport, data.transportType, data.transportPax);
        if (price === null) {
          errors.push('Invalid transport configuration');
        }
      }
    }
  }

  // Validate accommodation details
  if (data.accommodationType === 'hotel') {
    if (!data.makkahCheckIn || !data.makkahCheckOut) {
      errors.push('Makkah check-in and check-out dates are required for hotel accommodation');
    }
    if (!data.madinaCheckIn || !data.madinaCheckOut) {
      errors.push('Madina check-in and check-out dates are required for hotel accommodation');
    }
  } else if (data.accommodationType === 'iqama') {
    if (!data.iqamaNumber || data.iqamaNumber.trim() === '') {
      errors.push('Iqama number is required for iqama accommodation');
    }
    if (!data.iqamaName || data.iqamaName.trim() === '') {
      errors.push('Iqama name is required for iqama accommodation');
    }
    if (!data.iqamaDob) {
      errors.push('Iqama holder date of birth is required for iqama accommodation');
    }
    if (!data.iqamaMobile || data.iqamaMobile.trim() === '') {
      errors.push('Iqama holder mobile number is required for iqama accommodation');
    }
  }

  // Validate passenger count
  if (!data.passengerCount || data.passengerCount < 1) {
    errors.push('At least 1 passenger is required');
  }
  
  if (data.passengerCount > VALIDATION_RULES.MAX_PASSENGERS) {
    errors.push(`Maximum ${VALIDATION_RULES.MAX_PASSENGERS} passengers allowed`);
  }
  
  if (data.accommodationType === 'iqama' && data.passengerCount > VALIDATION_RULES.MAX_PASSENGERS_IQAMA) {
    errors.push(`Maximum ${VALIDATION_RULES.MAX_PASSENGERS_IQAMA} passengers allowed for iqama accommodation`);
  }

  // Validate passengers array
  if (!data.passengers || !Array.isArray(data.passengers)) {
    errors.push('Passengers array is required');
  } else {
    if (data.passengers.length !== data.passengerCount) {
      errors.push('Passengers array length must match passenger count');
    }
    
    const leadPassengers = data.passengers.filter((p: any) => p.isLeadPassenger);
    if (leadPassengers.length !== 1) {
      errors.push('Exactly one lead passenger is required');
    }
    
    // Validate individual passengers
    data.passengers.forEach((passenger: any, index: number) => {
      if (!passenger.fullName || passenger.fullName.trim() === '') {
        errors.push(`Passenger ${index + 1}: Full name is required`);
      }
      if (!passenger.passportNumber || passenger.passportNumber.trim() === '') {
        errors.push(`Passenger ${index + 1}: Passport number is required`);
      }
      if (!passenger.nationality || passenger.nationality.trim() === '') {
        errors.push(`Passenger ${index + 1}: Nationality is required`);
      }
      if (!passenger.passportExpiry) {
        errors.push(`Passenger ${index + 1}: Passport expiry date is required`);
      }
      if (!passenger.dateOfBirth) {
        errors.push(`Passenger ${index + 1}: Date of birth is required`);
      }
      if (!passenger.gender) {
        errors.push(`Passenger ${index + 1}: Gender is required`);
      }
      
      // Validate passport expiry
      if (passenger.passportExpiry) {
        const expiry = parseSafeDate(passenger.passportExpiry);
        if (expiry) {
          const today = new Date();
          const sixMonthsFromNow = new Date();
          sixMonthsFromNow.setMonth(today.getMonth() + 6);
          
          if (expiry <= sixMonthsFromNow) {
            warnings.push(`Passenger ${index + 1}: Passport expires within 6 months`);
          }
        }
      }
      
      // Validate age
      if (passenger.dateOfBirth) {
        const birthDate = parseSafeDate(passenger.dateOfBirth);
        if (birthDate) {
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          if (age < 0) {
            errors.push(`Passenger ${index + 1}: Invalid date of birth`);
          } else if (age < 2) {
            warnings.push(`Passenger ${index + 1}: Infant passenger (under 2 years)`);
          } else if (age > 80) {
            warnings.push(`Passenger ${index + 1}: Senior passenger (over 80 years)`);
          }
        }
      }
    });
  }

  // Business logic validations
  if (data.arrivalDate && data.departureDate) {
    const arrival = parseSafeDate(data.arrivalDate);
    if (arrival) {
      const today = new Date();
      // Set to beginning of today
      today.setHours(0, 0, 0, 0);
      
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      if (arrival < today) {
        warnings.push('Arrival date is in the past');
      } else if (arrival > thirtyDaysFromNow) {
        warnings.push('Arrival date is more than 30 days in the future');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate passenger data
 */
export function validatePassenger(passenger: any, index: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!passenger.fullName || passenger.fullName.trim() === '') {
    errors.push(`Passenger ${index + 1}: Full name is required`);
  }

  if (!passenger.passportNumber || passenger.passportNumber.trim() === '') {
    errors.push(`Passenger ${index + 1}: Passport number is required`);
  }

  if (!passenger.nationality || passenger.nationality.trim() === '') {
    errors.push(`Passenger ${index + 1}: Nationality is required`);
  }

  if (!passenger.passportExpiry) {
    errors.push(`Passenger ${index + 1}: Passport expiry date is required`);
  }

  if (!passenger.dateOfBirth) {
    errors.push(`Passenger ${index + 1}: Date of birth is required`);
  }

  if (!passenger.gender) {
    errors.push(`Passenger ${index + 1}: Gender is required`);
  }

  // Validate passport expiry
  if (passenger.passportExpiry) {
    const expiry = parseSafeDate(passenger.passportExpiry);
    if (expiry) {
      const today = new Date();
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(today.getMonth() + 6);
      
      if (expiry <= sixMonthsFromNow) {
        warnings.push(`Passenger ${index + 1}: Passport expires within 6 months`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate transport configuration
 */
export function validateTransportConfig(routeId: string, transportId: string, pax: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const route = getRouteById(routeId);
  if (!route) {
    errors.push('Invalid route selected');
    return { isValid: false, errors, warnings };
  }

  const transport = getTransportById(transportId);
  if (!transport) {
    errors.push('Invalid transport type selected');
    return { isValid: false, errors, warnings };
  }

  if (!transport.paxOptions.includes(pax)) {
    errors.push(`Invalid passenger count for selected transport type`);
  }

  const price = getTransportPrice(routeId, transportId, pax);
  if (price === null) {
    errors.push('Invalid transport configuration');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get validation summary
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.isValid) {
    if (result.warnings.length > 0) {
      return `Valid with ${result.warnings.length} warning(s)`;
    }
    return 'Valid';
  }
  
  return `Invalid: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`;
}
