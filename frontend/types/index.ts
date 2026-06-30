// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'party';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// User Management Types (using existing User model)
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'staff' | 'party';
  is_active?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'staff' | 'party';
  is_active?: boolean;
}

// Party Types
export interface Party {
  id: string;
  partyCode?: string;
  partyName: string;
  email: string;
  contactNumber?: string;
  whatsappNumber?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  supplierServiceTypes?: string[];
  customerType: 'direct' | 'b2b';
  accountCurrencyId: string;
  accountCurrency?: CurrencyMaster;
  isSupplier: boolean;
  isCustomer: boolean;
  loginRequired: boolean;
  emailNotification: boolean;
  smsNotification: boolean;
  marketingNotification: boolean;
  logoPath?: string;
  nusukEntityId?: string;
  nusukActiveEntityId?: string;
  nusukActiveEntityTypeId?: string;
  userId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  contacts?: PartyContact[];
  documents?: PartyDocument[];
  complianceMetrics?: SubAgentMetric;
}

export interface SubAgentMetric {
  subAgentId: string;
  totalArrivals: number;
  totalDepartures: number;
  arrivalMismatches: number;
  departureMismatches: number;
  severeViolations: number;
  weightedScore: number;
  complianceStatus: 'GREEN' | 'YELLOW' | 'RED';
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceAuditLog {
  id: string;
  subAgentId: string;
  previousStatus: 'GREEN' | 'YELLOW' | 'RED';
  newStatus: 'GREEN' | 'YELLOW' | 'RED';
  reasonSummary: string;
  createdAt: string;
}

export interface CreatePartyRequest {
  party_name: string;
  party_code?: string;
  email: string;
  contact_number?: string;
  whatsapp_number?: string;
  address?: string;
  gst_number?: string;
  pan_number?: string;
  aadhaar_number?: string;
  supplier_service_types?: string[];
  contacts?: CreatePartyContactRequest[];
  customer_type?: 'direct' | 'b2b' | '';
  account_currency_id: string;
  is_supplier?: boolean;
  is_customer?: boolean;
  login_required?: boolean;
  email_notification?: boolean;
  sms_notification?: boolean;
  marketing_notification?: boolean;
  logo_path?: string;
}

export interface PartyContact {
  id: string;
  partyId: string;
  contactName: string;
  contactNumber: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartyContactRequest {
  contact_name: string;
  contact_number: string;
  department?: string;
}

export interface UpdatePartyContactRequest {
  contact_name?: string;
  contact_number?: string;
  department?: string;
}

export type PartyDocumentType = 'gst_certificate' | 'pan_card' | 'aadhaar_card' | 'logo' | 'other';

export interface PartyDocument {
  id: string;
  partyId: string;
  documentType: PartyDocumentType;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
}

// Umrah Visa Status Type
export type UmrahVisaStatus = 
  | 'pending'
  | 'documents_downloaded' 
  | 'group_assigned' 
  | 'voucher'
  | 'bill'
  | 'booking_success' 
  | 'cancelled';

// Visa Type
export type VisaType = 'individual_visa' | 'group_visa';
export type TripStatus = 'pending' | 'hosting' | 'completed';

export interface UmrahVisaDetails {
  id?: string;
  fullName: string;
  passportNumber: string;
  nationality: string;
  travelDateFrom: string;
  travelDateTo: string;
  passportExpiry: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  phoneNumber?: string;
  status?: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed';
  partyName?: string;
  createdAt?: string;
  updatedAt?: string;
}

// New Umrah Visa Booking Types
export type BookingMode = 'group_number' | 'travel_documents';
export type AccommodationType = 'hotel' | 'iqama';

export interface UmrahPassenger {
  id?: string;
  bookingId?: string;
  isLeadPassenger: boolean;
  fullName: string;
  passportNumber: string;
  nationality: string;
  passportExpiry: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  phoneNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UmrahVisaBooking {
  id: string;
  partyId?: string;
  submittedAt?: string;
  bookingMode: BookingMode;
  bookingReference?: string;
  groupNumber?: string;
  groupName?: string;
  hasGroupNumber?: boolean;
  umrahVisaProviderId?: string;
  flightNumber: string;
  arrivalDate: string;
  departureDate: string;
  arrivalAirport: string;
  transportRoute?: string;
  transportType?: string;
  transportPax?: number;
  transportPrice?: number;
  accommodationType: AccommodationType;
  visaType?: VisaType;
  makkahCheckIn?: string;
  makkahCheckOut?: string;
  madinaCheckIn?: string;
  madinaCheckOut?: string;
  iqamaNumber?: string;
  iqamaName?: string;
  iqamaDob?: string;
  iqamaMobile?: string;
  iqamaNationalShortAddress?: string;
  passengerCount: number;
  status?: UmrahVisaStatus;
  tripStatus?: TripStatus;
  passengers?: UmrahPassenger[];
  documentsDownloadCount?: number;
  documentsDownloadedBy?: string;
  lastUpdatedBy?: string;
  party?: Party;
  documents?: Document[];
  createdAt?: string;
  updatedAt?: string;
  lastUpdatedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  documentsDownloadedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  travelDetails?: Array<{
    id?: string;
    isAlternate?: boolean;
    arrivalDateTime?: string;
    departureDateTime?: string;
    arrivalFlightNumber?: string;
    departureFlightNumber?: string;
    arrivalAirport?: {
      id: string;
      name: string;
      code: string;
    };
    departureAirport?: {
      id: string;
      name: string;
      code: string;
    };
  }>;
  sponsorIqamaDetails?: Array<{
    id?: string;
    isAlternate?: boolean;
    iqamaNumber?: string;
    iqamaSponserName?: string;
    sponserDob?: string;
    sponserMobileNumber?: string;
    sponserNationalShortAddress?: string;
    makkahHotelName?: string;
    makkahBrn?: string;
    madinahHotelName?: string;
    madinahBrn?: string;
    confirmationImagePath?: string;
    confirmationUploadedAt?: string;
  }>;
  hotelBookings?: Array<{
    id: string;
    isAlternate?: boolean;
    hotelId: string;
    locationId: string;
    checkIn: string;
    checkOut: string;
    brn?: any;
    checkInDate?: string;
    checkOutDate?: string;
    hotel?: {
      id: string;
      name?: string;
      hotelName?: string;
    };
    location?: {
      id: string;
      name?: string;
      locationName?: string;
    };
    city?: {
      id: string;
      name: string;
    };
  }>;
  transportBookings?: Array<{
    id: string;
    isAlternate?: boolean;
    transportMasterId: string;
    travelDateTime?: string;
    transportMaster?: TransportMaster;
  }>;
  movementDetails?: Array<{
    id: string;
    isAlternate?: boolean;
    travelDateTime: string;
    fromCityId: string;
    fromLocationId: string;
    toCityId: string;
    toLocationId: string;
    fromCity?: { name: string };
    fromLocation?: { name: string };
    toCity?: { name: string };
    toLocation?: { name: string };
  }>;
  umrahVisaProvider?: {
    id: string;
    partyName: string;
    email?: string;
  };
  hasMultipleGroup?: boolean;
  multipleGroupDetails?: Array<{
    groupNumber?: string;
    groupName?: string;
    passengerCount?: number;
    documentId?: string | null;
  }>;
  // Computed fields added during mapping in some views
  makkahHotelName?: string;
  makkahBrn?: string;
  madinahHotelName?: string;
  madinahBrn?: string;
  flightBrn?: string;
}


// Available Actions Type
export interface AvailableAction {
  action: string;
  label: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  warning?: string | null;
  disabled?: boolean;
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  reservationDate: string;
  guestName: string;
  guestMobile?: string;
  groupCode?: string;
  paxCount: number;
  version: number;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
  generatedByUser?: {
    name: string;
  };
  umrahCompany?: {
    partyName: string;
  };
  transportCompany?: {
    partyName: string;
  };
}

export interface Movement {
  voucherId: string;
  voucherNumber: string;
  movementIndex: number;
  movementId: string;
  routeNumber: string;
  date: string;
  time: string;
  agentName: string;
  guestName: string;
  mobile: string;
  pax: number;
  from: string;
  fromLocation: string;
  fromLocationId: string | null;
  to: string;
  toLocation: string;
  toLocationId: string | null;
  driverDetails1: string;
  driverDetails2: string;
  vehicleNumber: string;
  partyEmail: string;
  partyWhatsApp: string;
}

export interface AvailableActionsResponse {
  bookingId: string;
  currentStatus: UmrahVisaStatus;
  availableActions: AvailableAction[];
  tripInfo?: any; // TripInfo was removed, keeping for backward compatibility
}

export interface CreateUmrahVisaBookingRequest {
  party_id: string;
  booking_mode: BookingMode;
  group_number?: string;
  group_name?: string;
  flight_number: string;
  arrival_date: string;
  departure_date: string;
  arrival_airport: string;
  transport_route?: string;
  transport_type?: string;
  transport_pax?: number;
  accommodation_type: AccommodationType;
  makkah_checkin?: string;
  makkah_checkout?: string;
  madina_checkin?: string;
  madina_checkout?: string;
  iqama_number?: string;
  iqama_name?: string;
  iqama_dob?: string;
  iqama_mobile?: string;
  passenger_count: number;
  passengers: CreateUmrahPassengerRequest[];
}

export interface CreateUmrahPassengerRequest {
  is_lead_passenger: boolean;
  full_name: string;
  passport_number: string;
  nationality: string;
  passport_expiry: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  phone_number?: string;
}


// Document Types
export interface Document {
  id: string;
  bookingId: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalParties: number;
  totalServices: number;
  pendingServices: number;
  completedServices?: number;
}

// Vehicle Type Master Types
export interface VehicleTypeMaster {
  id: string;
  vehicleName: string;
  paxCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleTypeMasterRequest {
  vehicleName: string;
  paxCount: number;
  isActive?: boolean;
}

export interface UpdateVehicleTypeMasterRequest {
  vehicleName?: string;
  paxCount?: number;
  isActive?: boolean;
}

export interface CountryMaster {
  id: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCountryMasterRequest {
  countryCode: string;
  countryName: string;
  currencyCode: string;
}

export interface UpdateCountryMasterRequest {
  countryCode?: string;
  countryName?: string;
  currencyCode?: string;
  isActive?: boolean;
}

export interface CurrencyMaster {
  id: string;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  exchangeRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCurrencyMasterRequest {
  currencyCode: string;
  currencyName: string;
  symbol: string;
  exchangeRate?: number;
}

export interface UpdateCurrencyMasterRequest {
  currencyCode?: string;
  currencyName?: string;
  symbol?: string;
  exchangeRate?: number;
  isActive?: boolean;
}

// City Master Types
export interface CityMaster {
  id: string;
  name: string;
  countryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  country?: {
    id: string;
    countryCode: string;
    countryName: string;
  };
}

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
export type LocationType = 'HOTEL' | 'AIRPORT' | 'ZIYARAT' | 'OTHERS';

export interface LocationMaster {
  id: string;
  code: string;
  name: string;
  locationType: LocationType;
  countryId: string;
  cityId: string;
  city: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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


// User Role Master Types
export interface UserRoleMaster {
  id: string;
  roleCode: string;
  roleName: string;
  permissions: string[];
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRoleMasterRequest {
  roleCode: string;
  roleName: string;
  permissions: string[];
  description?: string;
}

export interface UpdateUserRoleMasterRequest {
  roleCode?: string;
  roleName?: string;
  permissions?: string[];
  description?: string;
  isActive?: boolean;
}

// Transport Route Master Types
export type RouteType = 'citytocity' | 'airporttocity' | 'citytoairport' | 'tripandtour' | 'fulltrip';

export interface TransportRouteMaster {
  id: string;
  city1Id: string;
  city2Id: string;
  city3Id?: string | null;
  city4Id?: string | null;
  routeType: RouteType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
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

// API Error
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}
