// Simple unified movement generation utility
// Replaces complex transportSegments + ziyaraths logic

import { Movement, HotelBooking, Step3Data, Step4Data } from './types';
import { TransportRouteMaster } from '@/types';

interface GenerateMovementsParams {
  hotelBookings: HotelBooking[];
  arrivalAirportId: string;
  departureAirportId: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  locationMasters: any[]; // LocationMaster array
  findZiyarathByCity: (cityName: string) => any | null; // Function to find ziyarath location
}

/**
 * Calculate ziyarath date: checkInDate + 2 days, skip Fridays
 */
function calculateZiyarathDate(checkInDate: string): string {
  const base = new Date(checkInDate);
  base.setDate(base.getDate() + 2);
  // Friday (day 5) -> Saturday (day 6)
  if (base.getUTCDay() === 5) {
    base.setDate(base.getDate() + 1);
  }
  return base.toISOString().split('T')[0];
}

/**
 * Get city name from LocationMaster ID
 */
function getCityName(locationMasterId: string, locationMasters: any[]): string | null {
  const location = locationMasters.find((lm: any) => lm.id === locationMasterId);
  if (!location) return null;
  return location.city || location.cityMaster?.name || null;
}

/**
 * Get airport info from LocationMaster ID
 */
function getAirportInfo(locationMasterId: string, locationMasters: any[]): { name: string | null; city: string | null } {
  const location = locationMasters.find((lm: any) => lm.id === locationMasterId);
  if (!location || location.locationType !== 'AIRPORT') {
    return { name: null, city: null };
  }
  return { 
    name: location.name || null,
    city: location.city || null
  };
}

/**
 * Subtract hours from a time string (HH:mm format) and adjust date if needed
 * Returns { time: string, date: string }
 */
function subtractHoursFromDateTime(
  date: string,
  time: string,
  hoursToSubtract: number
): { date: string; time: string } {
  const [hours, minutes] = time.split(':').map(Number);
  const dateTime = new Date(date);
  dateTime.setHours(hours, minutes, 0, 0);
  
  // Subtract hours
  dateTime.setHours(dateTime.getHours() - hoursToSubtract);
  
  const newDate = dateTime.toISOString().split('T')[0];
  const newTime = `${String(dateTime.getHours()).padStart(2, '0')}:${String(dateTime.getMinutes()).padStart(2, '0')}`;
  
  return { date: newDate, time: newTime };
}

/**
 * Calculate movement time and date for last movement (hotel to departure airport)
 * Based on city and airport combination
 */
function calculateLastMovementTime(
  hotelCityName: string | null,
  airportName: string | null,
  airportCity: string | null,
  departureDate: string,
  departureTime: string
): { date: string; time: string } {
  if (!hotelCityName || !airportName) {
    return { date: departureDate, time: departureTime || '12:00' };
  }

  const cityLower = hotelCityName.toLowerCase().trim();
  const airportLower = airportName.toLowerCase().trim();
  const airportCityLower = airportCity?.toLowerCase().trim() || '';
  
  // Check if airport is Jeddah or Madinah (check both name and city)
  const isJeddahAirport = airportLower.includes('jeddah') || airportCityLower.includes('jeddah');
  const isMadinahAirport = airportLower.includes('madinah') || airportLower.includes('madina') || airportLower.includes('medina') ||
                          airportCityLower.includes('madinah') || airportCityLower.includes('madina') || airportCityLower.includes('medina');
  
  let hoursPrior = 0;
  
  // From Madinah hotel to Jeddah airport: 12 hours prior
  if (cityLower === 'madinah' && isJeddahAirport) {
    hoursPrior = 12;
  }
  // From Madinah hotel to Madinah airport: 5 hours prior
  else if (cityLower === 'madinah' && isMadinahAirport) {
    hoursPrior = 5;
  }
  // From Makkah hotel to Jeddah airport: 8 hours prior
  else if (cityLower === 'makkah' && isJeddahAirport) {
    hoursPrior = 8;
  }
  // From Makkah hotel to Madinah airport: 12 hours prior
  else if (cityLower === 'makkah' && isMadinahAirport) {
    hoursPrior = 12;
  }
  
  // If no specific rule matches, use departure time as-is
  if (hoursPrior === 0) {
    return { date: departureDate, time: departureTime || '12:00' };
  }
  
  // Calculate time and date
  return subtractHoursFromDateTime(departureDate, departureTime || '12:00', hoursPrior);
}

/**
 * Generate all movements from hotel bookings
 * Simple, unified approach - one function, one array
 */
export function generateMovementsFromHotels({
  hotelBookings,
  arrivalAirportId,
  departureAirportId,
  arrivalDate,
  arrivalTime,
  departureDate,
  departureTime,
  locationMasters,
  findZiyarathByCity,
}: GenerateMovementsParams): Movement[] {
  const movements: Movement[] = [];

  if (hotelBookings.length === 0) {
    return movements;
  }

  // 1. Arrival Airport → First Hotel
  const firstHotel = hotelBookings[0];
  if (firstHotel && arrivalAirportId) {
    movements.push({
      id: 'movement-1',
      type: 'transport',
      fromLocationId: arrivalAirportId,
      toLocationId: firstHotel.hotelId,
      date: arrivalDate,
      time: arrivalTime || '12:00',
    });
  }

  // 2. Process each hotel: add ziyarath (if applicable) then move to next hotel
  // Track which cities already have ziyarath to avoid duplicates
  const ziyarathCitiesAdded = new Set<string>();
  
  for (let i = 0; i < hotelBookings.length; i++) {
    const currentHotel = hotelBookings[i];
    const cityName = getCityName(currentHotel.hotelId, locationMasters);
    
    // Check if this hotel is in Makkah or Madinah (has ziyarath)
    const normalizedCity = cityName?.toLowerCase().trim();
    const hasZiyarath = normalizedCity === 'makkah' || normalizedCity === 'madinah';
    
    // Only add ziyarath if we haven't added one for this city yet
    if (hasZiyarath && !ziyarathCitiesAdded.has(normalizedCity!)) {
      const ziyarathLocation = findZiyarathByCity(cityName!);
      if (ziyarathLocation) {
        const ziyarathDate = calculateZiyarathDate(currentHotel.checkInDate);
        const ziyarathTime = normalizedCity === 'makkah' ? '08:00' : '14:00';

        // Hotel → Ziyarath (one-way only, no return trip)
        // Use the first hotel in this city for the ziyarath
        movements.push({
          id: `ziyarath-${normalizedCity}`,
          type: 'ziyarath',
          fromLocationId: currentHotel.hotelId,
          toLocationId: ziyarathLocation.id,
          date: ziyarathDate,
          time: ziyarathTime,
        });
        
        // Mark this city as having ziyarath added
        ziyarathCitiesAdded.add(normalizedCity!);
      }
    }

    // Move to next hotel (from current hotel, not from ziyarath)
    if (i < hotelBookings.length - 1) {
      const nextHotel = hotelBookings[i + 1];
      movements.push({
        id: `movement-${i + 2}`,
        type: 'transport',
        fromLocationId: currentHotel.hotelId, // From current hotel, not from ziyarath
        toLocationId: nextHotel.hotelId,
        date: nextHotel.checkInDate,
        time: '12:00', // Default time
      });
    }
  }

  // 4. Last Hotel → Departure Airport
  // Calculate default timing based on city and airport combination
  const lastHotel = hotelBookings[hotelBookings.length - 1];
  if (lastHotel && departureAirportId) {
    const hotelCityName = getCityName(lastHotel.hotelId, locationMasters);
    const airportInfo = getAirportInfo(departureAirportId, locationMasters);
    
    const { date: movementDate, time: movementTime } = calculateLastMovementTime(
      hotelCityName,
      airportInfo.name,
      airportInfo.city,
      departureDate,
      departureTime
    );
    
    movements.push({
      id: `movement-final`,
      type: 'transport',
      fromLocationId: lastHotel.hotelId,
      toLocationId: departureAirportId,
      date: movementDate,
      time: movementTime,
    });
  }

  // Sort by date/time chronologically
  return movements.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Extract selected routes from transport selection data
 * Returns array of TransportRouteMaster objects
 */
export function getSelectedRoutes(
  transportData: Step3Data | Step4Data | { selectedTransports?: any[]; selectedTransport?: any },
  availableRoutes: TransportRouteMaster[]
): TransportRouteMaster[] {
  const selectedRouteIds = new Set<string>();
  
  // Extract route IDs from selected transports
  const data = transportData as any; // Type assertion for flexibility
  if (data.selectedTransports && data.selectedTransports.length > 0) {
    data.selectedTransports.forEach((transport: any) => {
      if (transport.routeId) {
        selectedRouteIds.add(transport.routeId);
      }
    });
  } else if (data.selectedTransport?.routeId) {
    selectedRouteIds.add(data.selectedTransport.routeId);
  }
  
  // Map route IDs to full TransportRouteMaster objects
  return availableRoutes.filter(route => selectedRouteIds.has(route.id));
}

/**
 * Generate movements based on selected transport routes
 * Only generates movements that match the selected route types
 */
export function generateMovementsFromRoutes({
  hotelBookings,
  arrivalAirportId,
  departureAirportId,
  arrivalDate,
  arrivalTime,
  departureDate,
  departureTime,
  locationMasters,
  findZiyarathByCity,
  selectedRoutes,
}: GenerateMovementsParams & {
  selectedRoutes: TransportRouteMaster[];
}): Movement[] {
  const movements: Movement[] = [];
  
  if (hotelBookings.length === 0 || selectedRoutes.length === 0) {
    return movements;
  }
  
  // Check if fulltrip is selected (for ziyarath generation)
  const hasFullTrip = selectedRoutes.some(route => route.routeType === 'fulltrip');
  
  // Track which route types are selected
  const hasAirportToCity = selectedRoutes.some(route => route.routeType === 'airporttocity');
  const hasCityToAirport = selectedRoutes.some(route => route.routeType === 'citytoairport');
  const hasTripAndTour = selectedRoutes.some(route => route.routeType === 'tripandtour');
  
  // 1. Airport → First Hotel (for airporttocity, fulltrip, or tripandtour)
  if (hasAirportToCity || hasFullTrip || hasTripAndTour) {
    const firstHotel = hotelBookings[0];
    if (firstHotel && arrivalAirportId) {
      movements.push({
        id: 'movement-1',
        type: 'transport',
        fromLocationId: arrivalAirportId,
        toLocationId: firstHotel.hotelId,
        date: arrivalDate,
        time: arrivalTime || '12:00',
      });
    }
  }
  
  // 2. Inter-hotel movements (for fulltrip or tripandtour)
  if (hasFullTrip || hasTripAndTour) {
    for (let i = 0; i < hotelBookings.length - 1; i++) {
      const currentHotel = hotelBookings[i];
      const nextHotel = hotelBookings[i + 1];
      
      let moveDate = new Date(nextHotel.checkInDate);
      let time = '12:00';

      const currentCity = getCityName(currentHotel.hotelId, locationMasters)?.toLowerCase().trim();
      const nextCity = getCityName(nextHotel.hotelId, locationMasters)?.toLowerCase().trim();
      
      // Makkah to Madina rule: must be after 14:00
      if ((currentCity === 'makkah' || currentCity === 'mecca') && 
          (nextCity === 'madinah' || nextCity === 'madina' || nextCity === 'medina')) {
        time = '14:00';
      }

      // Friday skip rule for auto-generation
      if (moveDate.getUTCDay() === 5) {
        moveDate.setDate(moveDate.getDate() + 1); // Skip to Saturday
      }

      movements.push({
        id: `movement-${i + 2}`,
        type: 'transport',
        fromLocationId: currentHotel.hotelId,
        toLocationId: nextHotel.hotelId,
        date: moveDate.toISOString().split('T')[0],
        time: time,
      });
    }
  }
  
  // 3. Ziyarath movements (only for fulltrip)
  if (hasFullTrip) {
    const ziyarathCitiesAdded = new Set<string>();
    
    for (let i = 0; i < hotelBookings.length; i++) {
      const currentHotel = hotelBookings[i];
      const cityName = getCityName(currentHotel.hotelId, locationMasters);
      
      const normalizedCity = cityName?.toLowerCase().trim();
      const hasZiyarath = normalizedCity === 'makkah' || normalizedCity === 'madinah';
      
      if (hasZiyarath && !ziyarathCitiesAdded.has(normalizedCity!)) {
        const ziyarathLocation = findZiyarathByCity(cityName!);
        if (ziyarathLocation) {
          const ziyarathDate = calculateZiyarathDate(currentHotel.checkInDate);
          const ziyarathTime = normalizedCity === 'makkah' ? '08:00' : '14:00';
          
          movements.push({
            id: `ziyarath-${normalizedCity}`,
            type: 'ziyarath',
            fromLocationId: currentHotel.hotelId,
            toLocationId: ziyarathLocation.id,
            date: ziyarathDate,
            time: ziyarathTime,
          });
          
          ziyarathCitiesAdded.add(normalizedCity!);
        }
      }
    }
  }
  
  // 4. Last Hotel → Airport (for citytoairport, fulltrip, or tripandtour)
  if (hasCityToAirport || hasFullTrip || hasTripAndTour) {
    const lastHotel = hotelBookings[hotelBookings.length - 1];
    if (lastHotel && departureAirportId) {
      const hotelCityName = getCityName(lastHotel.hotelId, locationMasters);
      const airportInfo = getAirportInfo(departureAirportId, locationMasters);
      
      const { date: movementDate, time: movementTime } = calculateLastMovementTime(
        hotelCityName,
        airportInfo.name,
        airportInfo.city,
        departureDate,
        departureTime
      );
      
      movements.push({
        id: `movement-final`,
        type: 'transport',
        fromLocationId: lastHotel.hotelId,
        toLocationId: departureAirportId,
        date: movementDate,
        time: movementTime,
      });
    }
  }
  
  // Sort by date/time chronologically
  return movements.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });
}

