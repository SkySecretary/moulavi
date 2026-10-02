// Simple unified movement generation utility
// Replaces complex transportSegments + ziyaraths logic

import { Movement, HotelBooking, Step3Data, Step4Data } from './types';
import { TransportRouteMaster } from '@/types';
import { fromDisplayDate } from './validation';

interface GenerateMovementsParams {
  hotelBookings: HotelBooking[];
  arrivalAirportId: string;
  departureAirportId: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  locationMasters: any[]; // LocationMaster array
  findZiyarathByCity?: (cityName: string) => any | null; // Optional function to find ziyarath location
}

/**
 * Normalize city names across different naming conventions (e.g., Makkah/Mecca, Madinah/Medina)
 */
export function normalizeCityName(cityName: string | null | undefined): string {
  if (!cityName) return '';
  const c = cityName.toLowerCase().trim();
  if (c.includes('makkah') || c.includes('mecca') || c.includes('makka')) return 'makkah';
  if (c.includes('madin') || c.includes('medin') || c.includes('madeen') || c.includes('madina')) return 'madinah';
  if (c.includes('jeddah') || c.includes('jed')) return 'jeddah';
  if (c.includes('taif') || c.includes('tayif')) return 'taif';
  if (c.includes('yanbu')) return 'yanbu';
  if (c.includes('riyadh')) return 'riyadh';
  return c;
}

/**
 * Find ziyarath LocationMaster robustly by city name or location master data
 */
export function findZiyarathLocation(cityName: string, locationMasters: any[] = []): any | null {
  const normTarget = normalizeCityName(cityName);
  if (normTarget !== 'makkah' && normTarget !== 'madinah') return null;

  // 1. First priority: active location with locationType === 'ZIYARAT' and matching city
  const ziyaratTypeMatch = locationMasters.find((lm: any) => 
    lm.isActive !== false &&
    lm.locationType === 'ZIYARAT' &&
    normalizeCityName(lm.city || lm.cityMaster?.name) === normTarget
  );
  if (ziyaratTypeMatch) return ziyaratTypeMatch;

  // 2. Second priority: location name contains 'ziyar' and matching city
  const ziyaratNameMatch = locationMasters.find((lm: any) =>
    lm.isActive !== false &&
    (lm.name || '').toLowerCase().includes('ziyar') &&
    normalizeCityName(lm.city || lm.cityMaster?.name) === normTarget
  );
  if (ziyaratNameMatch) return ziyaratNameMatch;

  // 3. Third priority: match by code
  const codePrefix = normTarget === 'makkah' ? 'MAK' : 'MAD';
  const codeMatch = locationMasters.find((lm: any) =>
    lm.isActive !== false &&
    (lm.code || '').toUpperCase().startsWith(codePrefix) &&
    (lm.name || '').toLowerCase().includes('ziyar')
  );
  if (codeMatch) return codeMatch;

  // 4. Fourth priority: any location master for this city with ZIYARAT type
  const fallbackZiyarat = locationMasters.find((lm: any) =>
    lm.locationType === 'ZIYARAT' &&
    normalizeCityName(lm.city || lm.cityMaster?.name) === normTarget
  );
  if (fallbackZiyarat) return fallbackZiyarat;

  return null;
}

/**
 * Calculate ziyarath date: checkInDate + 2 days, skip Fridays
 */
function calculateZiyarathDate(checkInDate: string): string {
  try {
    if (!checkInDate) return '';
    // checkInDate might be DD/MM/YY, convert to ISO first
    const isoDate = fromDisplayDate(checkInDate);
    const base = new Date(isoDate);
    if (isNaN(base.getTime())) return '';
    base.setDate(base.getDate() + 2);
    // Friday (day 5) -> Saturday (day 6)
    if (base.getUTCDay() === 5) {
      base.setDate(base.getDate() + 1);
    }
    return base.toISOString().split('T')[0];
  } catch {
    return '';
  }
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
  try {
    const [hours, minutes] = (time || '00:00').split(':').map(Number);
    // date might be DD/MM/YY
    const isoDate = fromDisplayDate(date);
    const dateTime = new Date(isoDate);
    if (isNaN(dateTime.getTime())) return { date, time };
    
    dateTime.setHours(hours, minutes, 0, 0);
    
    // Subtract hours
    dateTime.setHours(dateTime.getHours() - hoursToSubtract);
    
    if (isNaN(dateTime.getTime())) return { date, time };
    
    const newDate = dateTime.toISOString().split('T')[0];
    const newTime = `${String(dateTime.getHours()).padStart(2, '0')}:${String(dateTime.getMinutes()).padStart(2, '0')}`;
    
    return { date: newDate, time: newTime };
  } catch {
    return { date, time };
  }
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
    return { date: departureDate, time: departureTime || '20:30' };
  }

  const cityNorm = normalizeCityName(hotelCityName);
  const airportLower = (airportName || '').toLowerCase().trim();
  const airportCityLower = (airportCity || '').toLowerCase().trim();
  
  // Check if airport is Jeddah or Madinah
  const isJeddahAirport = airportLower.includes('jeddah') || airportCityLower.includes('jeddah');
  const isMadinahAirport = airportLower.includes('madinah') || airportLower.includes('madina') || airportLower.includes('medina') ||
                          airportCityLower.includes('madinah') || airportCityLower.includes('madina') || airportCityLower.includes('medina');
  
  let hoursPrior = 0;
  
  // From Madinah hotel to Jeddah airport: 12 hours prior
  if (cityNorm === 'madinah' && isJeddahAirport) {
    hoursPrior = 12;
  }
  // From Madinah hotel to Madinah airport: 5 hours prior
  else if (cityNorm === 'madinah' && isMadinahAirport) {
    hoursPrior = 5;
  }
  // From Makkah hotel to Jeddah airport: 8 hours prior
  else if (cityNorm === 'makkah' && isJeddahAirport) {
    hoursPrior = 8;
  }
  // From Makkah hotel to Madinah airport: 12 hours prior
  else if (cityNorm === 'makkah' && isMadinahAirport) {
    hoursPrior = 12;
  }
  
  // If no specific rule matches, use departure time as-is
  if (hoursPrior === 0) {
    return { date: departureDate, time: departureTime || '20:30' };
  }
  
  // Calculate time and date
  return subtractHoursFromDateTime(departureDate, departureTime || '20:30', hoursPrior);
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
      time: arrivalTime || '20:30',
    });
  }

  // 2. Process each hotel: add ziyarath (if applicable) then move to next hotel
  // Track which cities already have ziyarath to avoid duplicates
  const ziyarathCitiesAdded = new Set<string>();
  
  for (let i = 0; i < hotelBookings.length; i++) {
    const currentHotel = hotelBookings[i];
    const cityName = getCityName(currentHotel.hotelId, locationMasters);
    const normalizedCity = normalizeCityName(cityName);
    const hasZiyarath = normalizedCity === 'makkah' || normalizedCity === 'madinah';
    
    // Only add ziyarath if we haven't added one for this city yet
    if (hasZiyarath && !ziyarathCitiesAdded.has(normalizedCity)) {
      const ziyarathLocation = (findZiyarathByCity ? findZiyarathByCity(cityName || '') : null) || 
                               findZiyarathLocation(cityName || '', locationMasters);
      if (ziyarathLocation) {
        const ziyarathDate = calculateZiyarathDate(currentHotel.checkInDate);
        const ziyarathTime = normalizedCity === 'makkah' ? '08:00' : '14:00';

        // Hotel → Ziyarath (one-way only, no return trip)
        movements.push({
          id: `ziyarath-${normalizedCity}`,
          type: 'ziyarath',
          fromLocationId: currentHotel.hotelId,
          toLocationId: ziyarathLocation.id,
          date: ziyarathDate,
          time: ziyarathTime,
        });
        
        ziyarathCitiesAdded.add(normalizedCity);
      }
    }

    // Move to next hotel (from current hotel, not from ziyarath)
    if (i < hotelBookings.length - 1) {
      const nextHotel = hotelBookings[i + 1];
      const nextCityName = getCityName(nextHotel.hotelId, locationMasters);
      const nextNormCity = normalizeCityName(nextCityName);

      // Default timing: Makkah to Madinah trips MUST strictly start at or after 2 PM (14:00)
      let moveTime = '20:30';
      if (normalizedCity === 'makkah' && nextNormCity === 'madinah') {
        moveTime = '14:00';
      }

      movements.push({
        id: `movement-${i + 2}`,
        type: 'transport',
        fromLocationId: currentHotel.hotelId,
        toLocationId: nextHotel.hotelId,
        date: nextHotel.checkInDate,
        time: moveTime,
      });
    }
  }

  // 4. Last Hotel → Departure Airport
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
    const isoDateA = fromDisplayDate(a.date || '');
    const isoDateB = fromDisplayDate(b.date || '');
    const dateA = new Date(`${isoDateA}T${a.time || '00:00'}:00.000Z`);
    const dateB = new Date(`${isoDateB}T${b.time || '00:00'}:00.000Z`);
    
    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
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
  const data = transportData as any;
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
  
  // Check if fulltrip or tripandtour is selected (for ziyarath and inter-city generation)
  const hasFullTrip = selectedRoutes.some(route => route.routeType === 'fulltrip');
  const hasTripAndTour = selectedRoutes.some(route => route.routeType === 'tripandtour');
  const hasAirportToCity = selectedRoutes.some(route => route.routeType === 'airporttocity');
  const hasCityToAirport = selectedRoutes.some(route => route.routeType === 'citytoairport');
  const hasCityToCity = selectedRoutes.some(route => route.routeType === 'citytocity');
  
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
        time: arrivalTime || '20:30',
      });
    }
  }
  
  // 2. Inter-hotel movements (for fulltrip, tripandtour, or citytocity)
  if (hasFullTrip || hasTripAndTour || hasCityToCity) {
    for (let i = 0; i < hotelBookings.length - 1; i++) {
      const currentHotel = hotelBookings[i];
      const nextHotel = hotelBookings[i + 1];
      
      const isoMoveDate = fromDisplayDate(nextHotel.checkInDate);
      let moveDate = new Date(isoMoveDate);
      let time = '20:30';

      const currentCity = getCityName(currentHotel.hotelId, locationMasters);
      const nextCity = getCityName(nextHotel.hotelId, locationMasters);
      const normCurrent = normalizeCityName(currentCity);
      const normNext = normalizeCityName(nextCity);
      
      // Makkah to Madinah rule: must strictly start at or after 14:00 (2:00 PM)
      if (normCurrent === 'makkah' && normNext === 'madinah') {
        time = '14:00';
      }

      // Friday skip rule for auto-generation
      if (moveDate.getUTCDay() === 5) {
        moveDate.setDate(moveDate.getDate() + 1); // Skip to Saturday
      }

      const formattedDate = !isNaN(moveDate.getTime()) ? moveDate.toISOString().split('T')[0] : (isoMoveDate || nextHotel.checkInDate);

      movements.push({
        id: `movement-${i + 2}`,
        type: 'transport',
        fromLocationId: currentHotel.hotelId,
        toLocationId: nextHotel.hotelId,
        date: formattedDate,
        time: time,
      });
    }
  }
  
  // 3. Ziyarath movements (for fulltrip or tripandtour)
  if (hasFullTrip || hasTripAndTour) {
    const ziyarathCitiesAdded = new Set<string>();
    
    for (let i = 0; i < hotelBookings.length; i++) {
      const currentHotel = hotelBookings[i];
      const cityName = getCityName(currentHotel.hotelId, locationMasters);
      const normalizedCity = normalizeCityName(cityName);
      const hasZiyarath = normalizedCity === 'makkah' || normalizedCity === 'madinah';
      
      if (hasZiyarath && !ziyarathCitiesAdded.has(normalizedCity)) {
        const ziyarathLocation = (findZiyarathByCity ? findZiyarathByCity(cityName || '') : null) ||
                                 findZiyarathLocation(cityName || '', locationMasters);
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
          
          ziyarathCitiesAdded.add(normalizedCity);
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
    const isoDateA = fromDisplayDate(a.date || '');
    const isoDateB = fromDisplayDate(b.date || '');
    const dateA = new Date(`${isoDateA}T${a.time || '00:00'}:00.000Z`);
    const dateB = new Date(`${isoDateB}T${b.time || '00:00'}:00.000Z`);
    
    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
    return dateA.getTime() - dateB.getTime();
  });
}
