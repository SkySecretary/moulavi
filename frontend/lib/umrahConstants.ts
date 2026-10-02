// Frontend constants for Umrah Visa Booking

export interface RouteOption {
  id: string;
  name: string;
  requiresTransport: boolean;
  description?: string;
}

export interface TransportOption {
  id: string;
  name: string;
  description: string;
  paxOptions: number[];
}

// Route options for arrival airport/destination
export const ROUTE_OPTIONS: RouteOption[] = [
  { id: 'jeddah_to_jeddah', name: 'Jeddah to Jeddah', requiresTransport: true },
  { id: 'jeddah_to_makkah', name: 'Jeddah to Makkah', requiresTransport: true },
  { id: 'makkah_to_jeddah', name: 'Makkah to Jeddah', requiresTransport: false },
  { id: 'jeddah_to_madina', name: 'Jeddah to Madina', requiresTransport: true },
  { id: 'madina_to_jeddah', name: 'Madina to Jeddah', requiresTransport: false },
  { id: 'jeddah_makkah_madina_jeddah', name: 'Jeddah - Makkah - Madina - Jeddah', requiresTransport: true },
  { id: 'makkah_to_taif', name: 'Makkah to Taif', requiresTransport: false },
  { id: 'makkah_mazarath_to_madina_mazarath', name: 'Makkah Mazarath to Madina Mazarath', requiresTransport: false },
  { id: 'train_station_to_hotel', name: 'Train Station to Hotel', requiresTransport: false },
  { id: 'train_station_return', name: 'Train Station Return', requiresTransport: false },
  { id: 'madina_airport_to_hotel', name: 'Madina Airport to Hotel', requiresTransport: false },
  { id: 'madina_hotel_to_airport', name: 'Madina Hotel to Airport', requiresTransport: false },
];

// Transport options
export const TRANSPORT_OPTIONS: TransportOption[] = [
  {
    id: 'lexus_es_250',
    name: 'Lexus ES 250',
    description: 'Luxury sedan with premium comfort',
    paxOptions: [3]
  },
  {
    id: 'staria',
    name: 'Staria',
    description: 'Modern van with spacious interior',
    paxOptions: [8]
  },
  {
    id: 'gmc',
    name: 'GMC',
    description: 'Robust SUV for group travel',
    paxOptions: [7]
  },
  {
    id: 'hiace',
    name: 'Hiace',
    description: 'Reliable van for large groups',
    paxOptions: [10]
  }
];

// Validation rules
export const VALIDATION_RULES = {
  MAX_TRAVEL_DAYS: 80,
  MAX_PASSENGERS_IQAMA: 5,
  MIN_PASSENGERS: 1,
  MAX_PASSENGERS: 50,
};

// Document types
export const DOCUMENT_TYPES = {
  PAN_CARD: 'pan_card',
  PASSPORT_FRONT: 'passport_front',
  PASSPORT_BACK: 'passport_back',
  PHOTO: 'photo'
} as const;

// Required documents based on booking mode
export const REQUIRED_DOCUMENTS = {
  group_number: {
    lead_passenger: ['pan_card', 'passport_front', 'passport_back'],
    other_passengers: ['passport_front', 'passport_back']
  },
  travel_documents: {
    lead_passenger: ['pan_card', 'passport_front', 'passport_back'],
    other_passengers: ['passport_front', 'passport_back']
  }
};

// Helper functions
export function getRouteById(routeId: string): RouteOption | undefined {
  return ROUTE_OPTIONS.find(route => route.id === routeId);
}

export function getTransportById(transportId: string): TransportOption | undefined {
  return TRANSPORT_OPTIONS.find(transport => transport.id === transportId);
}

export function requiresTransport(routeId: string): boolean {
  const route = getRouteById(routeId);
  return route?.requiresTransport || false;
}

export function isJeddahRoute(routeId: string): boolean {
  return routeId.includes('jeddah');
}

export function getTransportPaxForType(transportType: string): number | null {
  const transport = TRANSPORT_OPTIONS.find(t => t.id === transportType);
  return transport ? transport.paxOptions[0] : null;
}

export function validatePassengerCount(count: number, accommodationType: 'hotel' | 'iqama'): boolean {
  if (count < VALIDATION_RULES.MIN_PASSENGERS || count > VALIDATION_RULES.MAX_PASSENGERS) {
    return false;
  }
  
  if (accommodationType === 'iqama' && count > VALIDATION_RULES.MAX_PASSENGERS_IQAMA) {
    return false;
  }
  
  return true;
}

export function validateTravelDates(arrivalDate: Date, departureDate: Date): boolean {
  const diffTime = departureDate.getTime() - arrivalDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= VALIDATION_RULES.MAX_TRAVEL_DAYS && diffDays > 0;
}

// Form step configuration
export const BOOKING_STEPS = [
  {
    id: 1,
    title: 'Booking Mode',
    description: 'Select booking method',
    fields: ['bookingMode']
  },
  {
    id: 2,
    title: 'Group & Flight Details',
    description: 'Enter group and flight information',
    fields: ['groupNumber', 'groupName', 'flightNumber', 'arrivalDate', 'departureDate', 'arrivalAirport']
  },
  {
    id: 3,
    title: 'Transport Details',
    description: 'Select transport options',
    fields: ['transportRoute', 'transportType', 'transportPax']
  },
  {
    id: 4,
    title: 'Accommodation',
    description: 'Choose accommodation type',
    fields: ['accommodationType', 'hotelDetails', 'iqamaDetails']
  },
  {
    id: 5,
    title: 'Passenger Details & Documents',
    description: 'Enter passenger information and upload documents',
    fields: ['passengerCount', 'passengers', 'documents']
  }
];

export const NATIONALITY_OPTIONS = [
  { value: 'India', label: 'India' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  { value: 'Pakistan', label: 'Pakistan' },
  { value: 'Bangladesh', label: 'Bangladesh' },
  { value: 'Egypt', label: 'Egypt' },
  { value: 'Yemen', label: 'Yemen' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Oman', label: 'Oman' },
  { value: 'Kuwait', label: 'Kuwait' },
  { value: 'Qatar', label: 'Qatar' },
  { value: 'Bahrain', label: 'Bahrain' },
  { value: 'Philippines', label: 'Philippines' },
  { value: 'Indonesia', label: 'Indonesia' },
  { value: 'Malaysia', label: 'Malaysia' },
  { value: 'Sri Lanka', label: 'Sri Lanka' },
  { value: 'Nepal', label: 'Nepal' },
  { value: 'Sudan', label: 'Sudan' },
  { value: 'Jordan', label: 'Jordan' },
  { value: 'Syria', label: 'Syria' },
  { value: 'Lebanon', label: 'Lebanon' },
  { value: 'Morocco', label: 'Morocco' },
  { value: 'Tunisia', label: 'Tunisia' },
  { value: 'Algeria', label: 'Algeria' },
  { value: 'Turkey', label: 'Turkey' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'United States', label: 'United States' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Other', label: 'Other' },
];

