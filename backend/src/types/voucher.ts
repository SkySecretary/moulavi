
export interface VoucherPdfData {
  voucherNumber: string;
  reservationNumber?: string;
  reservationDate: string;
  guestName: string;
  guestMobile: string;
  groupCode: string;
  groupName?: string;
  paxCount: number;
  vehicleType?: string; // Type of vehicle for the trip
  umrahCompany?: {
    partyName: string;
    address?: string;
    contactNumber?: string;
    whatsappNumber?: string;
    email?: string;
    logoPath?: string;
  } | null;
  agentParty?: {
    partyName: string;
  } | null;
  transportCompany?: {
    partyName: string;
  } | null;
  hotelSchedules: Array<{
    number: number;
    location: string;
    hotelName: string;
    days: number;
    checkIn: string;
    checkOut: string;
    brn?: string[] | null;
  }>;
  movementDetails: Array<{
    sr: number;
    route: string;
    date: string;
    time: string;
    from: string;
    fromLocation: string;
    to: string;
    toLocation: string;
    viaBdr?: boolean; // If true, display "VIA BDR" in the row
    vehicleType?: string; // Optional per-movement vehicle type
  }>;
  flightDetails: Array<{
    type: string;
    date: string;
    carrier: string;
    number: string;
    from: string;
    to: string;
    arrivalAirport?: string;
    departureAirport?: string;
    etd: string;
    eta: string;
  }>;
}
