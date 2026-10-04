import { prisma } from '../lib/prisma';
import { generateBookingReference } from './bookingService';
import { combineDateTime } from '../utils/datetime';
import { sendCustomWhatsApp } from './whatsappService';
import { LocationType } from '@prisma/client';

export interface ExternalPassengerInput {
  fullName: string;
  isLeadPassenger?: boolean;
  passportNumber?: string;
  nationality?: string;
  gender?: 'male' | 'female' | 'MALE' | 'FEMALE';
  dateOfBirth?: string; // YYYY-MM-DD
  passportExpiry?: string; // YYYY-MM-DD
  phoneNumber?: string;
  visaNumber?: string;
  mofaNumber?: string;
  borderNumber?: string;
  mutamerStatus?: string;
}

export interface ExternalHotelBookingInput {
  cityId?: string;
  cityCode?: string; // e.g. "MAKKAH", "MADINAH"
  cityName?: string;
  hotelId?: string;
  hotelCode?: string;
  hotelName?: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  bedsQuantity?: number;
  brn?: string;
  isCompanyBrn?: boolean;
}

export interface ExternalIqamaInput {
  iqamaNumber: string;
  iqamaSponserName: string;
  sponserDob: string; // YYYY-MM-DD
  sponserMobileNumber: string;
  sponserNationalShortAddress: string;
  sponserNationality?: string;
  makkahHotelName?: string;
  madinahHotelName?: string;
  makkahBrn?: string;
  madinahBrn?: string;
  isCompanyBrn?: boolean;
}

export interface ExternalTransportMovementInput {
  travelDateTime: string; // ISO string or YYYY-MM-DD HH:mm
  fromCityId?: string;
  fromCityName?: string;
  fromLocationId?: string;
  fromLocationName?: string;
  toCityId?: string;
  toCityName?: string;
  toLocationId?: string;
  toLocationName?: string;
  viabadrOverride?: boolean;
}

export interface ExternalBookingCreateInput {
  partyId?: string;
  partyCode?: string;
  visaType: 'individual_visa' | 'group_visa' | 're_entry';
  bookingMode?: 'group_number' | 'travel_details';
  groupNumber?: string;
  groupName?: string;
  guestName?: string;
  guestMobile?: string;
  umrahVisaProviderId?: string;
  umrahVisaNumber?: string;
  passengerCount?: number;
  passengers: ExternalPassengerInput[];

  // Travel / Flight Details
  arrivalDate?: string; // YYYY-MM-DD
  arrivalTime?: string; // HH:mm
  arrivalDateTime?: string; // ISO or YYYY-MM-DD HH:mm
  arrivalAirportId?: string;
  arrivalAirportCode?: string; // e.g. "JED", "MED", "RUH"
  arrivalFlightNumber?: string;

  departureDate?: string; // YYYY-MM-DD
  departureTime?: string; // HH:mm
  departureDateTime?: string; // ISO or YYYY-MM-DD HH:mm
  departureAirportId?: string;
  departureAirportCode?: string; // e.g. "JED", "MED", "RUH"
  departureFlightNumber?: string;

  isOneWay?: boolean;
  isWithoutTicket?: boolean;
  oneWayContactName?: string;
  oneWayWhatsapp?: string;
  flightBrn?: string;

  // Accommodation
  accommodationType: 'hotel' | 'iqama';
  hotelBookings?: ExternalHotelBookingInput[];
  iqamaDetails?: ExternalIqamaInput;

  // Transport
  hasTransportation?: boolean;
  transportMasterId?: string;
  movements?: ExternalTransportMovementInput[];

  // Attachments / Documents (Optional metadata or URLs)
  documents?: {
    documentType: string;
    fileName: string;
    filePath: string;
    fileSize?: number;
    mimeType?: string;
    passengerPassportNumber?: string;
  }[];

  // Notes & Reference
  externalReference?: string;
  notes?: string;
}

export class ExternalBookingService {
  /**
   * Helper to parse dates safely
   */
  private static parseDate(val?: string | null): Date | null {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Helper to normalize gender
   */
  private static normalizeGender(gender?: string | null): 'male' | 'female' {
    if (!gender) return 'male';
    const lower = gender.toLowerCase().trim();
    return lower === 'female' ? 'female' : 'male';
  }

  /**
   * Resolve Location Master by ID, IATA code, or Name
   */
  public static async resolveLocation(
    identifier?: string,
    type?: LocationType,
    cityId?: string
  ) {
    if (!identifier) return null;
    const clean = identifier.trim();

    // 1. Try finding by exact ID
    let loc = await prisma.locationMaster.findFirst({
      where: {
        id: clean,
        ...(type ? { locationType: type } : {}),
      },
      include: { cityMaster: true, country: true }
    });
    if (loc) return loc;

    // 2. Try finding by Code (case-insensitive)
    loc = await prisma.locationMaster.findFirst({
      where: {
        code: { equals: clean },
        ...(type ? { locationType: type } : {}),
      },
      include: { cityMaster: true, country: true }
    });
    if (loc) return loc;

    // 3. Try finding by Name (case-insensitive)
    const allLocations = await prisma.locationMaster.findMany({
      where: {
        ...(type ? { locationType: type } : {}),
        ...(cityId ? { cityId } : {}),
      },
      include: { cityMaster: true, country: true }
    });

    const lowerClean = clean.toLowerCase();
    loc = allLocations.find(l => 
      l.name.toLowerCase() === lowerClean ||
      l.code.toLowerCase() === lowerClean ||
      l.name.toLowerCase().includes(lowerClean) ||
      lowerClean.includes(l.name.toLowerCase())
    ) || null;

    if (loc) return loc;

    // 4. If type is HOTEL and not found, auto-create the hotel location under the specified or default city
    if (type === 'HOTEL' || !type) {
      const city = cityId 
        ? await prisma.cityMaster.findUnique({ where: { id: cityId }, include: { country: true } })
        : await prisma.cityMaster.findFirst({ where: { name: { contains: 'Makkah' } }, include: { country: true } }) ||
          await prisma.cityMaster.findFirst({ include: { country: true } });

      if (city) {
        const generatedCode = `HTL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        loc = await prisma.locationMaster.create({
          data: {
            code: generatedCode,
            name: clean,
            locationType: 'HOTEL',
            cityId: city.id,
            city: city.name,
            countryId: city.countryId,
            isActive: true,
          },
          include: { cityMaster: true, country: true }
        });
      }
    }

    return loc;
  }

  /**
   * Resolve City Master by ID or Name
   */
  public static async resolveCity(identifier?: string) {
    if (!identifier) return null;
    const clean = identifier.trim();

    // 1. Try by ID
    let city = await prisma.cityMaster.findFirst({
      where: { id: clean },
      include: { country: true }
    });
    if (city) return city;

    // 2. Try by Name (case-insensitive in-memory)
    const allCities = await prisma.cityMaster.findMany({
      include: { country: true }
    });

    const lowerClean = clean.toLowerCase();
    city = allCities.find(c => 
      c.name.toLowerCase() === lowerClean ||
      c.name.toLowerCase().includes(lowerClean) ||
      lowerClean.includes(c.name.toLowerCase())
    ) || null;

    return city;
  }

  /**
   * Comprehensive validation of booking input payload
   */
  public static async validateBookingPayload(
    input: ExternalBookingCreateInput,
    resolvedParty: any,
    isAdmin?: boolean
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate Visa Type
    if (!['individual_visa', 'group_visa', 're_entry'].includes(input.visaType)) {
      errors.push("Invalid visaType. Must be one of 'individual_visa', 'group_visa', 're_entry'.");
    }

    // 2. Validate Passengers
    if (!input.passengers || !Array.isArray(input.passengers) || input.passengers.length === 0) {
      errors.push('At least 1 passenger is required in the passengers array.');
    } else {
      input.passengers.forEach((p, idx) => {
        if (!p.fullName || p.fullName.trim().length === 0) {
          errors.push(`Passenger #${idx + 1}: fullName is required.`);
        }
        if (p.passportNumber && p.passportNumber.trim().length < 4) {
          warnings.push(`Passenger #${idx + 1}: Passport number seems unusually short.`);
        }
      });
    }

    const effectivePaxCount = input.passengerCount || input.passengers?.length || 1;
    if (effectivePaxCount < 1 || effectivePaxCount > 500) {
      errors.push('Passenger count must be between 1 and 500.');
    }

    // 3. Visa Type Specific Validations
    if (input.visaType === 're_entry') {
      if (!input.umrahVisaNumber && !input.groupName) {
        errors.push("For 're_entry' bookings, either umrahVisaNumber or groupName is required.");
      }
    } else if (input.visaType === 'group_visa') {
      if (!input.groupNumber || !input.groupName) {
        errors.push("For 'group_visa' bookings, both groupNumber and groupName are required.");
      }
    } else {
      // Individual
      if (input.bookingMode === 'group_number') {
        if (!input.groupNumber || !input.groupName) {
          errors.push("When bookingMode is 'group_number', both groupNumber and groupName are required.");
        }
      }
    }

    // 4. Duplicate Group Number Check (if groupNumber provided)
    if (input.groupNumber) {
      const existing = await prisma.umrahVisaBooking.findFirst({
        where: {
          groupNumber: input.groupNumber.trim(),
          isDeleted: false,
        },
        include: { party: { select: { partyName: true } } }
      });
      if (existing) {
        errors.push(`Group number '${input.groupNumber}' already exists in system (Agency: ${existing.party?.partyName || 'Other'}).`);
      }
    }

    // 5. Travel & Flight Dates Validation
    let arrivalDateObj: Date | null = null;
    let departureDateObj: Date | null = null;

    if (input.arrivalDateTime) {
      arrivalDateObj = this.parseDate(input.arrivalDateTime);
    } else if (input.arrivalDate) {
      const time = input.arrivalTime || '00:00';
      arrivalDateObj = combineDateTime(input.arrivalDate, time) || null;
    }

    if (input.departureDateTime) {
      departureDateObj = this.parseDate(input.departureDateTime);
    } else if (input.departureDate) {
      const time = input.departureTime || '00:00';
      departureDateObj = combineDateTime(input.departureDate, time) || null;
    }

    if (!input.isWithoutTicket) {
      if (!arrivalDateObj) {
        errors.push('Arrival date/time is required.');
      }
      if (!input.isOneWay && !departureDateObj) {
        errors.push('Departure date/time is required for round-trip travel.');
      }
      if (arrivalDateObj && departureDateObj && !input.isOneWay) {
        if (departureDateObj.getTime() < arrivalDateObj.getTime()) {
          errors.push('Departure date cannot be earlier than arrival date.');
        }
        const diffDays = Math.ceil((departureDateObj.getTime() - arrivalDateObj.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 80) {
          errors.push(`Total duration of stay (${diffDays} days) exceeds the maximum allowed 80 days.`);
        }
      }
    }

    // 6. Ticket Permission Constraints (Skipped for Admins)
    if (!isAdmin) {
      if (input.isOneWay) {
        const allowedOneWay = input.visaType === 're_entry'
          ? (resolvedParty?.allowReEntryOneWayTicket || resolvedParty?.allowOneWayTicket)
          : resolvedParty?.allowOneWayTicket;

        if (!allowedOneWay && resolvedParty) {
          warnings.push('Agency account is not explicitly flagged for one-way ticket authorization. Admin manual review will be required.');
        }
        if (input.accommodationType !== 'iqama') {
          warnings.push('One-way bookings typically require Iqama accommodation.');
        }
      }

      if (input.isWithoutTicket) {
        const allowedWithoutTicket = input.visaType === 're_entry'
          ? (resolvedParty?.allowReEntryWithoutTicket || resolvedParty?.allowWithoutTicket)
          : resolvedParty?.allowWithoutTicket;

        if (!allowedWithoutTicket && resolvedParty) {
          warnings.push('Agency account is not explicitly flagged for travel without tickets. Admin manual review will be required.');
        }
      }
    }

    // 7. Accommodation Validation
    if (!['hotel', 'iqama'].includes(input.accommodationType)) {
      errors.push("Invalid accommodationType. Must be 'hotel' or 'iqama'.");
    }

    if (input.accommodationType === 'hotel') {
      if (!input.hotelBookings || input.hotelBookings.length === 0) {
        errors.push("At least one hotel booking entry is required when accommodationType is 'hotel'.");
      } else {
        input.hotelBookings.forEach((h, idx) => {
          if (!h.hotelId && !h.hotelCode && !h.hotelName) {
            errors.push(`Hotel booking #${idx + 1}: hotelId, hotelCode, or hotelName is required.`);
          }
          if (!h.checkInDate || !h.checkOutDate) {
            errors.push(`Hotel booking #${idx + 1}: checkInDate and checkOutDate are required.`);
          }
        });
      }
    } else if (input.accommodationType === 'iqama') {
      if (!input.iqamaDetails) {
        errors.push("iqamaDetails object is required when accommodationType is 'iqama'.");
      } else {
        const iq = input.iqamaDetails;
        if (!iq.iqamaNumber || iq.iqamaNumber.trim().length < 6) {
          errors.push('iqamaDetails: Valid iqamaNumber is required.');
        }
        if (!iq.iqamaSponserName || iq.iqamaSponserName.trim().length === 0) {
          errors.push('iqamaDetails: iqamaSponserName is required.');
        }
        if (!iq.sponserMobileNumber) {
          errors.push('iqamaDetails: sponserMobileNumber is required.');
        }
      }
      if (effectivePaxCount > 5) {
        errors.push('Maximum 5 passengers allowed per booking with Iqama accommodation.');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Create Booking Request (Transactional & Concurrency Protected)
   */
  public static async createBooking(
    input: ExternalBookingCreateInput,
    party?: any,
    createdByUserId?: string,
    isAdmin?: boolean
  ) {
    // 1. Resolve Target Agency / Party
    let targetParty = party;
    if (isAdmin) {
      if (input.partyId || input.partyCode) {
        const lookup = (input.partyId || input.partyCode)!.trim();
        targetParty = await prisma.party.findFirst({
          where: {
            OR: [
              { id: lookup },
              { partyCode: lookup },
              { partyName: lookup }
            ],
            isCustomer: true
          },
          include: { accountCurrency: true }
        });
        if (!targetParty) {
          throw {
            statusCode: 400,
            message: `Specified partner agency '${lookup}' not found.`,
            code: 'PARTY_NOT_FOUND'
          };
        }
      } else if (!targetParty) {
        // Fallback to direct / system channel
        targetParty = await prisma.party.findFirst({
          where: {
            OR: [
              { partyCode: 'B2C_DIRECT' },
              { isCustomer: true }
            ]
          },
          include: { accountCurrency: true }
        });
      }
    }

    if (!targetParty) {
      throw {
        statusCode: 400,
        message: 'No active partner agency could be resolved for this booking request.',
        code: 'PARTY_REQUIRED'
      };
    }

    // 2. Validate payload
    const validation = await this.validateBookingPayload(input, targetParty, isAdmin);
    if (!validation.valid) {
      throw {
        statusCode: 400,
        message: 'Booking validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    // 3. Pre-fetch and resolve Master records
    const defaultAirport = await prisma.locationMaster.findFirst({
      where: { locationType: 'AIRPORT', isActive: true }
    });

    let arrivalAirport = input.arrivalAirportId || input.arrivalAirportCode
      ? await this.resolveLocation(input.arrivalAirportId || input.arrivalAirportCode, 'AIRPORT')
      : defaultAirport;

    let departureAirport = input.departureAirportId || input.departureAirportCode
      ? await this.resolveLocation(input.departureAirportId || input.departureAirportCode, 'AIRPORT')
      : (input.isOneWay ? arrivalAirport : defaultAirport);

    const arrivalAirportId = arrivalAirport?.id || defaultAirport?.id || '';
    const departureAirportId = departureAirport?.id || arrivalAirportId;

    // Determine initial status:
    // If re_entry or has group number -> 'group_assigned', else 'pending'
    const isReEntry = input.visaType === 're_entry';
    const hasGroupNumber = !!(input.groupNumber && input.groupName);
    const initialStatus: 'pending' | 'group_assigned' = (hasGroupNumber || isReEntry) ? 'group_assigned' : 'pending';

    // Calculate dates
    const arrivalDateStr = input.arrivalDate || (input.arrivalDateTime ? input.arrivalDateTime.split('T')[0] : new Date().toISOString().split('T')[0]);
    const arrivalTimeStr = input.arrivalTime || (input.arrivalDateTime && input.arrivalDateTime.includes('T') ? input.arrivalDateTime.split('T')[1].substring(0, 5) : '00:00');
    const arrivalDateTime = combineDateTime(arrivalDateStr, arrivalTimeStr) || new Date();

    const departureDateStr = input.departureDate || (input.departureDateTime ? input.departureDateTime.split('T')[0] : arrivalDateStr);
    const departureTimeStr = input.departureTime || (input.departureDateTime && input.departureDateTime.includes('T') ? input.departureDateTime.split('T')[1].substring(0, 5) : '00:00');
    const departureDateTime = (input.isWithoutTicket || input.isOneWay)
      ? arrivalDateTime
      : (combineDateTime(departureDateStr, departureTimeStr) || arrivalDateTime);

    const effectivePaxCount = input.passengerCount || input.passengers?.length || 1;
    const leadPassenger = input.passengers.find(p => p.isLeadPassenger) || input.passengers[0];
    const guestName = input.guestName || leadPassenger?.fullName || input.groupName || `Group-${effectivePaxCount}`;
    const guestMobile = input.guestMobile || leadPassenger?.phoneNumber || party?.contactNumber || null;

    // Pre-resolve Hotel Accommodations
    const preparedHotels: {
      hotelId: string;
      cityId: string;
      checkInDate: Date;
      checkOutDate: Date;
      bedsQuantity: number;
      brn?: string[];
      isCompanyBrn: boolean;
    }[] = [];

    if (input.accommodationType === 'hotel' && input.hotelBookings && input.hotelBookings.length > 0) {
      for (const h of input.hotelBookings) {
        const hotel = await this.resolveLocation(h.hotelId || h.hotelCode || h.hotelName, 'HOTEL');
        const city = await this.resolveCity(h.cityId || h.cityCode || h.cityName || hotel?.cityId);

        if (!hotel) {
          throw new Error(`Could not resolve hotel: '${h.hotelName || h.hotelCode || h.hotelId}'`);
        }

        const checkIn = this.parseDate(h.checkInDate) || arrivalDateTime;
        const checkOut = this.parseDate(h.checkOutDate) || departureDateTime;

        preparedHotels.push({
          hotelId: hotel.id,
          cityId: city?.id || hotel.cityId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          bedsQuantity: h.bedsQuantity || effectivePaxCount,
          brn: h.brn ? [h.brn] : undefined,
          isCompanyBrn: !!h.isCompanyBrn,
        });
      }
    }

    // Pre-resolve Movement Details
    const preparedMovements: {
      travelDateTime: Date;
      fromCityId: string;
      fromLocationId: string;
      toCityId: string;
      toLocationId: string;
      viabadrOverride: boolean;
    }[] = [];

    if (input.movements && input.movements.length > 0) {
      for (const m of input.movements) {
        const fromCity = await this.resolveCity(m.fromCityId || m.fromCityName);
        const toCity = await this.resolveCity(m.toCityId || m.toCityName);
        const fromLoc = await this.resolveLocation(m.fromLocationId || m.fromLocationName, undefined, fromCity?.id);
        const toLoc = await this.resolveLocation(m.toLocationId || m.toLocationName, undefined, toCity?.id);

        if (fromCity && toCity && fromLoc && toLoc) {
          preparedMovements.push({
            travelDateTime: this.parseDate(m.travelDateTime) || arrivalDateTime,
            fromCityId: fromCity.id,
            fromLocationId: fromLoc.id,
            toCityId: toCity.id,
            toLocationId: toLoc.id,
            viabadrOverride: !!m.viabadrOverride,
          });
        }
      }
    }

    // 3. Concurrency-safe creation loop
    let createdBooking: any = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const bookingReference = await generateBookingReference();

        createdBooking = await prisma.$transaction(async (tx) => {
          // 3.1 Create Main Booking
          const booking = await tx.umrahVisaBooking.create({
            data: {
              partyId: targetParty.id,
              bookingReference,
              submittedAt: new Date(),
              groupNumber: input.groupNumber?.trim() || null,
              groupName: input.groupName?.trim() || `Grp-${guestName.split(' ')[0]}`,
              guestName,
              guestMobile,
              hasGroupNumber,
              passengerCount: effectivePaxCount,
              umrahVisaProviderId: input.umrahVisaProviderId || null,
              status: initialStatus,
              visaType: input.visaType,
              umrahVisaNumber: input.umrahVisaNumber || (isReEntry ? leadPassenger?.visaNumber : null),
              isCompanyBrn: Boolean(
                input.flightBrn ||
                (input.hotelBookings && input.hotelBookings.some(h => h.isCompanyBrn)) ||
                input.iqamaDetails?.isCompanyBrn
              ),
              isOneWay: !!input.isOneWay,
              isWithoutTicket: !!input.isWithoutTicket,
              oneWayContactName: input.isOneWay ? (input.oneWayContactName || guestName) : null,
              oneWayWhatsapp: input.isOneWay ? (input.oneWayWhatsapp || guestMobile) : null,
              accommodationType: input.accommodationType,
              hasTransportation: !!(input.hasTransportation || (preparedMovements.length > 0)),
              lastUpdatedBy: createdByUserId || targetParty.userId || null,
            },
          });

          // 3.2 Create Passengers
          await Promise.all(
            input.passengers.map(async (p, idx) => {
              return tx.umrahPassenger.create({
                data: {
                  bookingId: booking.id,
                  isLeadPassenger: p.isLeadPassenger !== undefined ? p.isLeadPassenger : idx === 0,
                  fullName: p.fullName.trim(),
                  nationality: p.nationality || 'IN',
                  passportNumber: p.passportNumber?.trim() || null,
                  gender: this.normalizeGender(p.gender),
                  dateOfBirth: this.parseDate(p.dateOfBirth),
                  passportExpiry: this.parseDate(p.passportExpiry),
                  phoneNumber: p.phoneNumber || null,
                  visaNumber: p.visaNumber || null,
                  mofaNumber: p.mofaNumber || null,
                  borderNumber: p.borderNumber || null,
                  mutamerStatus: p.mutamerStatus || null,
                }
              });
            })
          );

          // 3.3 Create Travel Details
          await tx.umrahTravelDetails.create({
            data: {
              bookingId: booking.id,
              arrivalDateTime,
              arrivalAirportId,
              arrivalFlightNumber: input.isWithoutTicket ? 'NT-0000' : (input.arrivalFlightNumber || 'SV-000'),
              departureDateTime,
              departureAirportId,
              departureFlightNumber: input.isWithoutTicket ? 'NT-0000' : (input.isOneWay ? 'OW-9999' : (input.departureFlightNumber || 'SV-001')),
              brn: input.flightBrn || null,
            }
          });

          // 3.4 Create Hotel Accommodations
          if (preparedHotels.length > 0) {
            for (const h of preparedHotels) {
              await tx.umrahHotelBooking.create({
                data: {
                  bookingId: booking.id,
                  hotelId: h.hotelId,
                  cityId: h.cityId,
                  checkInDate: h.checkInDate,
                  checkOutDate: h.checkOutDate,
                  bedsQuantity: h.bedsQuantity,
                  brn: h.brn,
                  isCompanyBrn: h.isCompanyBrn,
                }
              });
            }
          }

          // 3.5 Create Iqama Details
          if (input.accommodationType === 'iqama' && input.iqamaDetails) {
            const iq = input.iqamaDetails;
            await tx.umrahSponserIqamaDetails.create({
              data: {
                bookingId: booking.id,
                iqamaNumber: iq.iqamaNumber.trim(),
                iqamaSponserName: iq.iqamaSponserName.trim(),
                sponserDob: this.parseDate(iq.sponserDob) || new Date('1990-01-01'),
                sponserMobileNumber: iq.sponserMobileNumber.trim(),
                sponserNationalShortAddress: iq.sponserNationalShortAddress || 'KSA',
                sponserNationality: iq.sponserNationality || 'India',
                makkahHotelName: iq.makkahHotelName || null,
                madinahHotelName: iq.madinahHotelName || null,
                makkahBrn: iq.makkahBrn || null,
                madinahBrn: iq.madinahBrn || null,
                isCompanyBrn: !!iq.isCompanyBrn,
              }
            });
          }

          // 3.6 Create Transport & Movement Details
          if (preparedMovements.length > 0) {
            for (const m of preparedMovements) {
              await tx.umrahMovementDetail.create({
                data: {
                  bookingId: booking.id,
                  travelDateTime: m.travelDateTime,
                  fromCityId: m.fromCityId,
                  fromLocationId: m.fromLocationId,
                  toCityId: m.toCityId,
                  toLocationId: m.toLocationId,
                  viabadrOverride: m.viabadrOverride,
                }
              });
            }
          }

          // 3.7 Record Status History & Audit Log
          await tx.bookingStatusHistory.create({
            data: {
              bookingId: booking.id,
              oldStatus: null,
              newStatus: initialStatus,
              changedBy: createdByUserId || targetParty.userId || 'api-system',
              reason: `Booking request created via ${isAdmin ? 'Admin / System External API' : 'Partner Agency API'} (Ref: ${bookingReference})`,
            }
          });

          return booking;
        }, {
          timeout: 30000,
          maxWait: 10000
        });

        break; // Successfully created
      } catch (err: any) {
        attempts++;
        if (err.code === 'P2002' && err.meta?.target?.includes('booking_reference')) {
          console.warn(`[CONCURRENCY RETRY] Booking reference collision on attempt ${attempts}, regenerating...`);
          if (attempts >= maxAttempts) throw new Error('Failed to generate unique booking reference after multiple retries.');
        } else {
          throw err;
        }
      }
    }

    // 4. Fetch the full created booking with all relations
    const fullBooking = await this.getBookingByIdOrReference(createdBooking.id);
    if (!fullBooking) {
      throw new Error('Booking created but failed to load complete details.');
    }

    // 5. Fire asynchronous notifications
    try {
      const notifyMsg = `*NuSync ERP - New Booking Request*\n\n` +
        `*Reference:* ${fullBooking.bookingReference}\n` +
        `*Agency:* ${targetParty.partyName}\n` +
        `*Visa Type:* ${fullBooking.visaType}\n` +
        `*Pax Count:* ${fullBooking.passengerCount}\n` +
        `*Guest:* ${fullBooking.guestName}\n` +
        `*Status:* ${fullBooking.status}\n` +
        `*Submitted At:* ${new Date().toLocaleString()}`;

      if (targetParty.whatsappNumber) {
        sendCustomWhatsApp(targetParty.whatsappNumber, notifyMsg).catch(() => {});
      }
    } catch (e) {
      // Non-blocking notification
    }

    return fullBooking;
  }

  /**
   * Get single booking details with full relation graph
   */
  public static async getBookingByIdOrReference(idOrRef: string, partyIdFilter?: string) {
    const clean = idOrRef.trim();

    const booking = await prisma.umrahVisaBooking.findFirst({
      where: {
        OR: [
          { id: clean },
          { bookingReference: clean },
          { groupNumber: clean }
        ],
        isDeleted: false,
        ...(partyIdFilter ? { partyId: partyIdFilter } : {})
      },
      include: {
        party: {
          select: {
            id: true,
            partyCode: true,
            partyName: true,
            email: true,
            contactNumber: true
          }
        },
        umrahVisaProvider: {
          select: {
            id: true,
            partyCode: true,
            partyName: true
          }
        },
        passengers: {
          where: { isDeleted: false },
          orderBy: { isLeadPassenger: 'desc' },
          include: {
            documents: { where: { isDeleted: false } }
          }
        },
        travelDetails: {
          where: { isAlternate: false },
          include: {
            arrivalAirport: {
              include: { cityMaster: true }
            },
            departureAirport: {
              include: { cityMaster: true }
            }
          }
        },
        hotelBookings: {
          where: { isAlternate: false },
          include: {
            hotel: true,
            city: true
          }
        },
        sponsorIqamaDetails: {
          where: { isAlternate: false }
        },
        transportBookings: {
          where: { isAlternate: false },
          include: {
            transportMaster: {
              include: {
                vehicleType: true,
                route: true
              }
            }
          }
        },
        movementDetails: {
          where: { isAlternate: false },
          include: {
            fromCity: true,
            toCity: true,
            fromLocation: true,
            toLocation: true
          }
        },
        vouchers: {
          select: {
            id: true,
            voucherNumber: true,
            reservationDate: true
          }
        },
        documents: {
          where: { isDeleted: false }
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 10
        }
      }
    });

    return booking;
  }

  /**
   * List bookings for an authenticated partner
   */
  public static async listBookings(params: {
    partyId?: string;
    status?: string;
    visaType?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (params.partyId) {
      where.partyId = params.partyId;
    }

    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }

    if (params.visaType && params.visaType !== 'all') {
      where.visaType = params.visaType;
    }

    if (params.fromDate || params.toDate) {
      where.submittedAt = {};
      if (params.fromDate) where.submittedAt.gte = new Date(params.fromDate);
      if (params.toDate) where.submittedAt.lte = new Date(params.toDate);
    }

    if (params.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      where.OR = [
        { bookingReference: { contains: q } },
        { groupNumber: { contains: q } },
        { groupName: { contains: q } },
        { guestName: { contains: q } },
        { guestMobile: { contains: q } },
        { umrahVisaNumber: { contains: q } },
        { passengers: { some: { passportNumber: { contains: q } } } },
        { passengers: { some: { fullName: { contains: q } } } },
      ];
    }

    const [total, bookings] = await Promise.all([
      prisma.umrahVisaBooking.count({ where }),
      prisma.umrahVisaBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          party: {
            select: {
              id: true,
              partyCode: true,
              partyName: true
            }
          },
          passengers: {
            where: { isDeleted: false, isLeadPassenger: true },
            take: 1
          },
          travelDetails: {
            where: { isAlternate: false },
            take: 1,
            include: {
              arrivalAirport: { select: { name: true, code: true } },
              departureAirport: { select: { name: true, code: true } }
            }
          },
          vouchers: {
            select: { voucherNumber: true },
            take: 1
          }
        }
      })
    ]);

    return {
      data: bookings,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  /**
   * Master lookup for external developer integration
   */
  public static async getMasterLookups() {
    const [airports, hotels, cities, transportRoutes, visaProviders] = await Promise.all([
      prisma.locationMaster.findMany({
        where: { locationType: 'AIRPORT', isActive: true },
        select: { id: true, code: true, name: true, city: true }
      }),
      prisma.locationMaster.findMany({
        where: { locationType: 'HOTEL', isActive: true },
        select: { id: true, code: true, name: true, city: true, cityId: true }
      }),
      prisma.cityMaster.findMany({
        where: { isActive: true },
        select: { id: true, name: true, countryId: true }
      }),
      prisma.transportRouteMaster.findMany({
        where: { isActive: true },
        include: {
          city1: { select: { name: true } },
          city2: { select: { name: true } },
          transports: {
            include: { vehicleType: true }
          }
        }
      }),
      prisma.party.findMany({
        where: { isSupplier: true },
        select: { id: true, partyCode: true, partyName: true }
      })
    ]);

    return {
      airports,
      hotels,
      cities,
      transportRoutes,
      visaProviders
    };
  }
}
