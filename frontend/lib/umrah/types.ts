// Umrah Visa Booking Types

export interface Step1Data {
  bookingMode: 'group_number' | 'travel_details';
  groupNumber?: string;
  groupName?: string;
  passengerCount?: number; // Required when bookingMode is 'group_number'
  umrahVisaProviderId?: string;
  visaType?: 'individual_visa' | 'group_visa' | 're_entry';
}

export interface Step2Data {
  arrivalDate: string;
  arrivalTime: string;
  arrivalAirportId: string;
  arrivalFlightNumber: string;
  departureDate: string;
  departureTime: string;
  departureAirportId: string;
  departureFlightNumber: string;
  passengerCount?: number; // Number of passengers (for both individual and group bookings)
  transportBookings?: TransportBooking[];
  hotelBookings?: HotelBooking[]; // For group bookings, hotels are in Step 2
  isOneWay?: boolean;
  isWithoutTicket?: boolean;
  oneWayContactName?: string;
  oneWayWhatsapp?: string;
}

// Unified Movement interface - replaces transportSegments and ziyaraths
export interface Movement {
  id: string; // Unique ID for this movement
  type: 'transport' | 'ziyarath';
  fromLocationId: string; // LocationMaster ID (hotel/airport/ziyarath)
  toLocationId: string; // LocationMaster ID
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  paxCount?: number;
  price?: number;
  viabadrOverride?: boolean; // If true, display/store "Viabadr" instead of "Madinah" for toLocation city
}

export interface Step3Data {
  // For group bookings: transport vehicle selection (Step 3 is transport selection)
  selectedTransport?: {
    routeId: string;
    transportId: string;
    vehicleTypeId: string;
    price: number;
  };
  selectedTransports?: Array<{
    routeId: string;
    transportId: string;
    vehicleTypeId: string;
    price: number;
    quantity: number;
  }>;
  // For individual bookings: accommodation details
  accommodationType?: 'hotel' | 'iqama';
  iqamaDetails?: IqamaDetails;
  hotelBookings?: HotelBooking[];
  // OLD: Kept for backward compatibility during migration
  movements?: Movement[];
  transportSegments?: TransportBooking[];
  ziyarah?: ZiyarahBooking[];
  ziyaraths?: Array<{
    id: string;
    ziyarathId: string;
    date: string;
    time: string;
  }>;
}

export interface Step4Data {
  // For group bookings: movements array (Step 4 is movement details)
  movements?: Movement[];
  // For individual bookings: transport selection (backward compatibility)
  selectedTransport?: {
    routeId: string;
    transportId: string;
    vehicleTypeId: string;
    price: number;
  };
  selectedTransports?: Array<{
    routeId: string;
    transportId: string;
    vehicleTypeId: string;
    price: number;
    quantity: number; // Number of vehicles of this type
  }>;
}

export interface Step5Data {
  // For individual bookings: movements array (Step 5 is movement details)
  movements?: Movement[];
  // For group bookings: documents (backward compatibility)
  passengers?: Passenger[]; // Optional - not used for individual/group bookings (backend creates from passengerCount)
  panCardZipFile?: File | null; // ZIP file containing all required documents
  documents?: File[]; // Multiple files (new feature)
}

export interface Step6Data {
  // For individual bookings: documents (Step 6 is documents)
  panCardZipFile?: File | null; // ZIP file containing all required documents
  documents?: File[]; // Multiple files
  passportCopies?: File[];
  passengerPhotos?: File[];
  panCardCopies?: File[];
  iqamaCopies?: File[];
  onwardTickets?: File[];
  returnTickets?: File[];
  nationalAddresses?: File[];
  passportNumbers?: string[];
  onwardTicketConfirmed?: boolean;
  returnTicketConfirmed?: boolean;
  umrahVisaNumber?: string;
  umrahVisaCopies?: File[];
  nusukBookingCopies?: File[];
}

export interface TransportBooking {
  fromLocationId: string;
  toLocationId: string;
  fromHotelId?: string; // HotelMaster ID (can be hotel, ziyarah, or empty for airport)
  toHotelId?: string; // HotelMaster ID (can be hotel, ziyarah, or empty for airport)
  vehicleType?: string; // Optional - not required anymore
  paxCount: number;
  price: number;
  travelDate?: string;
  travelTime?: string;
}

export interface HotelBooking {
  id?: string;
  cityId: string;
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  brn?: string[];
  cateringBrn?: string[];
  bedsQuantity?: number | null;
  additionalBrns?: {
    brnNumber: string;
    qty?: number;
    checkInDate: string;
    checkOutDate: string;
  }[];
}

export interface IqamaDetails {
  iqamaNumber?: string;
  iqamaName?: string;
  iqamaDob?: string;
  iqamaMobile?: string;
  iqamaNationalShortAddress?: string;
}

export interface Passenger {
  fullName: string;
  isLeadPassenger: boolean;
  panCardPhoto?: File | null;
  passportFront?: File | null;
  passportBack?: File | null;
  iqamaPhoto?: File | null;
  hotelBooking?: File | null;
  ticketCopy?: File | null;
}

export interface Airport {
  id: string;
  airportCode: string;
  airportName: string;
}

export interface Location {
  id: string;
  destinationName: string;
  city?: string;
}

export interface Hotel {
  id: string;
  name: string;
  hotelName?: string; // For backward compatibility
  code?: string;
  cityId?: string;
  city?: {
    id: string;
    name: string;
  };
}

export interface TransportOption {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  vehicleType: string;
  paxCount: number;
  price: number;
  fromLocation: Location;
  toLocation: Location;
}

export interface BookingState {
  currentStep: number;
  completedSteps: number[];
  bookingId: string | null;
  step1Data: Step1Data;
  step2Data: Step2Data;
  step3Data: Step3Data;
  step4Data: Step4Data;
  step5Data: Step5Data;
  step6Data?: Step6Data; // For individual bookings: documents (Step 6)
}

export interface ZiyarahBooking {
  city: 'Makkah' | 'Madinah';
  date: string;
  time: string;
}

export interface LocationMaster {
  id: string;
  code: string;
  name: string;
  locationType: 'AIRPORT' | 'DESTINATION' | 'ZIYARAT' | 'HOTEL' | 'OTHERS';
  city: string;
  country?: {
    id: string;
    countryCode: string;
    countryName: string;
  };
  cityMaster?: {
    id: string;
    name: string;
  };
}

export interface UmrahVisaMaster {
  id: string;
  lastArrivalDate: string; // YYYY-MM-DD
  lastDepartureDate: string; // YYYY-MM-DD
  isActive: boolean;
}

export interface MasterData {
  airports: Airport[];
  locations: Location[];
  hotels: Hotel[];
  transportOptions: TransportOption[];
  hotelsByLocation: { [locationId: string]: Hotel[] };
  locationMasters: LocationMaster[];
  umrahVisaMaster?: UmrahVisaMaster;
}
