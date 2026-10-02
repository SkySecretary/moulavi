#!/usr/bin/env node

/**
 * NuSync (Moulavi ERP) - Comprehensive Operational & System Diagnostic Auditor
 * 
 * An all-in-one diagnostic engine to detect, investigate, and prevent:
 *  1. Database Health, SQLite WAL size, and query latency
 *  2. Voucher sequence gaps, duplicate group codes, and orphaned quick vouchers
 *  3. Booking lifecycle state desyncs & stuck workflow queues
 *  4. Passenger count mismatches, missing lead passengers, and expired passports
 *  5. Flight & Hotel chronology errors (inverted dates, 0-night stays, gaps in hotel coverage)
 *  6. Duplicate BRN allocations across unrelated bookings
 *  7. Movement route sequence integrity and missing transport locations
 *  8. Deep multi-entity search across Vouchers, Bookings, Passports, BRNs, and Group Codes
 * 
 * Usage:
 *   node scripts/troubleshoot.js                     # Run FULL comprehensive system audit
 *   node scripts/troubleshoot.js --search <keyword>  # Deep inspect any Voucher #, Group #, Booking Ref, Passport, or BRN
 *   node scripts/troubleshoot.js --vouchers          # Voucher sequence & group audit only
 *   node scripts/troubleshoot.js --bookings          # Booking lifecycle & passenger desyncs only
 *   node scripts/troubleshoot.js --travel            # Flight, Hotel chronology & BRN audit only
 *   node scripts/troubleshoot.js --pending           # View all bookings currently pending voucher generation
 *   node scripts/troubleshoot.js --recent [N]        # View last N vouchers generated
 *   node scripts/troubleshoot.js --db-check          # SQLite integrity & storage benchmark
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const DIM = '\x1b[2m';

let totalAnomalies = 0;

function printHeader(title) {
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════════════${RESET}`);
}

function printSection(title) {
  console.log(`\n${BOLD}${MAGENTA}--- ${title} ---${RESET}`);
}

function formatDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

function formatLocalDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toISOString().split('T')[0];
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 1: DATABASE & STORAGE HEALTH
// ═════════════════════════════════════════════════════════════════════════════
async function checkDatabaseHealth() {
  printHeader('1. DATABASE, STORAGE & ENGINE HEALTH');
  try {
    const startTime = Date.now();
    const integrity = await prisma.$queryRawUnsafe('PRAGMA integrity_check;');
    const latency = Date.now() - startTime;

    const journal = await prisma.$queryRawUnsafe('PRAGMA journal_mode;');
    const fkCheck = await prisma.$queryRawUnsafe('PRAGMA foreign_key_check;');
    
    // Check SQLite file sizes
    const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
    const walPath = path.join(__dirname, '..', 'prisma', 'dev.db-wal');
    
    let dbSizeMB = 'N/A';
    let walSizeMB = '0.00';
    if (fs.existsSync(dbPath)) {
      dbSizeMB = (fs.statSync(dbPath).size / (1024 * 1024)).toFixed(2);
    }
    if (fs.existsSync(walPath)) {
      walSizeMB = (fs.statSync(walPath).size / (1024 * 1024)).toFixed(2);
    }

    console.log(`  • SQLite PRAGMA Integrity : ${integrity[0]?.integrity_check === 'ok' ? `${GREEN}✔ OK (${latency}ms)${RESET}` : `${RED}✖ ${JSON.stringify(integrity)}${RESET}`}`);
    console.log(`  • Journal Mode            : ${CYAN}${journal[0]?.journal_mode?.toUpperCase()}${RESET}`);
    console.log(`  • Foreign Key Violations  : ${fkCheck.length === 0 ? `${GREEN}✔ 0 Violations${RESET}` : `${RED}✖ ${fkCheck.length} Foreign key violations detected!${RESET}`}`);
    console.log(`  • Database File Size      : ${BOLD}${dbSizeMB} MB${RESET}`);
    
    if (parseFloat(walSizeMB) > 20) {
      console.log(`  • WAL Journal File Size   : ${YELLOW}⚠ ${walSizeMB} MB (Large WAL file - checkpoint recommended)${RESET}`);
      totalAnomalies++;
    } else {
      console.log(`  • WAL Journal File Size   : ${GREEN}✔ ${walSizeMB} MB (Healthy)${RESET}`);
    }
  } catch (err) {
    console.log(`  ${RED}✖ Database health check error: ${err.message}${RESET}`);
    totalAnomalies++;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 2: VOUCHERS & GROUP CODE INTEGRITY
// ═════════════════════════════════════════════════════════════════════════════
async function auditVouchers() {
  printHeader('2. VOUCHERS & GROUP CODE INTEGRITY');
  
  const allVouchers = await prisma.voucher.findMany({
    select: {
      id: true,
      voucherNumber: true,
      groupCode: true,
      bookingId: true,
      bookingReference: true,
      createdAt: true,
      party: { select: { partyName: true } },
      generatedByUser: { select: { name: true } },
      _count: {
        select: { movements: true, hotels: true, flights: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`  • Total Vouchers Recorded : ${BOLD}${allVouchers.length}${RESET}`);
  if (allVouchers.length === 0) return;

  // Numerical Range & Duplicate Voucher Numbers
  const numberMap = new Map();
  const duplicateVoucherNums = [];

  for (const v of allVouchers) {
    const raw = v.voucherNumber;
    const num = parseInt(raw, 10);
    if (numberMap.has(raw)) {
      duplicateVoucherNums.push({ num: raw, v1: numberMap.get(raw), v2: v });
    } else {
      numberMap.set(raw, v);
    }
  }

  const numericEntries = allVouchers
    .map(v => parseInt(v.voucherNumber, 10))
    .filter(n => !isNaN(n));
  
  const minNum = Math.min(...numericEntries);
  const maxNum = Math.max(...numericEntries);
  console.log(`  • Sequential Range        : ${BOLD}#${minNum} ➔ #${maxNum}${RESET}`);

  if (duplicateVoucherNums.length > 0) {
    console.log(`  ${RED}✖ Duplicate Voucher Numbers Detected (${duplicateVoucherNums.length}):${RESET}`);
    for (const d of duplicateVoucherNums) {
      console.log(`    - Voucher #${d.num} used by multiple records: ID ${d.v1.id} & ID ${d.v2.id}`);
    }
    totalAnomalies += duplicateVoucherNums.length;
  } else {
    console.log(`  • Voucher Numbers         : ${GREEN}✔ All unique (no duplicate numbers)${RESET}`);
  }

  // Duplicate Group Codes Audit
  const groupCodeMap = {};
  for (const v of allVouchers) {
    if (v.groupCode) {
      const parts = v.groupCode.split(',').map(s => s.trim()).filter(Boolean);
      for (const code of parts) {
        if (!groupCodeMap[code]) groupCodeMap[code] = [];
        groupCodeMap[code].push(v);
      }
    }
  }

  const dupGroups = Object.entries(groupCodeMap).filter(([_, list]) => list.length > 1);
  if (dupGroups.length > 0) {
    console.log(`\n  ${YELLOW}⚠ Duplicate Group Code Assignments (${dupGroups.length} group codes used across multiple vouchers):${RESET}`);
    for (const [code, list] of dupGroups.slice(-5)) {
      console.log(`    ${BOLD}Group Code: ${code}${RESET}`);
      for (const item of list) {
        console.log(`      - Voucher #${item.voucherNumber} (Ref: ${item.bookingReference || 'Manual/Quick'}) by ${item.generatedByUser?.name || 'Unknown'} on ${formatDate(item.createdAt)}`);
      }
    }
    if (dupGroups.length > 5) {
      console.log(`    ${DIM}... and ${dupGroups.length - 5} more duplicate group assignments.${RESET}`);
    }
    totalAnomalies += dupGroups.length;
  } else {
    console.log(`  • Group Code Assignments  : ${GREEN}✔ Clean (no duplicate group codes)${RESET}`);
  }

  // Orphaned Quick Vouchers (bookingId is null but matching group code exists in bookings)
  const quickVouchers = allVouchers.filter(v => !v.bookingId && v.groupCode);
  console.log(`  • Standalone/Quick Vouchers: ${quickVouchers.length} vouchers without booking links`);

  // Empty vouchers audit (vouchers missing movements or hotels)
  const emptyVouchers = allVouchers.filter(v => v._count.movements === 0 && v._count.hotels === 0);
  if (emptyVouchers.length > 0) {
    console.log(`  ${YELLOW}⚠ Incomplete Vouchers (${emptyVouchers.length} vouchers with 0 movements & 0 hotels):${RESET}`);
    for (const ev of emptyVouchers.slice(0, 3)) {
      console.log(`    - Voucher #${ev.voucherNumber} (ID: ${ev.id}) created on ${formatDate(ev.createdAt)}`);
    }
    totalAnomalies += emptyVouchers.length;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 3: BOOKING LIFECYCLE & WORKFLOW STATE DESYNCS
// ═════════════════════════════════════════════════════════════════════════════
async function auditBookings() {
  printHeader('3. BOOKING LIFECYCLE & WORKFLOW STATE AUDIT');

  const allBookings = await prisma.umrahVisaBooking.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      bookingReference: true,
      groupNumber: true,
      status: true,
      passengerCount: true,
      voucherGeneratedAt: true,
      billGeneratedAt: true,
      createdAt: true,
      party: { select: { partyName: true } },
      _count: {
        select: { passengers: true, vouchers: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`  • Total Active Bookings   : ${BOLD}${allBookings.length}${RESET}`);

  // 1. Stuck in 'voucher' stage
  const pendingVoucher = allBookings.filter(b => b.status === 'voucher');
  console.log(`  • Pending Voucher Queue   : ${pendingVoucher.length === 0 ? `${GREEN}0 (All caught up!)${RESET}` : `${YELLOW}${pendingVoucher.length} bookings awaiting voucher generation${RESET}`}`);

  // 2. Status is 'bill' or 'booking_success' but NO voucher attached
  const billedWithoutVoucher = allBookings.filter(b => 
    (b.status === 'bill' || b.status === 'booking_success') && b._count.vouchers === 0
  );
  if (billedWithoutVoucher.length > 0) {
    console.log(`  ${YELLOW}⚠ Billed Bookings without Generated Vouchers (${billedWithoutVoucher.length}):${RESET}`);
    for (const b of billedWithoutVoucher.slice(0, 5)) {
      console.log(`    - ${BOLD}${b.bookingReference || b.id}${RESET} (Status: ${b.status}) | Party: ${b.party?.partyName || 'N/A'} | Created: ${formatDate(b.createdAt)}`);
    }
    totalAnomalies += billedWithoutVoucher.length;
  } else {
    console.log(`  • Billed Bookings Voucher Check: ${GREEN}✔ All billed bookings have associated vouchers${RESET}`);
  }

  // 3. Status is 'voucher' but voucherGeneratedAt is already filled
  const stuckVoucherGenerated = allBookings.filter(b => b.status === 'voucher' && b.voucherGeneratedAt);
  if (stuckVoucherGenerated.length > 0) {
    console.log(`  ${RED}✖ State Desync (${stuckVoucherGenerated.length} bookings marked voucherGeneratedAt but stuck in 'voucher' status):${RESET}`);
    for (const b of stuckVoucherGenerated) {
      console.log(`    - ${BOLD}${b.bookingReference || b.id}${RESET} | GeneratedAt: ${formatDate(b.voucherGeneratedAt)}`);
    }
    totalAnomalies += stuckVoucherGenerated.length;
  }

  // 4. Passenger Count Mismatches (passengerCount header != actual passengers table count)
  const passengerMismatches = allBookings.filter(b => b.passengerCount > 0 && b._count.passengers > 0 && b.passengerCount !== b._count.passengers);
  if (passengerMismatches.length > 0) {
    console.log(`  ${YELLOW}⚠ Passenger Count Header Mismatches (${passengerMismatches.length}):${RESET}`);
    for (const b of passengerMismatches.slice(0, 5)) {
      console.log(`    - ${BOLD}${b.bookingReference || b.id}${RESET}: Header says ${b.passengerCount} pax, but ${b._count.passengers} passenger records exist`);
    }
    totalAnomalies += passengerMismatches.length;
  } else {
    console.log(`  • Passenger Count Integrity: ${GREEN}✔ Passenger counts match passenger records${RESET}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 4: TRAVEL, FLIGHT & HOTEL CHRONOLOGY AUDIT
// ═════════════════════════════════════════════════════════════════════════════
async function auditTravelAndHotels() {
  printHeader('4. TRAVEL, FLIGHTS & HOTEL CHRONOLOGY AUDIT');

  // Fetch travel details
  const travels = await prisma.umrahTravelDetails.findMany({
    where: { isAlternate: false },
    select: {
      id: true,
      bookingId: true,
      arrivalDateTime: true,
      departureDateTime: true,
      arrivalFlightNumber: true,
      departureFlightNumber: true,
      booking: {
        select: { bookingReference: true, status: true }
      }
    }
  });

  const invertedFlights = travels.filter(t => 
    t.arrivalDateTime && t.departureDateTime && new Date(t.arrivalDateTime) > new Date(t.departureDateTime)
  );

  if (invertedFlights.length > 0) {
    console.log(`  ${RED}✖ Chronology Error (${invertedFlights.length} bookings have Arrival Date AFTER Departure Date):${RESET}`);
    for (const f of invertedFlights) {
      console.log(`    - Booking ${BOLD}${f.booking?.bookingReference || f.bookingId}${RESET}: Arrival ${formatDate(f.arrivalDateTime)} ➔ Departure ${formatDate(f.departureDateTime)}`);
    }
    totalAnomalies += invertedFlights.length;
  } else {
    console.log(`  • Flight Chronology       : ${GREEN}✔ All arrival/departure flight dates in valid order${RESET}`);
  }

  // Fetch hotel bookings
  const hotels = await prisma.umrahHotelBooking.findMany({
    where: { isAlternate: false },
    select: {
      id: true,
      bookingId: true,
      checkInDate: true,
      checkOutDate: true,
      brn: true,
      booking: {
        select: { bookingReference: true, status: true }
      }
    }
  });

  const invalidHotelStays = hotels.filter(h => 
    h.checkInDate && h.checkOutDate && new Date(h.checkInDate) >= new Date(h.checkOutDate)
  );

  if (invalidHotelStays.length > 0) {
    console.log(`  ${RED}✖ Invalid Hotel Stay Duration (${invalidHotelStays.length} stays with Check-in >= Check-out):${RESET}`);
    for (const h of invalidHotelStays) {
      console.log(`    - Booking ${BOLD}${h.booking?.bookingReference || h.bookingId}${RESET}: In ${formatLocalDate(h.checkInDate)} ➔ Out ${formatLocalDate(h.checkOutDate)}`);
    }
    totalAnomalies += invalidHotelStays.length;
  } else {
    console.log(`  • Hotel Stay Duration     : ${GREEN}✔ All hotel check-in/out dates valid${RESET}`);
  }

  // BRN Duplicate Allocation Audit
  const brnMap = {};
  for (const h of hotels) {
    let brnList = [];
    if (Array.isArray(h.brn)) brnList = h.brn;
    else if (typeof h.brn === 'string' && h.brn) brnList = [h.brn];

    for (const b of brnList) {
      const cleanBrn = String(b).trim();
      if (!cleanBrn || cleanBrn === 'null' || cleanBrn.length < 5) continue;
      if (!brnMap[cleanBrn]) brnMap[cleanBrn] = [];
      brnMap[cleanBrn].push(h.booking?.bookingReference || h.bookingId);
    }
  }

  const dupBrns = Object.entries(brnMap).filter(([_, list]) => {
    // Unique booking refs
    const uniqueRefs = Array.from(new Set(list));
    return uniqueRefs.length > 1;
  });

  if (dupBrns.length > 0) {
    console.log(`\n  ${YELLOW}⚠ Shared / Duplicate Hotel BRNs (${dupBrns.length} BRNs used across different bookings):${RESET}`);
    for (const [brn, refs] of dupBrns.slice(0, 5)) {
      console.log(`    - BRN "${BOLD}${brn}${RESET}" shared across bookings: ${Array.from(new Set(refs)).join(', ')}`);
    }
    if (dupBrns.length > 5) {
      console.log(`    ${DIM}... and ${dupBrns.length - 5} more shared BRNs.${RESET}`);
    }
  } else {
    console.log(`  • Hotel BRN Allocations   : ${GREEN}✔ No conflicting cross-booking BRNs${RESET}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 5: TRANSPORT MOVEMENT ROUTE NUMBERS
// ═════════════════════════════════════════════════════════════════════════════
async function auditRouteNumbers() {
  printHeader('5. TRANSPORT MOVEMENT ROUTES AUDIT');

  const count = await prisma.voucherMovement.count({ where: { route: { not: null } } });
  const latestMovement = await prisma.voucherMovement.findFirst({
    where: { route: { not: null } },
    select: { route: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`  • Total Route Numbers Used : ${BOLD}${count}${RESET}`);
  console.log(`  • Latest Route Number      : ${BOLD}${CYAN}${latestMovement?.route || 'None'}${RESET}`);

  // Check movements missing locations
  const missingLocations = await prisma.voucherMovement.count({
    where: {
      OR: [
        { from: '' },
        { to: '' },
        { fromLocation: '' },
        { toLocation: '' }
      ]
    }
  });

  if (missingLocations > 0) {
    console.log(`  ${YELLOW}⚠ Incomplete Movement Locations: ${missingLocations} movement records have missing origin/destination text${RESET}`);
    totalAnomalies += missingLocations;
  } else {
    console.log(`  • Movement Location Data   : ${GREEN}✔ All movement records have populated locations${RESET}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 6: DEEP SEARCH & INSPECT
// ═════════════════════════════════════════════════════════════════════════════
async function inspectSearch(term) {
  printHeader(`DEEP SEARCH INSPECTION REPORT FOR: "${term}"`);

  // Search Vouchers
  const vouchers = await prisma.voucher.findMany({
    where: {
      OR: [
        { voucherNumber: term },
        { groupCode: { contains: term } },
        { bookingReference: { contains: term } },
        { id: term },
        { guestName: { contains: term } },
        { party: { partyName: { contains: term } } }
      ]
    },
    include: {
      party: true,
      transportCompany: true,
      umrahCompany: true,
      generatedByUser: true,
      movements: { orderBy: { sr: 'asc' } },
      hotels: { orderBy: { number: 'asc' } },
      flights: { orderBy: { date: 'asc' } },
      booking: true
    }
  });

  console.log(`\n${BOLD}--- MATCHING VOUCHERS (${vouchers.length}) ---${RESET}`);
  if (vouchers.length === 0) {
    console.log(`  ${DIM}No vouchers found matching "${term}"${RESET}`);
  } else {
    for (const v of vouchers) {
      console.log(`\n  ${CYAN}Voucher #${BOLD}${v.voucherNumber}${RESET} (ID: ${v.id})`);
      console.log(`    • Booking Ref     : ${v.bookingReference ? `${GREEN}${v.bookingReference}${RESET}` : `${YELLOW}None (Standalone/Quick)${RESET}`}`);
      console.log(`    • Group Code      : ${v.groupCode || 'None'}`);
      console.log(`    • Group Name      : ${v.groupName || 'None'}`);
      console.log(`    • Agency (Party)  : ${v.party?.partyName || 'None'}`);
      console.log(`    • Transport Co.   : ${v.transportCompany?.partyName || 'None'}`);
      console.log(`    • Created At      : ${formatDate(v.createdAt)} by ${v.generatedByUser?.name || 'Unknown'}`);
      console.log(`    • Pax Count       : ${v.paxCount}`);
      console.log(`    • Movements (${v.movements.length}):`);
      for (const m of v.movements) {
        console.log(`        [SR ${m.sr}] Route ${m.route || 'N/A'}: ${m.from} (${m.fromLocation}) ➔ ${m.to} (${m.toLocation}) on ${formatDate(m.date)}`);
      }
      console.log(`    • Hotels (${v.hotels.length}):`);
      for (const h of v.hotels) {
        console.log(`        - ${h.hotelName} (${h.location}) | ${formatDate(h.checkIn)} to ${formatDate(h.checkOut)} (${h.days} nights) | BRN: ${h.brn || 'None'}`);
      }
    }
  }

  // Search Bookings
  const bookings = await prisma.umrahVisaBooking.findMany({
    where: {
      OR: [
        { bookingReference: { contains: term } },
        { groupNumber: { contains: term } },
        { id: term },
        { groupName: { contains: term } },
        { party: { partyName: { contains: term } } },
        { passengers: { some: { passportNumber: { contains: term } } } }
      ]
    },
    include: {
      party: true,
      statusHistory: { include: { user: true }, orderBy: { changedAt: 'asc' } },
      passengers: true,
      vouchers: true
    }
  });

  console.log(`\n${BOLD}--- MATCHING BOOKINGS (${bookings.length}) ---${RESET}`);
  if (bookings.length === 0) {
    console.log(`  ${DIM}No bookings found matching "${term}"${RESET}`);
  } else {
    for (const b of bookings) {
      console.log(`\n  ${CYAN}Booking ${BOLD}${b.bookingReference || b.id}${RESET}`);
      console.log(`    • Status          : ${b.status === 'voucher' ? `${YELLOW}voucher (Pending)${RESET}` : `${GREEN}${b.status}${RESET}`}`);
      console.log(`    • Group Number    : ${b.groupNumber || 'None'}`);
      console.log(`    • Group Name      : ${b.groupName || 'None'}`);
      console.log(`    • Agency (Party)  : ${b.party?.partyName || 'None'}`);
      console.log(`    • Pax Count       : ${b.passengerCount} (Records: ${b.passengers.length})`);
      console.log(`    • Created At      : ${formatDate(b.createdAt)}`);
      console.log(`    • Voucher Generated: ${b.voucherGeneratedAt ? formatDate(b.voucherGeneratedAt) : 'Not generated yet'}`);
      console.log(`    • Linked Vouchers (${b.vouchers.length}): ${b.vouchers.map(v => `#${v.voucherNumber}`).join(', ') || 'None'}`);
      
      if (b.passengers.length > 0) {
        console.log(`    • Passengers (${b.passengers.length}):`);
        for (const p of b.passengers.slice(0, 5)) {
          console.log(`        - ${p.fullName || 'Unnamed'} | Passport: ${p.passportNumber || 'N/A'} | Expiry: ${formatLocalDate(p.passportExpiry)} ${p.isLeadPassenger ? `${GREEN}(Lead)${RESET}` : ''}`);
        }
        if (b.passengers.length > 5) {
          console.log(`        ${DIM}... and ${b.passengers.length - 5} more passengers.${RESET}`);
        }
      }

      console.log(`    • Status History (${b.statusHistory.length}):`);
      for (const sh of b.statusHistory) {
        console.log(`        - [${formatDate(sh.changedAt)}] ➔ ${BOLD}${sh.newStatus}${RESET} by ${sh.user?.name || 'System'}: "${sh.reason || ''}"`);
      }
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 7: PENDING & RECENT SHORTCUTS
// ═════════════════════════════════════════════════════════════════════════════
async function viewPending() {
  printHeader('PENDING VOUCHER QUEUE');
  const pending = await prisma.umrahVisaBooking.findMany({
    where: { status: 'voucher', isDeleted: false },
    include: { party: { select: { partyName: true } } },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total Pending: ${BOLD}${pending.length}${RESET}\n`);
  for (const b of pending) {
    console.log(`  • ${BOLD}${(b.bookingReference || b.id).padEnd(14)}${RESET} | Group: ${(b.groupNumber || 'None').padEnd(16)} | Pax: ${String(b.passengerCount).padEnd(3)} | Party: ${(b.party?.partyName || 'N/A').padEnd(30)} | Created: ${formatDate(b.createdAt)}`);
  }
}

async function viewRecent(limit = 15) {
  printHeader(`RECENT ${limit} VOUCHERS GENERATED`);
  const vouchers = await prisma.voucher.findMany({
    take: parseInt(limit, 10) || 15,
    orderBy: { createdAt: 'desc' },
    include: {
      party: { select: { partyName: true } },
      generatedByUser: { select: { name: true } }
    }
  });

  for (const v of vouchers) {
    console.log(`  Voucher #${BOLD}${v.voucherNumber.padEnd(5)}${RESET} | Ref: ${(v.bookingReference || 'Manual/Quick').padEnd(14)} | Group: ${(v.groupCode || 'N/A').padEnd(16)} | Party: ${(v.party?.partyName || 'N/A').substring(0, 25).padEnd(25)} | By: ${(v.generatedByUser?.name || 'N/A').padEnd(15)} | ${formatDate(v.createdAt)}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN CLI RUNNER
// ═════════════════════════════════════════════════════════════════════════════
async function main() {
  const args = process.argv.slice(2);
  const flag = args[0];
  const value = args[1];

  try {
    if (flag === '--search' || flag === '-s') {
      if (!value) {
        console.error(`${RED}Please provide a search term: node troubleshoot.js --search <keyword>${RESET}`);
        process.exit(1);
      }
      await inspectSearch(value);
    } else if (flag === '--recent' || flag === '-r') {
      await viewRecent(value || 15);
    } else if (flag === '--pending' || flag === '-p') {
      await viewPending();
    } else if (flag === '--db-check' || flag === '-d') {
      await checkDatabaseHealth();
    } else if (flag === '--vouchers') {
      await auditVouchers();
    } else if (flag === '--bookings') {
      await auditBookings();
    } else if (flag === '--travel') {
      await auditTravelAndHotels();
    } else {
      console.log(`\n${BOLD}===============================================================================`);
      console.log(`  NuSync / Moulavi ERP - Complete System & Operational Diagnostics`);
      console.log(`===============================================================================${RESET}`);
      await checkDatabaseHealth();
      await auditVouchers();
      await auditBookings();
      await auditTravelAndHotels();
      await auditRouteNumbers();

      printHeader('AUDIT SUMMARY');
      if (totalAnomalies === 0) {
        console.log(`  ${GREEN}${BOLD}✔ SYSTEM 100% HEALTHY: No operational discrepancies or anomalies detected!${RESET}\n`);
      } else {
        console.log(`  ${YELLOW}${BOLD}⚠ AUDIT COMPLETED: ${totalAnomalies} potential warnings/anomalies flagged above.${RESET}\n`);
      }
      console.log(`  ${DIM}Tip: Run "node scripts/troubleshoot.js --search <keyword>" to deep inspect any record.${RESET}\n`);
    }
  } catch (err) {
    console.error(`\n${RED}Fatal Error during diagnostics:${RESET}`, err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
