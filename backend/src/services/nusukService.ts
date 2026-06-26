import { prisma } from '../lib/prisma';
import axios from 'axios';
import * as XLSX from 'xlsx';
import puppeteer from 'puppeteer';

// Utility to clean and extract carrier and numbers from flight number
function cleanFlightNumber(flightNum: string): { carrier: string; number: string } {
  const clean = (flightNum || '').replace(/\s+/g, '').toUpperCase();
  const match = clean.match(/^([A-Z]{2,3})(\d+)$/);
  if (match) {
    return { carrier: match[1], number: match[2] };
  }
  // Fallback: extract letters and numbers
  const letters = clean.replace(/[^A-Z]/g, '');
  const digits = clean.replace(/[^0-9]/g, '');
  return { carrier: letters, number: digits };
}

// Utility for generous airport name matching
function isAirportSimilar(nameDb: string | null | undefined, nameExcel: string | null | undefined): boolean {
  if (!nameDb || !nameExcel) return false;
  
  const cleanDb = nameDb.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanExcel = nameExcel.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Strip common words to compare core names if they contain them
  const stripCommon = (s: string) => s.replace(/(airport|international|king|terminal)/g, '');
  const coreDb = stripCommon(cleanDb);
  const coreExcel = stripCommon(cleanExcel);

  if (coreDb.includes(coreExcel) || coreExcel.includes(coreDb)) {
    return true;
  }
  
  const cleanWords = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && w !== 'airport' && w !== 'international' && w !== 'king');
  
  const dbWords = cleanWords(nameDb);
  const excelWords = cleanWords(nameExcel);

  return dbWords.some(w => excelWords.includes(w)) || excelWords.some(w => dbWords.includes(w));
}

// Utility to parse dates and times from spreadsheet cells
function parseExcelDate(dateVal: any, timeVal?: any): Date | null {
  if (!dateVal) return null;
  
  // 1. If Date object
  if (dateVal instanceof Date) {
    return dateVal;
  }

  // 2. If number (Excel serial)
  if (typeof dateVal === 'number') {
    const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
    if (typeof timeVal === 'number') {
      dateObj.setMilliseconds(dateObj.getMilliseconds() + Math.round(timeVal * 86400 * 1000));
    }
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  // 3. String parsing
  const dateStr = String(dateVal).trim();
  const timeStr = timeVal ? String(timeVal).trim() : '';

  let combinedStr = dateStr;
  if (timeStr && !dateStr.includes(timeStr) && !dateStr.includes(':')) {
    combinedStr = `${dateStr} ${timeStr}`;
  }

  // Replace narrow non-breaking space (u202f) and standard non-breaking space (u00a0) with regular space to prevent Invalid Date on some Node versions
  combinedStr = combinedStr.replace(/[\u202f\u00a0]/g, ' ');

  const parsed = new Date(combinedStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // 4. Fallback manual parsing if direct parsing fails
  const cleanDateStr = dateStr.split(/[\s\u202f\u00a0]+/)[0];
  let year = 0, month = 0, day = 0;
  if (cleanDateStr.includes('/')) {
    const parts = cleanDateStr.split('/');
    if (parts[2]) {
      const cleanYear = parts[2].trim().split(/[\s\u202f\u00a0]+/)[0];
      if (cleanYear.length === 4) {
        const first = parseInt(parts[0], 10);
        const second = parseInt(parts[1], 10);
        if (first > 12) {
          day = first;
          month = second - 1;
        } else if (second > 12) {
          month = first - 1;
          day = second;
        } else {
          // Default to US format (M/D/YYYY)
          month = first - 1;
          day = second;
        }
        year = parseInt(cleanYear, 10);
      }
    }
    if (year === 0 && parts[0]?.length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    }
  } else if (cleanDateStr.includes('-')) {
    const parts = cleanDateStr.split('-');
    if (parts[0]?.length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    }
  }
  
  if (!year || isNaN(year)) return null;
  
  let hour = 0, minute = 0;
  if (timeVal) {
    const cleanTimeStr = String(timeVal).trim();
    if (typeof timeVal === 'number') {
      const totalSeconds = Math.round(timeVal * 86400);
      hour = Math.floor(totalSeconds / 3600);
      minute = Math.floor((totalSeconds % 3600) / 60);
    } else {
      const timeOnlyStr = cleanTimeStr.includes(' ') || cleanTimeStr.includes('\u202f') || cleanTimeStr.includes('\u00a0')
        ? cleanTimeStr.split(/[\s\u202f\u00a0]+/)[1]
        : cleanTimeStr;
      const matches = timeOnlyStr.match(/^(\d{1,2})[.:](\d{2})/);
      if (matches) {
        hour = parseInt(matches[1], 10);
        minute = parseInt(matches[2], 10);
      } else if (timeOnlyStr.length === 4 && !isNaN(Number(timeOnlyStr))) {
        hour = parseInt(timeOnlyStr.substring(0, 2), 10);
        minute = parseInt(timeOnlyStr.substring(2, 4), 10);
      }
    }
  }
  
  return new Date(year, month, day, hour, minute);
}

// Case-insensitive key lookup helper for excel rows
function getRowValue(row: any, keys: string[]): any {
  for (const key of keys) {
    const cleanKey = key.toLowerCase().replace(/\s+/g, '');
    for (const rowKey of Object.keys(row)) {
      if (rowKey.toLowerCase().replace(/\s+/g, '') === cleanKey) {
        return row[rowKey];
      }
    }
  }
  return undefined;
}

export class NusukService {
  
  // Get active Nusuk credentials settings
  static async getSettings() {
    let setting = await prisma.nusukSetting.findFirst();
    if (!setting) {
      setting = await prisma.nusukSetting.create({
        data: {
          token: '',
          activeEntityId: '525592',
          activeEntityTypeId: '32',
          entityId: '525592',
          checkByPassport: false,
          externalAgentCodes: '22282, 6655, 1001828',
          syncSchedule: '08:00, 20:00',
          isValid: true
        }
      });
    }
    return setting;
  }

  // Update Nusuk credentials settings
  static async saveSettings(data: {
    token: string;
    activeEntityId?: string;
    activeEntityTypeId?: string;
    entityId?: string;
    checkByPassport?: boolean;
    externalAgentCodes?: string;
    syncSchedule?: string;
  }) {
    const existing = await prisma.nusukSetting.findFirst();
    if (existing) {
      return await prisma.nusukSetting.update({
        where: { id: existing.id },
        data: {
          token: data.token,
          activeEntityId: data.activeEntityId ?? existing.activeEntityId,
          activeEntityTypeId: data.activeEntityTypeId ?? existing.activeEntityTypeId,
          entityId: data.entityId ?? existing.entityId,
          checkByPassport: data.checkByPassport ?? existing.checkByPassport,
          externalAgentCodes: data.externalAgentCodes ?? existing.externalAgentCodes,
          syncSchedule: data.syncSchedule ?? existing.syncSchedule,
          isValid: true // Reset valid status on update
        }
      });
    } else {
      return await prisma.nusukSetting.create({
        data: {
          token: data.token,
          activeEntityId: data.activeEntityId ?? '525592',
          activeEntityTypeId: data.activeEntityTypeId ?? '32',
          entityId: data.entityId ?? '525592',
          checkByPassport: data.checkByPassport ?? false,
          externalAgentCodes: data.externalAgentCodes ?? '22282, 6655, 1001828',
          syncSchedule: data.syncSchedule ?? '08:00, 20:00',
          isValid: true
        }
      });
    }
  }

  // Fetch report from Nusuk and process travel detail discrepancies
  static async triggerSync() {
    const settings = await prisma.nusukSetting.findFirst();
    if (!settings || !settings.token) {
      throw new Error('Nusuk integration is not configured. Please supply a valid Bearer token in Settings.');
    }

    let excelBuffer: Buffer;
    
    console.log('[NUSUK SYNC] Launching headless browser to sync from Nusuk...');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream'
      ]
    });

    try {
      const page = await browser.newPage();
      
      // Hide automation footprint
      await page.evaluateOnNewDocument(() => {
        const nav = (globalThis as any).navigator;
        if (nav) {
          Object.defineProperty(nav, 'webdriver', {
            get: () => undefined,
          });
        }
      });

      // Set standard browser user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36');
      
      console.log('[NUSUK SYNC] Establishing referrer page context...');
      await page.goto('https://masar.nusuk.sa/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      console.log('[NUSUK SYNC] Querying report export from page context...');
      const result: any = await page.evaluate(async (tok, activeEntityId, activeEntityTypeId, entityId) => {
        try {
          const response = await fetch("https://masar.nusuk.sa/umrah/reports_apis/api/Reports/ExportData?exportDataType=1&reportType=1", {
            method: "POST",
            headers: {
              "accept": "application/json, text/plain, */*",
              "accept-language": "en",
              "activeentityid": activeEntityId,
              "activeentitytypeid": activeEntityTypeId,
              "authorization": `Bearer ${tok}`,
              "content-type": "application/json",
              "entity-id": entityId,
              "x-lang": "en"
            },
            body: JSON.stringify({
              limit: 1000000,
              offset: 0,
              filterList: [],
              sortColumn: null,
              sortCriteria: []
            })
          });

          const isJson = response.headers.get('content-type')?.includes('application/json');
          if (isJson) {
            const bodyJsonText = await response.text();
            return {
              success: false,
              status: response.status,
              body: bodyJsonText,
              isAuthError: true
            };
          }

          const buffer = await response.arrayBuffer();
          let binary = '';
          const bytes = new Uint8Array(buffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);

          return {
            success: true,
            status: response.status,
            byteLength: len,
            base64: base64
          };

        } catch (err: any) {
          return {
            success: false,
            error: err.message
          };
        }
      }, settings.token, settings.activeEntityId, settings.activeEntityTypeId, settings.entityId);

      await browser.close();

      if (!result.success) {
        if (result.isAuthError || result.status === 401 || result.status === 403 || (result.body && result.body.includes('bot'))) {
          await prisma.nusukSetting.update({
            where: { id: settings.id },
            data: { isValid: false }
          });
          throw new Error(`Nusuk authentication failed. The Bearer token has expired or is blocked: ${result.body || result.statusText}`);
        }
        throw new Error(result.error || `Nusuk API returned status ${result.status}: ${result.body}`);
      }

      excelBuffer = Buffer.from(result.base64, 'base64');
      console.log('[NUSUK SYNC] Report successfully fetched via browser context. Size:', excelBuffer.length, 'bytes');

    } catch (error: any) {
      await browser.close();
      console.error('[NUSUK SYNC] Error fetching Nusuk data:', error.message);
      throw error;
    }

    // Parse Excel report using xlsx
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(excelBuffer, { type: 'buffer' });
    } catch (e: any) {
      console.error('[NUSUK SYNC] Failed to parse Excel sheet:', e.message);
      throw new Error(`Failed to parse Nusuk report file format: ${e.message}`);
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Nusuk report file is empty or has no sheets.');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet) as any[];
    console.log(`[NUSUK SYNC] Parsed ${rows.length} rows from Nusuk report.`);

    // Keep track of bookings we've processed during this sync run so we can refresh mismatches
    const processedBookingIds = new Set<string>();
    const mismatchesToCreate: any[] = [];

    // Database transactional update
    const syncResult = await prisma.$transaction(async (tx) => {
      // 1. Group the Excel rows by Group Number
      // Filter rows by allowed external agent codes if configured in settings
      const allowedAgentCodes = settings.externalAgentCodes
        ? settings.externalAgentCodes.split(',').map((c: string) => c.trim()).filter(Boolean)
        : [];
      
      const rowsByGroup: { [groupNum: string]: any[] } = {};
      let skippedCount = 0;

      for (const row of rows) {
        // Filter by External Agent Code (column "External Agent" or "Agent Number")
        const rowAgentCode = String(getRowValue(row, ['External Agent', 'ExternalAgent', 'External Agent Code', 'Agent Code', 'Agent Number', 'AgentNumber']) || '').trim();
        if (allowedAgentCodes.length > 0 && !allowedAgentCodes.includes(rowAgentCode)) {
          skippedCount++;
          continue;
        }

        const gNum = String(getRowValue(row, ['Group number', 'GroupNumber']) || '').trim();
        if (gNum) {
          if (!rowsByGroup[gNum]) rowsByGroup[gNum] = [];
          rowsByGroup[gNum].push(row);
        }
      }

      console.log(`[NUSUK SYNC] Grouped rows into ${Object.keys(rowsByGroup).length} distinct groups from Nusuk. Skipped ${skippedCount} rows belonging to other external agents.`);

      // Pre-fetch candidate active bookings with groupNumber to match them in memory
      const candidateBookings = await tx.umrahVisaBooking.findMany({
        where: {
          isDeleted: false,
          groupNumber: { not: null }
        },
        include: {
          passengers: {
            where: { isDeleted: false }
          },
          travelDetails: {
            where: { isAlternate: false },
            include: {
              arrivalAirport: true,
              departureAirport: true
            }
          }
        }
      });

      // Build map of individual group number parts to booking
      const bookingByGroupMap = new Map<string, typeof candidateBookings[0]>();
      for (const b of candidateBookings) {
        if (!b.groupNumber) continue;
        const dbParts = b.groupNumber.split(/[\s,]+/).map(p => p.trim()).filter(Boolean);
        for (const part of dbParts) {
          bookingByGroupMap.set(part, b);
        }
      }

      const subAgentStatsMap = new Map<string, {
        totalArrivals: number;
        totalDepartures: number;
        arrivalMismatches: number;
        departureMismatches: number;
        severeViolations: number;
      }>();

      const getOrInitStats = (partyId: string) => {
        if (!subAgentStatsMap.has(partyId)) {
          subAgentStatsMap.set(partyId, {
            totalArrivals: 0,
            totalDepartures: 0,
            arrivalMismatches: 0,
            departureMismatches: 0,
            severeViolations: 0
          });
        }
        return subAgentStatsMap.get(partyId)!;
      };

      // 2. Process each group
      for (const [gNum, excelRows] of Object.entries(rowsByGroup)) {
        // Find corresponding booking in database candidate map
        const booking = bookingByGroupMap.get(gNum);
        if (!booking) continue;

        processedBookingIds.add(booking.id);
        const currentPassengers = [...booking.passengers];

        // Sync passenger records from excelRows into the database under this booking
        for (const row of excelRows) {
          const passport = String(getRowValue(row, ['Passport Number', 'PassportNumber']) || '').trim().toUpperCase();
          if (!passport) continue;

          const mutamerName = String(getRowValue(row, ['Mutamer Name', 'MutamerName']) || 'Unknown Mutamer').trim();
          const nationality = String(getRowValue(row, ['Mutamer Nationality', 'Nationality']) || '').trim();
          const passportExpiry = parseExcelDate(getRowValue(row, ['Passport Expiry Date']));
                  const visaNumber = String(getRowValue(row, ['Visa Number']) || '').trim();
          const mofaNumber = String(getRowValue(row, ['Mofa Number']) || '').trim();
          const mutamerStatus = String(getRowValue(row, ['Mutamer Status']) || '').trim();
          const entryDate = parseExcelDate(getRowValue(row, ['Entry Date']), getRowValue(row, ['Entry Time']));
          const exitDate = parseExcelDate(getRowValue(row, ['Exit Date']), getRowValue(row, ['Exit Time']));
          const excelGender = String(getRowValue(row, ['Gender', 'Type']) || '').trim().toLowerCase(); // Support Excel column named "Type" as fallback for Gender
          
          let gender: 'male' | 'female' | null = null;
          if (excelGender === 'male') gender = 'male';
          else if (excelGender === 'female') gender = 'female';

          // Step 1: Check if passenger exists by passport number under this booking
          let passenger: any = currentPassengers.find(p => p.passportNumber?.toUpperCase() === passport);

          // Step 2: If not found by passport number, find an existing passenger who doesn't have a passport number yet
          if (!passenger) {
            passenger = currentPassengers.find(p => !p.passportNumber);
          }

          if (!passenger) {
            // Step 3: Create passenger record if no empty slot/matching passenger was found
            passenger = await tx.umrahPassenger.create({
              data: {
                bookingId: booking.id,
                fullName: mutamerName,
                nationality,
                passportNumber: passport,
                passportExpiry,
                visaNumber: visaNumber || null,
                mofaNumber: mofaNumber || null,
                mutamerStatus: mutamerStatus || null,
                entryDate,
                exitDate,
                gender,
                isLeadPassenger: currentPassengers.length === 0
              }
            });
            currentPassengers.push(passenger);
            console.log(`[NUSUK SYNC] Created passenger ${mutamerName} (${passport}) for booking ${booking.bookingReference}`);
          } else {
            // Step 4: Update passenger details in-place
            passenger = await tx.umrahPassenger.update({
              where: { id: passenger.id },
              data: {
                fullName: mutamerName,
                nationality,
                passportNumber: passport,
                passportExpiry,
                visaNumber: visaNumber || null,
                mofaNumber: mofaNumber || null,
                mutamerStatus: mutamerStatus || null,
                entryDate,
                exitDate,
                gender
              }
            });
            // Update local cache
            const index = currentPassengers.findIndex(p => p.id === passenger.id);
            if (index !== -1) currentPassengers[index] = passenger;
            console.log(`[NUSUK SYNC] Updated passenger ${mutamerName} (${passport}) for booking ${booking.bookingReference}`);
          }

          // Compare travel details for this passenger against booking travel details
          const mainTravel = booking.travelDetails?.find((t: any) => !t.isAlternate);
          let entryMismatchDetails: any = null;
          let exitMismatchDetails: any = null;

          if (mainTravel) {
            const excelEntryDate = getRowValue(row, ['Entry Date', 'EntryDate']);
            const excelEntryTime = getRowValue(row, ['Entry Time', 'EntryTime']);
            const excelEntryCarrierNum = getRowValue(row, ['Arrival Flight Number', 'ArrivalFlightNumber', 'Entry Carrier Number', 'EntryCarrierNumber', 'Entry Carrier']);
            const excelEntryPort = getRowValue(row, ['Entry Port Name', 'EntryPortName', 'Entry Port']);

            if (excelEntryDate) {
              const excelEntryDateTime = parseExcelDate(excelEntryDate, excelEntryTime);
              if (excelEntryDateTime) {
                const dbF = cleanFlightNumber(mainTravel.arrivalFlightNumber);
                const exF = cleanFlightNumber(excelEntryCarrierNum);
                const sameCarrier = dbF.carrier && exF.carrier && dbF.carrier === exF.carrier;
                const sameFlightNum = dbF.number && exF.number && parseInt(dbF.number, 10) === parseInt(exF.number, 10);
                
                const flightMismatch = !sameCarrier || !sameFlightNum;
                const timeDiffMs = Math.abs(mainTravel.arrivalDateTime.getTime() - excelEntryDateTime.getTime());
                const timeDiffHrs = timeDiffMs / (1000 * 60 * 60);

                const timeMismatch = timeDiffHrs >= 9;
                const airportMismatch = !isAirportSimilar(mainTravel.arrivalAirport?.name, excelEntryPort);

                if (flightMismatch || timeMismatch || airportMismatch) {
                  entryMismatchDetails = {
                    mismatched: true,
                    dateTime: {
                      db: mainTravel.arrivalDateTime.toISOString(),
                      excel: excelEntryDateTime.toISOString(),
                      mismatch: timeMismatch
                    },
                    flight: {
                      db: mainTravel.arrivalFlightNumber,
                      excel: String(excelEntryCarrierNum || '').trim(),
                      mismatch: flightMismatch
                    },
                    port: {
                      db: mainTravel.arrivalAirport?.name || 'Not Configured',
                      excel: String(excelEntryPort || '').trim(),
                      mismatch: airportMismatch
                    }
                  };
                }
              }
            }

            const excelExitDate = getRowValue(row, ['Exit Date', 'ExitDate']);
            const excelExitTime = getRowValue(row, ['Exit Time', 'ExitTime']);
            const excelExitCarrierNum = getRowValue(row, ['Departure Flight Number', 'DepartureFlightNumber', 'Exit Carrier Number', 'ExitCarrierNumber', 'Exit Carrier']);
            const excelExitPort = getRowValue(row, ['Exit Port', 'ExitPortName', 'ExitPort']);

            if (excelExitDate) {
              const excelExitDateTime = parseExcelDate(excelExitDate, excelExitTime);
              if (excelExitDateTime) {
                const dbFDep = cleanFlightNumber(mainTravel.departureFlightNumber);
                const exFDep = cleanFlightNumber(excelExitCarrierNum);
                const sameCarrierDep = dbFDep.carrier && exFDep.carrier && dbFDep.carrier === exFDep.carrier;
                const sameFlightNumDep = dbFDep.number && exFDep.number && parseInt(dbFDep.number, 10) === parseInt(exFDep.number, 10);

                const flightMismatchDep = !sameCarrierDep || !sameFlightNumDep;
                const timeDiffMsDep = Math.abs(mainTravel.departureDateTime.getTime() - excelExitDateTime.getTime());
                const timeDiffHrsDep = timeDiffMsDep / (1000 * 60 * 60);

                const timeMismatchDep = timeDiffHrsDep >= 9;
                const airportMismatchDep = !isAirportSimilar(mainTravel.departureAirport?.name, excelExitPort);

                if (flightMismatchDep || timeMismatchDep || airportMismatchDep) {
                  exitMismatchDetails = {
                    mismatched: true,
                    dateTime: {
                      db: mainTravel.departureDateTime.toISOString(),
                      excel: excelExitDateTime.toISOString(),
                      mismatch: timeMismatchDep
                    },
                    flight: {
                      db: mainTravel.departureFlightNumber,
                      excel: String(excelExitCarrierNum || '').trim(),
                      mismatch: flightMismatchDep
                    },
                    port: {
                      db: mainTravel.departureAirport?.name || 'Not Configured',
                      excel: String(excelExitPort || '').trim(),
                      mismatch: airportMismatchDep
                    }
                  };
                }
              }
            }

            if (entryMismatchDetails || exitMismatchDetails) {
              let mismatchType = 'none';
              if (entryMismatchDetails && exitMismatchDetails) mismatchType = 'both';
              else if (entryMismatchDetails) mismatchType = 'entry';
              else if (exitMismatchDetails) mismatchType = 'exit';

              mismatchesToCreate.push({
                bookingId: booking.id,
                passengerId: passenger.id,
                mismatchType,
                details: {
                  mutamerName,
                  passportNumber: passport,
                  groupNumber: gNum,
                  entry: entryMismatchDetails,
                  exit: exitMismatchDetails
                }
              });
            }
          }

          // Update compliance calculation stats in-memory
          if (booking.partyId) {
            const stats = getOrInitStats(booking.partyId);

            const windowDays = 30;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - windowDays);

            const isArrivalInWindow = entryDate && entryDate >= thirtyDaysAgo;
            const isDepartureInWindow = exitDate && exitDate >= thirtyDaysAgo;

            if (isArrivalInWindow) {
              stats.totalArrivals++;
              if (entryMismatchDetails) {
                stats.arrivalMismatches++;
              }
            }

            if (isDepartureInWindow) {
              stats.totalDepartures++;
              if (exitMismatchDetails) {
                stats.departureMismatches++;
              }
            }

            const mutamerStatus = String(getRowValue(row, ['Mutamer Status']) || '');
            const isSevere = mutamerStatus === 'Program Duration Exceeded' || mutamerStatus.toLowerCase().includes('runaway') || mutamerStatus.toLowerCase().includes('overstay');
            if (isSevere && (isArrivalInWindow || isDepartureInWindow)) {
              stats.severeViolations++;
            }
          }
        }

        // 3. Verify total passenger count
        const actualCount = currentPassengers.length;
        if (actualCount !== booking.passengerCount) {
          mismatchesToCreate.push({
            bookingId: booking.id,
            passengerId: null,
            mismatchType: 'pax_count',
            details: {
              type: 'pax_count',
              groupNumber: gNum,
              expected: booking.passengerCount,
              actual: actualCount
            }
          });
        }
      }

      // 4. Delete unresolved mismatches for the bookings that were parsed
      if (processedBookingIds.size > 0) {
        await tx.nusukMismatch.deleteMany({
          where: {
            bookingId: { in: Array.from(processedBookingIds) },
            resolved: false
          }
        });
      }

      // 5. Create newly detected mismatches
      for (const item of mismatchesToCreate) {
        await tx.nusukMismatch.create({
          data: {
            bookingId: item.bookingId,
            passengerId: item.passengerId,
            mismatchType: item.mismatchType,
            details: item.details,
            resolved: false
          }
        });
      }

      // 5.5 Recalculate and update SubAgentMetric & ComplianceAuditLog for ALL sub-agents (Parties)
      const parties = await tx.party.findMany({
        where: { isCustomer: true }
      });

      for (const party of parties) {
        const stats = subAgentStatsMap.get(party.id) || {
          totalArrivals: 0,
          totalDepartures: 0,
          arrivalMismatches: 0,
          departureMismatches: 0,
          severeViolations: 0
        };

        // Compute scores
        const BUFFER_CONSTANT = 10;
        const ARRIVAL_WEIGHT = 1.0;
        const DEPARTURE_WEIGHT = 2.0;
        const YELLOW_THRESHOLD = 0.02;
        const RED_THRESHOLD = 0.05;

        const R_A = stats.arrivalMismatches / (stats.totalArrivals + BUFFER_CONSTANT);
        const R_D = stats.departureMismatches / (stats.totalDepartures + BUFFER_CONSTANT);
        
        const score = ((R_A * ARRIVAL_WEIGHT) + (R_D * DEPARTURE_WEIGHT)) / (ARRIVAL_WEIGHT + DEPARTURE_WEIGHT);

        let complianceStatus: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
        if (score >= RED_THRESHOLD || stats.severeViolations > 0) {
          complianceStatus = 'RED';
        } else if (score >= YELLOW_THRESHOLD) {
          complianceStatus = 'YELLOW';
        }

        // Check previous status for audit logging
        const existingMetric = await tx.subAgentMetric.findUnique({
          where: { subAgentId: party.id }
        });

        const previousStatus = existingMetric ? existingMetric.complianceStatus : 'GREEN';

        // Upsert the metric
        await tx.subAgentMetric.upsert({
          where: { subAgentId: party.id },
          create: {
            subAgentId: party.id,
            totalArrivals: stats.totalArrivals,
            totalDepartures: stats.totalDepartures,
            arrivalMismatches: stats.arrivalMismatches,
            departureMismatches: stats.departureMismatches,
            severeViolations: stats.severeViolations,
            weightedScore: score,
            complianceStatus: complianceStatus
          },
          update: {
            totalArrivals: stats.totalArrivals,
            totalDepartures: stats.totalDepartures,
            arrivalMismatches: stats.arrivalMismatches,
            departureMismatches: stats.departureMismatches,
            severeViolations: stats.severeViolations,
            weightedScore: score,
            complianceStatus: complianceStatus
          }
        });

        // Write audit log if status changed
        if (previousStatus !== complianceStatus) {
          let reasonSummary = '';
          if (complianceStatus === 'RED') {
            if (stats.severeViolations > 0) {
              reasonSummary = `Status upgraded to RED. Severe violations: ${stats.severeViolations} overstays/runaways detected in the rolling 30-day window.`;
            } else {
              reasonSummary = `Score crossed RED threshold of ${RED_THRESHOLD} (Score: ${score.toFixed(4)}) with ${stats.arrivalMismatches} arrival and ${stats.departureMismatches} departure mismatches.`;
            }
          } else if (complianceStatus === 'YELLOW') {
            reasonSummary = `Score crossed YELLOW threshold of ${YELLOW_THRESHOLD} (Score: ${score.toFixed(4)}) with ${stats.arrivalMismatches} arrival and ${stats.departureMismatches} departure mismatches.`;
          } else {
            reasonSummary = `Score returned to normal range (Score: ${score.toFixed(4)}). Operations restored to GREEN status.`;
          }

          await tx.complianceAuditLog.create({
            data: {
              subAgentId: party.id,
              previousStatus: previousStatus as any,
              newStatus: complianceStatus,
              reasonSummary: reasonSummary
            }
          });
        }
      }

      // 6. Update setting metadata (last synced, is_valid status)
      await tx.nusukSetting.update({
        where: { id: settings.id },
        data: {
          lastSyncedAt: new Date(),
          isValid: true
        }
      });

      return {
        mismatchesCount: mismatchesToCreate.length,
        syncedAt: new Date()
      };
    });

    console.log(`[NUSUK SYNC] Completed mismatch synchronization. Found ${syncResult.mismatchesCount} active discrepancies.`);
    return syncResult;
  }

  // Get active travel mismatches list with pagination and filters
  static async getMismatches(params: {
    resolved?: boolean;
    page?: number;
    limit?: number;
    mismatchType?: string;
    partyId?: string;
  }) {
    const isResolved = params.resolved ?? false;
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      resolved: isResolved
    };

    if (params.mismatchType && params.mismatchType !== 'all') {
      whereClause.mismatchType = params.mismatchType;
    }

    if (params.partyId && params.partyId !== 'all') {
      whereClause.booking = {
        partyId: params.partyId
      };
    }

    const [mismatches, totalCount] = await Promise.all([
      prisma.nusukMismatch.findMany({
        where: whereClause,
        include: {
          booking: {
            select: {
              id: true,
              bookingReference: true,
              groupNumber: true,
              groupName: true,
              status: true,
              party: {
                select: {
                  partyName: true
                }
              }
            }
          },
          passenger: {
            select: {
              fullName: true,
              passportNumber: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.nusukMismatch.count({
        where: whereClause
      })
    ]);

    return {
      mismatches,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  // Resolve a travel mismatch
  static async resolveMismatch(id: string) {
    return await prisma.nusukMismatch.update({
      where: { id },
      data: { resolved: true }
    });
  }

  // Get compliance network summary metrics
  static async getComplianceSummary() {
    const totalCount = await prisma.party.count({
      where: { isCustomer: true }
    });

    const metrics = await prisma.subAgentMetric.findMany();
    const redCount = metrics.filter(m => m.complianceStatus === 'RED').length;
    const yellowCount = metrics.filter(m => m.complianceStatus === 'YELLOW').length;

    let totalArrivalMismatches = 0;
    let totalDepartureMismatches = 0;
    for (const m of metrics) {
      totalArrivalMismatches += m.arrivalMismatches;
      totalDepartureMismatches += m.departureMismatches;
    }

    let primaryRiskFactor = 'None';
    if (totalArrivalMismatches > 0 || totalDepartureMismatches > 0) {
      primaryRiskFactor = totalArrivalMismatches >= totalDepartureMismatches 
        ? 'Arrival Port Mismatches' 
        : 'Departure Flights Deviation';
    }

    return {
      totalMonitoredAgents: totalCount,
      activeSuspensions: redCount,
      throttledAgents: yellowCount,
      primaryRiskFactor
    };
  }

  // Get active compliance registry list of sub-agents
  static async getComplianceAgents() {
    const parties = await prisma.party.findMany({
      where: { isCustomer: true },
      include: {
        complianceMetrics: true
      }
    });

    const registry = parties.map(p => {
      const metrics = p.complianceMetrics || {
        totalArrivals: 0,
        totalDepartures: 0,
        arrivalMismatches: 0,
        departureMismatches: 0,
        severeViolations: 0,
        weightedScore: 0.0,
        complianceStatus: 'GREEN'
      };

      let concernDetails = 'Mismatches within normal logistical tolerances.';
      if (metrics.complianceStatus === 'RED') {
        if (metrics.severeViolations > 0) {
          concernDetails = `Severe Overstay: ${metrics.severeViolations} pilgrims overstayed program duration.`;
        } else {
          concernDetails = `Critical flight deviations: Score index reached ${(Number(metrics.weightedScore)).toFixed(4)}.`;
        }
      } else if (metrics.complianceStatus === 'YELLOW') {
        concernDetails = `Warning threshold: ${metrics.arrivalMismatches} arrival delays and ${metrics.departureMismatches} departure mismatches.`;
      }

      return {
        id: p.id,
        partyName: p.partyName,
        partyCode: p.partyCode || 'N/A',
        totalArrivals: metrics.totalArrivals,
        totalDepartures: metrics.totalDepartures,
        arrivalMismatches: metrics.arrivalMismatches,
        departureMismatches: metrics.departureMismatches,
        severeViolations: metrics.severeViolations,
        weightedScore: Number(metrics.weightedScore),
        complianceStatus: metrics.complianceStatus,
        concernDetails
      };
    });

    const statusOrder = { RED: 0, YELLOW: 1, GREEN: 2 };
    return registry.sort((a, b) => {
      const orderA = statusOrder[a.complianceStatus as keyof typeof statusOrder];
      const orderB = statusOrder[b.complianceStatus as keyof typeof statusOrder];
      if (orderA !== orderB) return orderA - orderB;
      return b.weightedScore - a.weightedScore;
    });
  }

  // Get compliance audit log timeline for agent
  static async getComplianceAgentLogs(partyId: string) {
    return await prisma.complianceAuditLog.findMany({
      where: { subAgentId: partyId },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Force override an agent's compliance status (Action)
  static async overrideComplianceStatus(partyId: string, status: 'GREEN' | 'YELLOW' | 'RED', reason: string) {
    const existing = await prisma.subAgentMetric.findUnique({
      where: { subAgentId: partyId }
    });

    const previousStatus = existing ? existing.complianceStatus : 'GREEN';

    await prisma.subAgentMetric.upsert({
      where: { subAgentId: partyId },
      create: {
        subAgentId: partyId,
        totalArrivals: 0,
        totalDepartures: 0,
        arrivalMismatches: 0,
        departureMismatches: 0,
        severeViolations: status === 'RED' ? 1 : 0,
        weightedScore: status === 'RED' ? 0.06 : (status === 'YELLOW' ? 0.03 : 0.0),
        complianceStatus: status
      },
      update: {
        complianceStatus: status,
        severeViolations: status === 'RED' ? 1 : undefined,
        weightedScore: status === 'RED' ? 0.06 : (status === 'YELLOW' ? 0.03 : 0.0)
      }
    });

    if (previousStatus !== status) {
      await prisma.complianceAuditLog.create({
        data: {
          subAgentId: partyId,
          previousStatus: previousStatus as any,
          newStatus: status,
          reasonSummary: `Manual override by Admin: ${reason}`
        }
      });
    }
  }

  // Recalculate compliance metrics using local db data
  static async recalculateCompliance() {
    const windowDays = 30;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - windowDays);

    return await prisma.$transaction(async (tx) => {
      // 1. Get all customer sub-agents (Parties)
      const parties = await tx.party.findMany({
        where: { isCustomer: true }
      });

      let updatedCount = 0;

      for (const party of parties) {
        // Query bookings and passengers for this sub-agent
        const bookings = await tx.umrahVisaBooking.findMany({
          where: {
            partyId: party.id,
            isDeleted: false
          },
          include: {
            passengers: {
              where: { isDeleted: false },
              include: {
                nusukMismatches: {
                  where: { resolved: false }
                }
              }
            }
          }
        });

        let totalArrivals = 0;
        let totalDepartures = 0;
        let arrivalMismatches = 0;
        let departureMismatches = 0;
        let severeViolations = 0;

        for (const booking of bookings) {
          for (const passenger of booking.passengers) {
            const entryDate = passenger.entryDate;
            const exitDate = passenger.exitDate;

            const isArrivalInWindow = entryDate && entryDate >= thirtyDaysAgo;
            const isDepartureInWindow = exitDate && exitDate >= thirtyDaysAgo;

            if (isArrivalInWindow) {
              totalArrivals++;
            }
            if (isDepartureInWindow) {
              totalDepartures++;
            }

            // Check unresolved mismatches
            for (const mismatch of passenger.nusukMismatches) {
              const mType = mismatch.mismatchType;
              if (isArrivalInWindow && (mType === 'entry' || mType === 'both')) {
                arrivalMismatches++;
              }
              if (isDepartureInWindow && (mType === 'exit' || mType === 'both')) {
                departureMismatches++;
              }
            }

            // Check severe violations
            const mutamerStatus = passenger.mutamerStatus || '';
            const isSevere = mutamerStatus === 'Program Duration Exceeded' || 
              mutamerStatus.toLowerCase().includes('runaway') || 
              mutamerStatus.toLowerCase().includes('overstay');

            if (isSevere && (isArrivalInWindow || isDepartureInWindow)) {
              severeViolations++;
            }
          }
        }

        // Compute compliance scores
        const BUFFER_CONSTANT = 10;
        const ARRIVAL_WEIGHT = 1.0;
        const DEPARTURE_WEIGHT = 2.0;
        const YELLOW_THRESHOLD = 0.02;
        const RED_THRESHOLD = 0.05;

        const R_A = arrivalMismatches / (totalArrivals + BUFFER_CONSTANT);
        const R_D = departureMismatches / (totalDepartures + BUFFER_CONSTANT);
        
        const score = ((R_A * ARRIVAL_WEIGHT) + (R_D * DEPARTURE_WEIGHT)) / (ARRIVAL_WEIGHT + DEPARTURE_WEIGHT);

        let complianceStatus: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
        if (score >= RED_THRESHOLD || severeViolations > 0) {
          complianceStatus = 'RED';
        } else if (score >= YELLOW_THRESHOLD) {
          complianceStatus = 'YELLOW';
        }

        // Check previous status for audit logging
        const existingMetric = await tx.subAgentMetric.findUnique({
          where: { subAgentId: party.id }
        });

        const previousStatus = existingMetric ? existingMetric.complianceStatus : 'GREEN';

        // Upsert the metric
        await tx.subAgentMetric.upsert({
          where: { subAgentId: party.id },
          create: {
            subAgentId: party.id,
            totalArrivals,
            totalDepartures,
            arrivalMismatches,
            departureMismatches,
            severeViolations,
            weightedScore: score,
            complianceStatus
          },
          update: {
            totalArrivals,
            totalDepartures,
            arrivalMismatches,
            departureMismatches,
            severeViolations,
            weightedScore: score,
            complianceStatus
          }
        });

        // Write audit log if status changed
        if (previousStatus !== complianceStatus) {
          let reasonSummary = '';
          if (complianceStatus === 'RED') {
            if (severeViolations > 0) {
              reasonSummary = `Status upgraded to RED. Severe violations: ${severeViolations} overstays/runaways detected in the rolling 30-day window.`;
            } else {
              reasonSummary = `Score crossed RED threshold of ${RED_THRESHOLD} (Score: ${score.toFixed(4)}) with ${arrivalMismatches} arrival and ${departureMismatches} departure mismatches.`;
            }
          } else if (complianceStatus === 'YELLOW') {
            reasonSummary = `Score crossed YELLOW threshold of ${YELLOW_THRESHOLD} (Score: ${score.toFixed(4)}) with ${arrivalMismatches} arrival and ${departureMismatches} departure mismatches.`;
          } else {
            reasonSummary = `Score returned to normal range (Score: ${score.toFixed(4)}). Operations restored to GREEN status.`;
          }

          await tx.complianceAuditLog.create({
            data: {
              subAgentId: party.id,
              previousStatus: previousStatus as any,
              newStatus: complianceStatus,
              reasonSummary: reasonSummary
            }
          });
        }

        updatedCount++;
      }

      return {
        success: true,
        recalculatedAgentsCount: updatedCount,
        timestamp: new Date()
      };
    });
  }
}
