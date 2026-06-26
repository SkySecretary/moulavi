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
  
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  
  const dbWords = clean(nameDb)
    .split(/\s+/)
    .filter(w => w.length > 2 && w !== 'airport' && w !== 'international' && w !== 'king');
  
  const excelWords = clean(nameExcel)
    .split(/\s+/)
    .filter(w => w.length > 2 && w !== 'airport' && w !== 'international' && w !== 'king');
  
  if (dbWords.length === 0 || excelWords.length === 0) {
    // If one of them has no generic words, do a direct inclusion check
    return nameDb.toLowerCase().includes(nameExcel.toLowerCase()) || nameExcel.toLowerCase().includes(nameDb.toLowerCase());
  }

  // If any key word (like 'jeddah', 'madinah', 'riyadh') matches, we count it as similar
  return dbWords.some(w => excelWords.includes(w)) || excelWords.some(w => dbWords.includes(w));
}

// Utility to parse dates and times from spreadsheet cells
function parseExcelDate(dateVal: any, timeVal?: any): Date | null {
  if (!dateVal) return null;
  
  let dateStr = '';
  if (dateVal instanceof Date) {
    dateStr = dateVal.toISOString().split('T')[0];
  } else if (typeof dateVal === 'number') {
    // Excel serial number
    const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
    dateStr = dateObj.toISOString().split('T')[0];
  } else {
    dateStr = String(dateVal).trim();
  }
  
  let year = 0, month = 0, day = 0;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts[2]?.length === 4) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    } else if (parts[0]?.length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0]?.length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    }
  }
  
  if (!year || isNaN(year)) return null;
  
  let hour = 0, minute = 0;
  if (timeVal) {
    const timeStr = String(timeVal).trim();
    if (typeof timeVal === 'number') {
      const totalSeconds = Math.round(timeVal * 86400);
      hour = Math.floor(totalSeconds / 3600);
      minute = Math.floor((totalSeconds % 3600) / 60);
    } else {
      const matches = timeStr.match(/^(\d{1,2})[.:](\d{2})/);
      if (matches) {
        hour = parseInt(matches[1], 10);
        minute = parseInt(matches[2], 10);
      } else if (timeStr.length === 4 && !isNaN(Number(timeStr))) {
        hour = parseInt(timeStr.substring(0, 2), 10);
        minute = parseInt(timeStr.substring(2, 4), 10);
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
        // Filter by External Agent Code (column "External Agent")
        const rowAgentCode = String(getRowValue(row, ['External Agent', 'ExternalAgent', 'External Agent Code', 'Agent Code']) || '').trim();
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

      // 2. Process each group
      for (const [gNum, excelRows] of Object.entries(rowsByGroup)) {
        // Find corresponding booking in database
        const booking = await tx.umrahVisaBooking.findFirst({
          where: {
            groupNumber: gNum,
            isDeleted: false
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
          const entryDate = parseExcelDate(getRowValue(row, ['Entry Date']), getRowValue(row, ['Entry Time']));
          const exitDate = parseExcelDate(getRowValue(row, ['Exit Date']), getRowValue(row, ['Exit Time']));
          const excelGender = String(getRowValue(row, ['Gender']) || '').trim().toLowerCase();
          
          let gender: 'male' | 'female' | null = null;
          if (excelGender === 'male') gender = 'male';
          else if (excelGender === 'female') gender = 'female';

          // Check if passenger exists by passport number under this booking
          let passenger: any = currentPassengers.find(p => p.passportNumber?.toUpperCase() === passport);

          if (!passenger) {
            // Create passenger record
            passenger = await tx.umrahPassenger.create({
              data: {
                bookingId: booking.id,
                fullName: mutamerName,
                nationality,
                passportNumber: passport,
                passportExpiry,
                visaNumber: visaNumber || null,
                mofaNumber: mofaNumber || null,
                entryDate,
                exitDate,
                gender,
                isLeadPassenger: currentPassengers.length === 0
              }
            });
            currentPassengers.push(passenger);
            console.log(`[NUSUK SYNC] Created passenger ${mutamerName} (${passport}) for booking ${booking.bookingReference}`);
          } else {
            // Update passenger details
            passenger = await tx.umrahPassenger.update({
              where: { id: passenger.id },
              data: {
                fullName: mutamerName,
                nationality,
                passportExpiry,
                visaNumber: visaNumber || null,
                mofaNumber: mofaNumber || null,
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
          if (mainTravel) {
            const excelEntryDate = getRowValue(row, ['Entry Date', 'EntryDate']);
            const excelEntryTime = getRowValue(row, ['Entry Time', 'EntryTime']);
            const excelEntryCarrierNum = getRowValue(row, ['Entry Carrier Number', 'EntryCarrierNumber', 'Entry Carrier']);
            const excelEntryPort = getRowValue(row, ['Entry Port Name', 'EntryPortName', 'Entry Port']);

            let entryMismatchDetails: any = null;
            if (excelEntryDate) {
              const excelEntryDateTime = parseExcelDate(excelEntryDate, excelEntryTime);
              if (excelEntryDateTime) {
                const dbF = cleanFlightNumber(mainTravel.arrivalFlightNumber);
                const exF = cleanFlightNumber(excelEntryCarrierNum);
                const sameCarrier = dbF.carrier && exF.carrier && dbF.carrier === exF.carrier;
                const timeDiffMs = Math.abs(mainTravel.arrivalDateTime.getTime() - excelEntryDateTime.getTime());
                const timeDiffHrs = timeDiffMs / (1000 * 60 * 60);

                const flightOrTimeMismatch = !sameCarrier || timeDiffHrs >= 9;
                const airportMismatch = !isAirportSimilar(mainTravel.arrivalAirport?.name, excelEntryPort);

                if (flightOrTimeMismatch || airportMismatch) {
                  entryMismatchDetails = {
                    mismatched: true,
                    dateTime: {
                      db: mainTravel.arrivalDateTime.toISOString(),
                      excel: excelEntryDateTime.toISOString(),
                      mismatch: flightOrTimeMismatch
                    },
                    flight: {
                      db: mainTravel.arrivalFlightNumber,
                      excel: String(excelEntryCarrierNum || '').trim(),
                      mismatch: !sameCarrier
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
            const excelExitCarrierNum = getRowValue(row, ['Exit Carrier Number', 'ExitCarrierNumber', 'Exit Carrier']);
            const excelExitPort = getRowValue(row, ['Exit Port', 'ExitPortName', 'ExitPort']);

            let exitMismatchDetails: any = null;
            if (excelExitDate) {
              const excelExitDateTime = parseExcelDate(excelExitDate, excelExitTime);
              if (excelExitDateTime) {
                const dbFDep = cleanFlightNumber(mainTravel.departureFlightNumber);
                const exFDep = cleanFlightNumber(excelExitCarrierNum);
                const sameCarrierDep = dbFDep.carrier && exFDep.carrier && dbFDep.carrier === exFDep.carrier;
                const timeDiffMsDep = Math.abs(mainTravel.departureDateTime.getTime() - excelExitDateTime.getTime());
                const timeDiffHrsDep = timeDiffMsDep / (1000 * 60 * 60);

                const flightOrTimeMismatchDep = !sameCarrierDep || timeDiffHrsDep >= 9;
                const airportMismatchDep = !isAirportSimilar(mainTravel.departureAirport?.name, excelExitPort);

                if (flightOrTimeMismatchDep || airportMismatchDep) {
                  exitMismatchDetails = {
                    mismatched: true,
                    dateTime: {
                      db: mainTravel.departureDateTime.toISOString(),
                      excel: excelExitDateTime.toISOString(),
                      mismatch: flightOrTimeMismatchDep
                    },
                    flight: {
                      db: mainTravel.departureFlightNumber,
                      excel: String(excelExitCarrierNum || '').trim(),
                      mismatch: !sameCarrierDep
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

  // Get active travel mismatches list
  static async getMismatches(params?: { resolved?: boolean }) {
    const isResolved = params?.resolved ?? false;
    return await prisma.nusukMismatch.findMany({
      where: { resolved: isResolved },
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
      orderBy: { createdAt: 'desc' }
    });
  }

  // Resolve a travel mismatch
  static async resolveMismatch(id: string) {
    return await prisma.nusukMismatch.update({
      where: { id },
      data: { resolved: true }
    });
  }
}
