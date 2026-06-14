import { Request } from 'express';
import { 
  User, 
  Party, 
  Document, 
  RefreshToken,
  CurrencyMaster,
  CityMaster,
  LocationMaster,
  UserRole,
  CustomerType,
  AccountCurrency,
  UmrahVisaStatus,
  VisaType,
  Gender,
  LocationType
} from '@prisma/client';

// Re-export Prisma types for convenience (Updated for cleanup)
export type { 
  User, 
  Party, 
  Document, 
  RefreshToken,
  CurrencyMaster,
  CityMaster,
  LocationMaster,
  UserRole,
  CustomerType,
  AccountCurrency,
  UmrahVisaStatus,
  VisaType,
  Gender,
  LocationType
};


export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    partyId?: string | null;
  };
}

// Umrah Visa Booking Types (New Step-by-Step Workflow)
export type AccommodationType = 'hotel' | 'iqama';

// Step 1: Group Details + Basic Info
export interface Step1Data {
  hasGroupNumber: boolean;
  groupNumber?: string;
  groupName?: string;
  passengerCount: number;
}

// Step 2: Travel Details (Both arrival and departure required)
export interface Step2Data {
  arrivalDate: string;
  arrivalAirportId: string;
  arrivalFlightNumber: string;
  departureDate: string;
  departureAirportId: string;
  departureFlightNumber: string;
  transportBookings?: Array<{
    fromLocationId: string;
    toLocationId: string;
    vehicleType: string;
    paxCount: number;
    price: number;
    travelDate?: string;
  }>;
}

// Step 3: Accommodation Details (Simplified - no roomCount/guestCount)
export interface Step3Data {
  accommodationType: AccommodationType;
  iqamaDetails?: {
    iqamaNumber?: string;
    iqamaName?: string;
    iqamaDob?: string;
    iqamaMobile?: string;
  };
  hotelBookings?: Array<{
    locationId: string;
    hotelId: string;
    checkInDate: string;
    checkOutDate: string;
  }>;
}

// Step 4: Passenger Details (Simplified)
export interface Step4Data {
  passengers: Array<{
    fullName: string;
    isLeadPassenger: boolean;
  }>;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  partyId?: string | null;
}

// User Management Types
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  is_active?: boolean;
}

// Currency Master Types
export interface CreateCurrencyMasterRequest {
  currencyCode: string;
  currencyName: string;
  symbol: string;
}

export interface UpdateCurrencyMasterRequest {
  currencyCode?: string;
  currencyName?: string;
  symbol?: string;
  isActive?: boolean;
}


// City Master Types
export interface CreateCityMasterRequest {
  name: string;
  countryId: string;
  isActive?: boolean;
}

export interface UpdateCityMasterRequest {
  name?: string;
  countryId?: string;
  isActive?: boolean;
}

// Location Master Types
export interface CreateLocationMasterRequest {
  code: string;
  name: string;
  locationType: LocationType;
  countryId: string;
  cityId: string;
  city: string;
  isActive?: boolean;
}

export interface UpdateLocationMasterRequest {
  code?: string;
  name?: string;
  locationType?: LocationType;
  countryId?: string;
  cityId?: string;
  city?: string;
  isActive?: boolean;
}

// Transport Route Master Types
export type RouteType = 'airporttocity' | 'citytoairport' | 'tripandtour' | 'fulltrip';

export interface TransportRouteMaster {
  id: string;
  city1Id: string;
  city2Id: string;
  city3Id?: string | null;
  city4Id?: string | null;
  routeType: RouteType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  city1?: {
    id: string;
    name: string;
  };
  city2?: {
    id: string;
    name: string;
  };
  city3?: {
    id: string;
    name: string;
  } | null;
  city4?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateTransportRouteMasterRequest {
  city1Id: string;
  city2Id: string;
  city3Id?: string | null;
  city4Id?: string | null;
  routeType: RouteType;
  isActive?: boolean;
}

export interface UpdateTransportRouteMasterRequest {
  city1Id?: string;
  city2Id?: string;
  city3Id?: string | null;
  city4Id?: string | null;
  routeType?: RouteType;
  isActive?: boolean;
}

// Transport Master Types
export interface TransportMaster {
  id: string;
  routeId: string;
  vehicleTypeId: string;
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  route?: TransportRouteMaster;
  vehicleType?: {
    id: string;
    vehicleName: string;
    paxCount: number;
  };
}

export interface CreateTransportMasterRequest {
  routeId: string;
  vehicleTypeId: string;
  price: number;
  isActive?: boolean;
}

export interface UpdateTransportMasterRequest {
  routeId?: string;
  vehicleTypeId?: string;
  price?: number;
  isActive?: boolean;
}

// Umrah Movement Detail Types
export interface UmrahMovementDetail {
  id: string;
  bookingId: string;
  routeNumber?: string;
  travelDateTime: Date;
  fromCityId: string;
  fromLocationId: string;
  toCityId: string;
  toLocationId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Umrah Visa Booking Request Types
export interface CreateUmrahVisaBookingRequest {
  partyId: string;
  groupNumber?: string;
  groupName?: string;
  passengerCount: number;
  accommodationType?: AccommodationType;
  travelDetails?: {
    arrivalDate: string;
    arrivalTime: string;
    arrivalAirportId: string;
    arrivalFlightNumber: string;
    departureDate: string;
    departureTime: string;
    departureAirportId: string;
    departureFlightNumber: string;
  };
  accommodationDetails?: {
    iqamaNumber?: string;
    iqamaName?: string;
    iqamaDob?: string;
    iqamaMobile?: string;
    iqamaNationalShortAddress?: string;
    hotelBookings?: Array<{
      locationId: string;
      hotelId: string;
      checkInDate: string;
      checkOutDate: string;
    }>;
  };
  transportBookings?: Array<{
    fromLocationId: string;
    toLocationId: string;
    vehicleType: string;
    paxCount: number;
    price: number;
    travelDate?: string;
  }>;
  passengers?: Array<{
    fullName: string;
    isLeadPassenger: boolean;
  }>;
}
