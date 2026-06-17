// Umrah Visa Booking Constants

export const BOOKING_LIMITS = {
  MAX_TRAVEL_DAYS: 80,
  MAX_PASSENGERS_IQAMA: 5,
  FLIGHT_NUMBER_MAX_LENGTH: 8,
} as const;

// Flight number format: 2-3 alphanumeric characters, optional dash, 1-10 alphanumeric characters
export const FLIGHT_NUMBER_REGEX = /^[A-Z0-9]{2,3}-?[A-Z0-9]{1,10}$/;

export const BOOKING_MODES = {
  GROUP_NUMBER: 'group_number',
  TRAVEL_DETAILS: 'travel_details',
} as const;

export const ACCOMMODATION_TYPES = {
  HOTEL: 'hotel',
  IQAMA: 'iqama',
} as const;

export const DOCUMENT_TYPES = {
  PAN_CARD: 'panCardPhoto',
  PASSPORT_FRONT: 'passportFront',
  PASSPORT_BACK: 'passportBack',
  IQAMA_PHOTO: 'iqamaPhoto',
  HOTEL_BOOKING: 'hotelBooking',
  TICKET_COPY: 'ticketCopy',
} as const;

// Document requirements are now handled dynamically in validation logic
// This constant is kept for reference but not used in validation
export const DOCUMENT_REQUIREMENTS = {
  GROUP_VISA: {
    description: 'Group Umrah Visa: Only PAN card required (lead passenger)',
    documents: ['panCardPhoto'],
  },
  INDIVIDUAL_WITH_GROUP_HOTEL: {
    description: 'Individual booking with group number + hotel: PAN card + ticket copy + hotel copy (lead passenger)',
    documents: ['panCardPhoto', 'ticketCopy', 'hotelBooking'],
  },
  INDIVIDUAL_WITH_GROUP_IQAMA: {
    description: 'Individual booking with group number + iqama: PAN card + iqama copy (lead passenger)',
    documents: ['panCardPhoto', 'iqamaPhoto'],
  },
  INDIVIDUAL_WITHOUT_GROUP: {
    description: 'Individual booking without group number: Passport front & back (all passengers), PAN card (lead passenger)',
    documents: ['passportFront', 'passportBack', 'panCardPhoto'], // panCardPhoto only for lead
  },
} as const;

export const STEPS = [
  {
    id: 1,
    title: 'Booking Mode',
    description: 'Choose booking type',
    icon: 'Users',
  },
  {
    id: 2,
    title: 'Travel Details',
    description: 'Flight and transport information',
    icon: 'Plane',
  },
  {
    id: 3,
    title: 'Accommodation',
    description: 'Hotel or Iqama details',
    icon: 'Home',
  },
  {
    id: 4,
    title: 'Passengers',
    description: 'Passenger information',
    icon: 'User',
  },
] as const;

// Steps for individual Umrah visa bookings
export const INDIVIDUAL_STEPS = [
  {
    id: 1,
    title: 'Booking Mode',
    description: 'Choose booking type',
    icon: 'Users',
  },
  {
    id: 2,
    title: 'Travel Details',
    description: 'Flight and transport information',
    icon: 'Plane',
  },
  {
    id: 3,
    title: 'Accommodation',
    description: 'Hotel or Iqama details',
    icon: 'Home',
  },
  {
    id: 4,
    title: 'Transport',
    description: 'Select transport vehicle (optional)',
    icon: 'Truck',
  },
  {
    id: 5,
    title: 'Movements',
    description: 'Review and edit movement details',
    icon: 'Truck',
  },
  {
    id: 6,
    title: 'Documents',
    description: 'Upload required documents',
    icon: 'FileText',
  },
] as const;

export const API_ENDPOINTS = {
  AIRPORTS: '/location-masters/active?locationType=AIRPORT',
  CITIES: '/city-masters/active',
  TRANSPORT_OPTIONS: '/umrah-visa/transport-options',
  HOTELS: '/umrah-visa/hotels',
  HOTELS_BY_CITY: '/umrah-visa/masters/hotels',
  STEP1: '/umrah-visa/step1',
  STEP2: '/umrah-visa/step2',
  STEP3: '/umrah-visa/step3',
  STEP4: '/umrah-visa/step4',
  LOGOUT: '/auth/logout',
} as const;
