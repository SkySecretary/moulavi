import puppeteer from 'puppeteer';
import { VoucherPdfData } from '../types/voucher';

// Helper to safely parse date strings or objects
function parseSafeDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  
  const dateStr = String(dateInput);
  
  // Handle DD-MM-YYYY format
  const ddmmyyyyMatch = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (ddmmyyyyMatch) {
    const [_, day, month, year] = ddmmyyyyMatch;
    return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
  }
  
  // Skip if it looks like just a time (HH:mm)
  if (dateStr.match(/^\d{1,2}:\d{2}$/)) {
    return null;
  }
  
  const date = new Date(dateInput);
  return isNaN(date.getTime()) ? null : date;
}

// Helper function to format date (DD-MM-YYYY)
function formatDate(dateInput: any): string {
  const date = parseSafeDate(dateInput);
  if (!date) return 'N/A';
  
  const day = date.getUTCDate().toString().padStart(2, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

// Helper function to format date (DD-MMM-YY)
function formatDateYY(dateInput: any): string {
  const date = parseSafeDate(dateInput);
  if (!date) return 'N/A';
  
  const day = date.getUTCDate().toString().padStart(2, '0');
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}

// Helper function to format time (HH:MM)
function formatTime(timeInput: any): string {
  if (!timeInput) return 'N/A';
  
  const timeString = String(timeInput);

  // If it's already HH:mm or HH:mm:ss, just clean it and return
  const hmmmMatch = timeString.match(/^(\d{1,2}):(\d{2})/);
  if (hmmmMatch && !timeString.includes('T') && isNaN(Number(timeInput))) {
    return `${hmmmMatch[1].padStart(2, '0')}:${hmmmMatch[2].padStart(2, '0')}`;
  }
  
  // If it's a Date object, ISO string, or numeric timestamp, use UTC methods
  const date = new Date(timeInput);
  if (!isNaN(date.getTime())) {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  return 'N/A';
}

// Helper to extract 3-letter airport code
function extractAirportCode(str: string | undefined): string {
  if (!str) return 'N/A';
  
  // Clean string: trim and uppercase
  const cleanStr = str.trim().toUpperCase();
  
  // If it's already a 3 or 4-letter code (or looks like one)
  if ((cleanStr.length === 3 || cleanStr.length === 4) && /^[A-Z0-9]+$/i.test(cleanStr)) {
    return cleanStr;
  }

  // Look for code in parentheses or as a standalone word
  const match = cleanStr.match(/\(([A-Z0-9]{3,4})\)/i) || cleanStr.match(/\b([A-Z0-9]{3,4})\b/);
  if (match) return match[1].toUpperCase();
  
  const lowerStr = cleanStr.toLowerCase();
  if (lowerStr.includes('madinah') || lowerStr.includes('medina') || lowerStr.includes('med')) return 'MED';
  if (lowerStr.includes('jeddah') || lowerStr.includes('jed')) return 'JED';
  if (lowerStr.includes('riyadh') || lowerStr.includes('ruh')) return 'RUH';
  if (lowerStr.includes('dammam') || lowerStr.includes('dmm')) return 'DMM';
  
  // If no code found, just return the string itself if it's short, or first 3 chars
  return cleanStr.length <= 5 ? cleanStr : cleanStr.substring(0, 3);
}

// Helper to get image as base64
function getImageAsBase64(filePath: string | undefined): string | null {
  if (!filePath) return null;
  const fs = require('fs');
  const path = require('path');
  
  try {
    if (filePath.startsWith('http')) return filePath;
    
    // Normalize path: if it contains 'uploads', ensure we use the relative version
    // joined with the current process working directory. This fixes issues where
    // absolute server paths were stored in the database.
    let targetPath = filePath;
    if (filePath.includes('uploads')) {
      const relativePath = filePath.replace(/.*[\/\\]uploads[\/\\]/, 'uploads/');
      targetPath = path.join(process.cwd(), relativePath);
    } else if (!path.isAbsolute(filePath)) {
      targetPath = path.join(process.cwd(), filePath);
    }
    
    if (fs.existsSync(targetPath)) {
      const bitmap = fs.readFileSync(targetPath);
      const extension = path.extname(targetPath).slice(1) || 'png';
      return `data:image/${extension};base64,${bitmap.toString('base64')}`;
    }
    
    console.warn(`[PDF-VOUCHER] Image file not found at path: ${targetPath} (original: ${filePath})`);
    return null;
  } catch (error) {
    console.error('[PDF-VOUCHER] Error converting image to base64:', error);
    return null;
  }
}

// Generate HTML template for voucher based EXACTLY on voucher.html with specific refinements
function generateVoucherHTML(data: VoucherPdfData & { isBookingVoucher?: boolean }): string {
  const umrahCompanyName = data.umrahCompany?.partyName || 'UMRA SERVICES';
  const agentName = data.agentParty?.partyName || 'N/A';
  const transportName = data.transportCompany?.partyName || 'N/A';
  const staticOpNumber = '+966 53 863 4100';
  const logoBase64 = getImageAsBase64(data.umrahCompany?.logoPath);
  const isBooking = !!data.isBookingVoucher;

  // Aggregate BRNs
  const brnsList = data.hotelSchedules
    .map(h => (h.brn && Array.isArray(h.brn)) ? h.brn.join(', ') : (h.brn || ''))
    .filter(b => b.length > 0)
    .join(', ') || 'N/A';

  const arrivalFlight = data.flightDetails.find(f => f.type === 'AA');
  const departureFlight = data.flightDetails.find(f => f.type === 'AD');

  // Compute dynamic vehicle type from movements
  const uniqueVehicles = Array.from(new Set(
    data.movementDetails
      .map(m => m.vehicleType)
      .filter(v => v && v.trim() !== '')
  )).join(', ');
  const displayVehicleType = uniqueVehicles || data.vehicleType || 'N/A';

  // Professional SVG Icons (PDF compatible)
  const icons = {
    bus: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="12" rx="2"/><path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><path d="M4 19v2"/><path d="M20 19v2"/><circle cx="7" cy="15" r="1"/><circle cx="17" cy="15" r="1"/></svg>`,
    phone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    users: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    calendar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    tags: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    shield: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3d167a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    hotel: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d167a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    bed: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v11"/><path d="M3 11h18"/><path d="M21 7v11"/><path d="M18 7v2"/><path d="M6 7v2"/></svg>`,
    landing: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d167a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17H2"/><path d="M20 7l-5.5 3.3L13 14l-2 2-3-1-2 2 2.4 1.1L7 21l2-1 3.2.7L16 17l4-3 2-2z"/></svg>`,
    takeoff: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d167a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M15.5 5.5l-5.5 3.3L9 12l-2 2-3-1-2 2 2.4 1.1L3 19l2-1 3.2.7L12 15l4-3 2-2z"/></svg>`,
    plane: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c19142" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-1 .1-1.4.5l-.3.3c-.4.4-.4 1.1 0 1.5L9 12l-5 5H2l1 1 3.2.7L9 22l1 1v-2l5-5 3.5 5.7c.4.4 1.1.4 1.5 0l.3-.3c.4-.4.6-.9.5-1.4z"/></svg>`,
    chevronRight: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c19142" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
    checkList: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3d167a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    truck: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isBooking ? 'Booking Voucher' : 'Transportation Voucher'} - ${data.voucherNumber}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-purple: #3d167a;
            --primary-gold: #c19142;
            --light-gold: #f4eee1;
            --text-dark: #222;
            --text-gray: #555;
            --border-color: #e0e0e0;
            --bg-color: #fff;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            color: var(--text-dark);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .voucher-container {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background-color: var(--bg-color);
            padding: 30px;
            position: relative;
        }

        /* --- Header --- */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
        }

        .logo-area {
            width: 20%;
            display: flex;
            align-items: center;
            justify-content: flex-start;
        }
        
        .logo-img {
            max-width: 120px;
            max-height: 80px;
            object-fit: contain;
        }

        .center-title {
            width: 55%;
            text-align: center;
            padding-top: 10px;
        }

        .main-title {
            color: var(--primary-purple);
            font-size: 24px;
            font-weight: 700;
            line-height: 1.2;
            margin: 0 0 10px 0;
            text-transform: uppercase;
        }

        .op-number-box {
            background-color: var(--primary-purple);
            color: white;
            display: inline-block;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            width: fit-content;
            margin: 15px auto 5px auto;
        }

        .transportation-text {
            font-size: 14px;
            font-weight: 600;
            margin-top: 5px;
        }

        .right-badges {
            width: 20%;
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 10px;
        }

        .powered-by {
            font-size: 10px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 5px;
            color: var(--text-gray);
        }

        .official-voucher {
            background-color: var(--primary-purple);
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
            font-weight: 700;
            text-align: center;
            font-size: 14px;
            width: 120px;
        }

        .ref-number {
            color: var(--primary-purple);
            font-weight: 700;
            font-size: 16px;
            border-bottom: 2px solid var(--primary-gold);
            padding-bottom: 2px;
        }

        /* --- Info Box --- */
        .info-box {
            border: 2px solid var(--primary-gold);
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 15px 20px;
        }

        .info-row:first-child {
            border-bottom: 1px dotted var(--primary-gold);
        }

        .info-item {
            display: flex;
            align-items: center;
            gap: 15px;
            flex: 1;
        }

        .info-icon {
            color: var(--primary-purple);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 30px;
        }

        .info-text {
            display: flex;
            flex-direction: column;
        }

        .info-label {
            color: var(--primary-gold);
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 3px;
        }

        .info-val {
            color: var(--text-dark);
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
        }

        /* --- Flight & Accom --- */
        .two-columns {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }

        .col {
            flex: 1;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            position: relative;
            padding-top: 35px;
        }

        .col-tab {
            position: absolute;
            top: -1px;
            left: -1px;
            padding: 6px 15px;
            border-radius: 8px 0 8px 0;
            font-size: 13px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
            color: white;
        }

        .flight-tab { background-color: var(--primary-purple); }
        .accom-tab { background-color: #d2a65a; }

        /* Flight Content */
        .flight-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            text-align: center;
        }

        .flight-leg {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .flight-label { font-size: 12px; font-weight: 700; color: var(--primary-purple); display: flex; align-items: center; justify-content: center; gap: 5px; }
        .flight-date { font-size: 13px; font-weight: 700; }
        .flight-time { font-size: 14px; font-weight: 700; color: var(--primary-gold); }
        .flight-airport { font-size: 14px; font-weight: 700; }
        .flight-code { font-size: 13px; font-weight: 700; color: var(--primary-gold); }

        .flight-divider {
            display: flex;
            align-items: center;
            color: var(--primary-gold);
        }
        .flight-divider::before {
            content: "";
            width: 30px;
            height: 1px;
            background-color: var(--primary-gold);
            border: 1px dashed var(--primary-gold);
            display: inline-block;
            margin-right: 5px;
        }

        /* Accom Content */
        .accom-content {
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .accom-item {
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        .accom-icon {
            color: var(--primary-purple);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 30px;
        }

        .accom-text { display: flex; flex-direction: column; gap: 3px; }
        .accom-name { font-size: 12px; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
        .accom-dates { font-size: 12px; color: var(--text-gray); }
        .iqama-info { font-size: 12px; font-weight: 600; color: var(--text-dark); }
        .iqama-label { color: var(--primary-purple); font-weight: 700; font-size: 10px; margin-right: 5px; text-transform: uppercase; }

        /* --- Itinerary Table --- */
        .itinerary-section {
            margin-bottom: 20px;
        }

        .itinerary-header {
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--primary-purple);
            font-weight: 700;
            margin-bottom: 10px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid var(--primary-purple);
            border-radius: 8px;
            overflow: hidden;
            font-size: 12px;
        }

        th {
            background-color: var(--primary-purple);
            color: white;
            font-weight: 600;
            padding: 10px;
            text-align: center;
        }

        td {
            padding: 12px 10px;
            text-align: center;
            border-bottom: 1px dotted #ccc;
            font-weight: 500;
            text-transform: uppercase;
        }
        
        tr:last-child td { border-bottom: none; }

        td.time-col { color: var(--primary-gold); font-weight: 700; }
        td.sr-col { font-weight: 700; }
        .via-bdr { color: var(--primary-gold); font-weight: 800; font-size: 10px; }

        /* --- Terms --- */
        .terms-section {
            margin-bottom: 20px;
            font-size: 11px;
            line-height: 1.5;
        }

        .terms-title {
            color: var(--primary-purple);
            font-weight: 700;
            margin-bottom: 10px;
            text-transform: uppercase;
        }

        .terms-list {
            list-style-type: disc;
            padding-left: 20px;
            margin: 0;
            color: #000;
        }

        .terms-list li { margin-bottom: 8px; }
        .terms-list strong { color: var(--primary-purple); }

        /* --- Footer --- */
        .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid var(--border-color);
        }

    </style>
</head>
<body>

<div class="voucher-container">
    
    <!-- Header -->
    <div class="header">
        <div class="logo-area">
            ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="Logo">` : `
            <div class="logo-placeholder">
                ${icons.bus}<br>
                <span style="font-size: 14px;">${umrahCompanyName}</span>
            </div>
            `}
        </div>

        <div class="center-title">
            <h1 class="main-title">${umrahCompanyName}</h1>
            ${!isBooking ? `
            <div class="op-number-box">
                ${icons.phone} &nbsp; OPERATION NUMBER: ${staticOpNumber}
            </div>
            <div class="transportation-text">Transportation: ${transportName}</div>
            ` : ''}
        </div>

        <div class="right-badges">
            <div class="powered-by">POWERED BY ${icons.chevronRight}${icons.chevronRight} NuSync</div>
            <div class="official-voucher">${isBooking ? 'BOOKING<br>VOUCHER' : 'OFFICIAL<br>VOUCHER'}</div>
            <div class="ref-number">${isBooking ? 'BOOKING NO' : 'REF'}: ${data.voucherNumber}</div>
        </div>
    </div>

    <!-- Info Box -->
    <div class="info-box">
        <div class="info-row">
            <div class="info-item">
                <div class="info-icon">${icons.user}</div>
                <div class="info-text">
                    <span class="info-label">AGENT</span>
                    <span class="info-val">${agentName}</span>
                </div>
            </div>
            <div class="info-item">
                <div class="info-icon">${icons.users}</div>
                <div class="info-text">
                    <span class="info-label">NO OF PAX</span>
                    <span class="info-val">${data.paxCount} PAX</span>
                </div>
            </div>
            <div class="info-item">
                <div class="info-icon">${icons.calendar}</div>
                <div class="info-text">
                    <span class="info-label">DATE OF ISSUE</span>
                    <span class="info-val">${formatDateYY(data.reservationDate)}</span>
                </div>
            </div>
            <div class="info-item">
                <div class="info-icon">${icons.truck}</div>
                <div class="info-text">
                    <span class="info-label">VEHICLE TYPE</span>
                    <span class="info-val">${displayVehicleType}</span>
                </div>
            </div>
        </div>
        <div class="info-row">
            <div class="info-item">
                <div class="info-icon" style="color: #666;">${icons.user}</div>
                <div class="info-text">
                    <span class="info-label">GUEST NAME</span>
                    <span class="info-val">${data.guestName || 'N/A'}</span>
                </div>
            </div>
            <div class="info-item">
                <div class="info-icon">${icons.phone}</div>
                <div class="info-text">
                    <span class="info-label">GUEST PHONE</span>
                    <span class="info-val">${data.guestMobile || 'N/A'}</span>
                </div>
            </div>
            <div class="info-item">
                <div class="info-icon">${icons.tags}</div>
                <div class="info-text">
                    <span class="info-label">GROUP CODE</span>
                    <span class="info-val">${data.groupCode || 'N/A'}</span>
                </div>
            </div>
            <div class="info-item" style="flex: 0.5;">
                <div class="info-icon">${icons.shield}</div>
                <div class="info-text">
                    <span class="info-label">BRN</span>
                    <span class="info-val">${brnsList}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Flight & Accom -->
    <div class="two-columns">
        <!-- Flight Connectivity -->
        <div class="col">
            <div class="col-tab flight-tab">${icons.plane.replace('stroke="#c19142"','stroke="white"')} &nbsp; Flight Details</div>
            <div class="flight-content">
                <div class="flight-leg">
                    <span class="flight-label">${icons.landing.replace('width="24"','width="16"').replace('height="24"','height="16"')} ARRIVAL</span>
                    <span class="flight-date">${arrivalFlight ? formatDateYY(arrivalFlight.date) : 'N/A'}</span>
                    <span class="flight-time">${arrivalFlight ? formatTime(arrivalFlight.eta || arrivalFlight.etd) : 'N/A'}</span>
                    <span class="flight-airport">${arrivalFlight ? extractAirportCode(arrivalFlight.arrivalAirport || arrivalFlight.from) : 'N/A'}</span>
                    <span class="flight-code">${arrivalFlight ? `${arrivalFlight.carrier} ${arrivalFlight.number}` : ''}</span>
                </div>
                <div class="flight-divider">
                    ${icons.plane}
                </div>
                <div class="flight-leg">
                    <span class="flight-label">${icons.takeoff.replace('width="24"','width="16"').replace('height="24"','height="16"')} DEPARTURE</span>
                    <span class="flight-date">${departureFlight ? formatDateYY(departureFlight.date) : 'N/A'}</span>
                    <span class="flight-time">${departureFlight ? formatTime(departureFlight.etd || departureFlight.eta) : 'N/A'}</span>
                    <span class="flight-airport">${departureFlight ? extractAirportCode(departureFlight.departureAirport || departureFlight.to) : 'N/A'}</span>
                    <span class="flight-code">${departureFlight ? `${departureFlight.carrier} ${departureFlight.number}` : ''}</span>
                </div>
            </div>
        </div>

        <!-- Accommodation / Iqama -->
        <div class="col">
            <div class="col-tab accom-tab">${icons.bed} &nbsp; ${data.iqamaDetails ? 'HOST DETAILS' : 'ACCOMMODATION'}</div>
            <div class="accom-content">
                ${data.iqamaDetails ? `
                <div class="accom-item">
                    <div class="accom-icon">${icons.user}</div>
                    <div class="accom-text">
                        <span class="accom-name">${data.iqamaDetails.name || 'N/A'}</span>
                        <div class="iqama-info"><span class="iqama-label">IQAMA:</span> ${data.iqamaDetails.number || 'N/A'}</div>
                        <div class="iqama-info"><span class="iqama-label">ADDR:</span> ${data.iqamaDetails.address || 'N/A'}</div>
                        <div class="iqama-info"><span class="iqama-label">DOB:</span> ${formatDateYY(data.iqamaDetails.dob)}</div>
                    </div>
                </div>
                ` : data.hotelSchedules.map(h => `
                <div class="accom-item">
                    <div class="accom-icon">${icons.hotel}</div>
                    <div class="accom-text">
                        <span class="accom-name">${h.hotelName} - ${h.location}</span>
                        <span class="accom-dates">${formatDateYY(h.checkIn)} TO ${formatDateYY(h.checkOut)}</span>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
    </div>

    <!-- Movement & Itinerary -->
    <div class="itinerary-section">
        <div class="itinerary-header">
             ${icons.checkList} &nbsp; MOVEMENT & ITINERARY
        </div>
        <table>
            <thead>
                <tr>
                    <th width="5%">SR</th>
                    <th width="15%">DATE</th>
                    <th width="10%">TIME</th>
                    <th width="35%">FROM LOCATION</th>
                    <th width="35%">TO LOCATION</th>
                </tr>
            </thead>
            <tbody>
                ${data.movementDetails.map((m, i) => {
                    const fromLocStr = (m.from || m.fromLocation || '').toLowerCase();
                    const toLocStr = (m.to || m.toLocation || '').toLowerCase();
                    const isMazarath = fromLocStr.includes('mazarath') || toLocStr.includes('mazarath');
                    const isFlight = (i === 0 && arrivalFlight) || (i === data.movementDetails.length - 1 && departureFlight);
                    let icon = icons.bus.replace('width="24"','width="16"').replace('height="24"','height="16"');
                    if (isMazarath) icon = '🕋';
                    if (isFlight) icon = i === 0 ? icons.landing.replace('width="24"','width="16"').replace('height="24"','height="16"') : icons.takeoff.replace('width="24"','width="16"').replace('height="24"','height="16"');

                    return `
                    <tr>
                        <td class="sr-col">${m.sr || i + 1}</td>
                        <td>${formatDateYY(m.date)}</td>
                        <td class="time-col">${formatTime(m.time)}</td>
                        <td>
                            ${m.from || 'N/A'} ${m.fromLocation ? `<br><span style="font-size: 9px; color: #6b7280;">(${m.fromLocation})</span>` : ''}
                            ${m.viaBdr ? `<span style="font-size: 9px; color: var(--primary-gold); font-weight: bold; margin-left: 5px;">(VIA BDR)</span>` : ''}
                        </td>
                        <td>${m.to || 'N/A'} ${m.toLocation ? `<br><span style="font-size: 9px; color: #6b7280;">(${m.toLocation})</span>` : ''}</td>
                    </tr>
                    `
                }).join('')}
            </tbody>
        </table>
    </div>

    <!-- Terms and Conditions -->
    <div class="terms-section">
        <div class="terms-title">TERMS AND CONDITIONS</div>
        <ul class="terms-list">
            <li><strong>HOTEL CHECK-IN & CHECK-OUT TIMINGS:</strong><br>
                Standard Check-in Time: 1600 Hrs / Standard Check-out Time: 1400 Hrs<br>
                Ramadan Check-in Time: 1800 Hrs / Ramadan Check-out Time: 1400 Hrs<br>
                Notes: The above timings are irrespective of Flight Arrival & Departure Timings.<br>
                Early check-in and/or late check-out are to be dealt with directly with the hotel.
            </li>
            <li><strong>VEHICLE WAITING TIME PERIODS:</strong><br>
                60 Minutes at Airport / 120 Minutes at Haj Terminal / 30 Minutes at Hotels.
            </li>
            <li>Mazarat (Ziyarat) can be provided only Sat-Thu in the morning hours (08:00AM - 10:00 AM), Fridays are Excluded.</li>
            <li>Transportation timing/vehicle type cannot be changed unless informed before 24 Hrs. Additional charges may apply.</li>
            <li><strong>IMPORTANT CONTACTS:</strong><br>
                For Transportation re-confirmation/re-scheduling: +966538634100.
            </li>
        </ul>
    </div>

    <!-- Footer -->
    <div class="footer">
        ${!isBooking ? `
        <div class="op-number-box">
            ${icons.phone} &nbsp; OPERATION NUMBER: ${staticOpNumber}
        </div>
        <div class="transportation-text">Transportation: ${transportName}</div>
        ` : ''}
    </div>

</div>

</body>
</html>
  `;
}

// Generate PDF from HTML using Puppeteer
export async function generateVoucherPDF(data: VoucherPdfData & { isBookingVoucher?: boolean }): Promise<Buffer> {
  const startTime = Date.now();
  const logPrefix = '[PDF-VOUCHER]';
  let browser;
  
  console.log(`${logPrefix} ========== START: Generating Voucher PDF ==========`);
  
  try {
    const fs = require('fs');
    const os = require('os');
    const platform = os.platform();

    // Find Chrome executable
    let chromePath: string | undefined;
    if (process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH) {
      chromePath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (platform === 'linux' && !process.env.USE_SYSTEM_CHROME) {
      chromePath = undefined;
    } else {
      const possiblePaths: string[] = [];
      if (platform === 'win32') {
        possiblePaths.push(
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        );
      } else if (platform === 'linux' && process.env.USE_SYSTEM_CHROME) {
        possiblePaths.push(
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium',
        );
      } else if (platform === 'darwin') {
        possiblePaths.push(
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        );
      }
      for (const path of possiblePaths.filter(Boolean)) {
        if (path && fs.existsSync(path)) {
          chromePath = path;
          break;
        }
      }
    }

    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--single-process',
        '--disable-extensions',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain',
      ],
      timeout: 60000,
    };

    if (chromePath) {
      console.log(`${logPrefix} ✓ Using system browser: ${chromePath}`);
      launchOptions.executablePath = chromePath;
    } else {
      console.log(`${logPrefix} ✓ Using bundled Chromium`);
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    const html = generateVoucherHTML(data);

    // Use domcontentloaded for speed
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      preferCSSPageSize: true,
    });

    console.log(`${logPrefix} ✅ SUCCESS: PDF generated`);
    const buffer = Buffer.from(pdfBuffer);
    return buffer;
  } catch (error: any) {
    console.error(`${logPrefix} ❌ EXCEPTION: Error generating PDF`, error);
    throw new Error(`Failed to generate PDF: ${error?.message || 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
