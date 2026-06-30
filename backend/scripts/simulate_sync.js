const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');
const prisma = new PrismaClient();

function getRowValue(row, keys) {
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

function parseExcelDate(dateVal, timeVal) {
  if (!dateVal) return null;
  
  if (dateVal instanceof Date) {
    return dateVal;
  }

  if (typeof dateVal === 'number') {
    const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
    if (typeof timeVal === 'number') {
      dateObj.setMilliseconds(dateObj.getMilliseconds() + Math.round(timeVal * 86400 * 1000));
    }
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  const dateStr = String(dateVal).trim();
  const timeStr = timeVal ? String(timeVal).trim() : '';

  let combinedStr = dateStr;
  if (timeStr && !dateStr.includes(timeStr) && !dateStr.includes(':')) {
    combinedStr = `${dateStr} ${timeStr}`;
  }

  // Replace narrow non-breaking space (u202f) with regular space to prevent Invalid Date on some Node versions
  combinedStr = combinedStr.replace(/\u202f/g, ' ');

  const parsed = new Date(combinedStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  const cleanDateStr = dateStr.split(/\s+/)[0];
  let year = 0, month = 0, day = 0;
  if (cleanDateStr.includes('/')) {
    const parts = cleanDateStr.split('/');
    if (parts[2]?.length === 4) {
      // Check if parts[0] is month or day. Standard US dates or Middle East dates
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
      year = parseInt(parts[2], 10);
    }
  }
  
  if (!year || isNaN(year)) return null;
  return new Date(year, month, day);
}

async function main() {
  const filePath = path.join(__dirname, '../../Mutamers-Report_1782501624953.xlsx');
  console.log('Reading Excel report:', filePath);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Loaded ${rows.length} rows.`);

  // Group Excel rows by Group Number
  const rowsByGroup = {};
  for (const row of rows) {
    const gNum = String(getRowValue(row, ['Group number', 'GroupNumber']) || '').trim();
    if (gNum) {
      if (!rowsByGroup[gNum]) rowsByGroup[gNum] = [];
      rowsByGroup[gNum].push(row);
    }
  }

  console.log(`Grouped into ${Object.keys(rowsByGroup).length} Excel groups.`);

  // Find candidate bookings
  const candidateBookings = await prisma.umrahVisaBooking.findMany({
    where: { isDeleted: false, groupNumber: { not: null } },
    include: {
      party: true,
      travelDetails: { where: { isAlternate: false } }
    }
  });

  console.log(`Fetched ${candidateBookings.length} database bookings with groupNumber.`);

  const bookingByGroupMap = new Map();
  for (const b of candidateBookings) {
    const parts = b.groupNumber.split(/[\s,]+/).map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      bookingByGroupMap.set(part, b);
    }
  }

  let matchedGroupCount = 0;
  let totalMismatchesSimulated = 0;
  const subAgentStatsMap = new Map();

  const getOrInitStats = (partyId) => {
    if (!subAgentStatsMap.has(partyId)) {
      subAgentStatsMap.set(partyId, {
        partyName: '',
        totalArrivals: 0,
        totalDepartures: 0,
        arrivalMismatches: 0,
        departureMismatches: 0,
        severeViolations: 0
      });
    }
    return subAgentStatsMap.get(partyId);
  };

  const windowDays = 30;
  const thirtyDaysAgo = new Date('2026-06-27'); // Let's use the local time from additional metadata
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - windowDays);
  console.log('Simulation Current Date: 2026-06-27');
  console.log('Simulation Window Starts:', thirtyDaysAgo.toISOString());

  for (const [gNum, excelRows] of Object.entries(rowsByGroup)) {
    const booking = bookingByGroupMap.get(gNum);
    if (!booking) continue;

    matchedGroupCount++;
    const stats = getOrInitStats(booking.partyId);
    stats.partyName = booking.party?.partyName || 'Unknown Agent';

    for (const row of excelRows) {
      const entryDateRaw = getRowValue(row, ['Entry Date']);
      const entryTimeRaw = getRowValue(row, ['Entry Time']);
      const exitDateRaw = getRowValue(row, ['Exit Date']);
      const exitTimeRaw = getRowValue(row, ['Exit Time']);

      const entryDate = parseExcelDate(entryDateRaw, entryTimeRaw);
      const exitDate = parseExcelDate(exitDateRaw, exitTimeRaw);

      const isArrivalInWindow = entryDate && entryDate >= thirtyDaysAgo;
      const isDepartureInWindow = exitDate && exitDate >= thirtyDaysAgo;

      // Dummy mismatch check (let's assume 10% of records mismatch for simulation or read actual if needed)
      // For simulation, let's see if dates are parsed and matched
      if (entryDate) {
        if (isArrivalInWindow) {
          stats.totalArrivals++;
          // simulate mismatch if flight is different
          const arrivalFlight = getRowValue(row, ['Arrival Flight Number']);
          if (arrivalFlight && booking.travelDetails?.[0] && booking.travelDetails[0].arrivalFlightNumber !== arrivalFlight) {
            stats.arrivalMismatches++;
            totalMismatchesSimulated++;
          }
        }
      }

      if (exitDate) {
        if (isDepartureInWindow) {
          stats.totalDepartures++;
          const departureFlight = getRowValue(row, ['Departure Flight Number']);
          if (departureFlight && booking.travelDetails?.[0] && booking.travelDetails[0].departureFlightNumber !== departureFlight) {
            stats.departureMismatches++;
            totalMismatchesSimulated++;
          }
        }
      }

      const mutamerStatus = String(getRowValue(row, ['Mutamer Status']) || '');
      const isSevere = mutamerStatus === 'Program Duration Exceeded' || mutamerStatus.toLowerCase().includes('runaway') || mutamerStatus.toLowerCase().includes('overstay');
      if (isSevere && (isArrivalInWindow || isDepartureInWindow)) {
        stats.severeViolations++;
      }
    }
  }

  console.log('\n--- Simulation Results ---');
  console.log('Total matched groups from Excel to DB:', matchedGroupCount);
  console.log('Total simulated mismatches:', totalMismatchesSimulated);
  console.log('Sub-Agent Stats Map:');
  for (const [partyId, stats] of subAgentStatsMap.entries()) {
    const BUFFER_CONSTANT = 10;
    const ARRIVAL_WEIGHT = 1.0;
    const DEPARTURE_WEIGHT = 2.0;
    const YELLOW_THRESHOLD = 0.02;
    const RED_THRESHOLD = 0.05;

    const R_A = stats.arrivalMismatches / (stats.totalArrivals + BUFFER_CONSTANT);
    const R_D = stats.departureMismatches / (stats.totalDepartures + BUFFER_CONSTANT);
    const score = ((R_A * ARRIVAL_WEIGHT) + (R_D * DEPARTURE_WEIGHT)) / (ARRIVAL_WEIGHT + DEPARTURE_WEIGHT);

    let status = 'GREEN';
    if (score >= RED_THRESHOLD || stats.severeViolations > 0) status = 'RED';
    else if (score >= YELLOW_THRESHOLD) status = 'YELLOW';

    console.log(`Agent: ${stats.partyName}`);
    console.log(`  Score: ${score.toFixed(6)} (${status})`);
    console.log(`  Arrivals: ${stats.totalArrivals} (Mismatches: ${stats.arrivalMismatches})`);
    console.log(`  Departures: ${stats.totalDepartures} (Mismatches: ${stats.departureMismatches})`);
    console.log(`  Severe Violations: ${stats.severeViolations}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
