import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

export interface QuotationStayItem {
  id?: string;
  stayType?: 'HOTEL' | 'IQAMA' | string;
  cityId?: string;
  hotelId?: string;
  city: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomType: string;
  roomCount: number;
  roomPricePerNight?: number;
  hotelCost?: number;
  hasExtraBed?: boolean;
  extraBedCount?: number;
  extraBedPricePerNight?: number;
  extraBedTotal?: number;
  mealPlan?: string; // 'None' | 'Breakfast' | 'Half Board' | 'Full Board' | 'Custom'
  mealTimesPerDay?: number;
  mealPricePerPaxPerDay?: number;
  mealTotal?: number;
  totalHotelWithMeals?: number;
  notes?: string;
}

export interface QuotationTransportItem {
  id?: string;
  routeId?: string;
  vehicleTypeId?: string;
  transportMasterId?: string;
  route: string;
  vehicleType: string;
  vehicleCount: number;
  date?: string;
  time?: string;
  price: number;
  notes?: string;
}

export interface QuotationFlightItem {
  id?: string;
  flightType?: string; // 'ONWARD' | 'RETURN' | 'DOMESTIC' | 'OTHER'
  fromAirportId?: string;
  fromAirportCode?: string;
  fromAirportName?: string;
  toAirportId?: string;
  toAirportCode?: string;
  toAirportName?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  airline?: string;
  flightNumber?: string;
  price: number;
  notes?: string;
}

export interface QuotationVisaDetails {
  adultVisaCount?: number;
  adultVisaRate?: number;
  childVisaCount?: number;
  childVisaRate?: number;
  totalVisaAmount?: number;
}

export interface QuotationAdditionalItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface QuotationPdfData {
  quotationNumber: string;
  title?: string | null;
  status: string;
  createdAt: string | Date;
  validUntil?: string | Date | null;
  
  customerType: string;
  partyName?: string | null;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestCountry?: string | null;
  guestCity?: string | null;
  
  adultsCount: number;
  childrenCount: number;
  infantsCount: number;
  totalPax: number;
  
  currency: string;
  totalHotelAmount: number;
  totalMealAmount: number;
  totalExtraBedAmount?: number;
  totalTransportAmount: number;
  totalFlightAmount?: number;
  totalVisaAmount: number;
  totalAdditionalAmount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  pricePerAdult: number;
  pricePerChild: number;
  
  hotels: QuotationStayItem[];
  flights?: QuotationFlightItem[];
  transports: QuotationTransportItem[];
  visas?: QuotationVisaDetails | null;
  additionalItems: QuotationAdditionalItem[];
  
  inclusions?: string | null;
  exclusions?: string | null;
  termsAndConditions?: string | null;
  notes?: string | null;
  hideBreakdown?: boolean;
}

function findChromeExecutable(): string | undefined {
  if (process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH) {
    const envPath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
    if (envPath && fs.existsSync(envPath)) return envPath;
  }
  if (process.platform === 'linux' && !process.env.USE_SYSTEM_CHROME) {
    return undefined;
  }
  const possiblePaths: string[] = [];
  if (process.platform === 'win32') {
    possiblePaths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    );
  } else if (process.platform === 'darwin') {
    possiblePaths.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  }
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) return p;
  }
  return undefined;
}

function getImageAsBase64(filePath: string | undefined): string | null {
  if (!filePath) return null;
  try {
    if (filePath.startsWith('http')) return filePath;
    const searchBases = [process.cwd(), path.join(process.cwd(), '..'), ''];
    let cleanPath = filePath;
    if (filePath.includes('uploads')) {
      cleanPath = filePath.substring(filePath.indexOf('uploads'));
    }
    for (const base of searchBases) {
      const targetPath = base ? path.join(base, cleanPath) : cleanPath;
      if (fs.existsSync(targetPath) && !fs.lstatSync(targetPath).isDirectory()) {
        const bitmap = fs.readFileSync(targetPath);
        const ext = path.extname(targetPath).slice(1) || 'png';
        return `data:image/${ext};base64,${bitmap.toString('base64')}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function getMoulaviLogoBase64(): string | null {
  try {
    const base64TxtPaths = [
      path.join(__dirname, '../assets/logo-moulavi-base64.txt'),
      path.join(process.cwd(), 'backend/src/assets/logo-moulavi-base64.txt'),
      path.join(process.cwd(), 'src/assets/logo-moulavi-base64.txt'),
    ];
    for (const txtPath of base64TxtPaths) {
      if (fs.existsSync(txtPath)) {
        const content = fs.readFileSync(txtPath, 'utf8').trim();
        if (content.startsWith('data:image')) return content;
      }
    }
  } catch {}

  try {
    const pngPaths = [
      path.join(__dirname, '../assets/logo-moulavi.png'),
      path.join(process.cwd(), 'src/assets/logo-moulavi.png'),
      path.join(process.cwd(), 'backend/src/assets/logo-moulavi.png'),
      path.join(process.cwd(), 'frontend/public/logo-moulavi.png'),
      path.join(process.cwd(), 'public/logo-moulavi.png'),
      '/Users/awadnejil/Desktop/logo-moulavi.png'
    ];
    for (const p of pngPaths) {
      if (fs.existsSync(p) && !fs.lstatSync(p).isDirectory()) {
        const bitmap = fs.readFileSync(p);
        return `data:image/png;base64,${bitmap.toString('base64')}`;
      }
    }
  } catch {}

  return getImageAsBase64('uploads/logo.png') || getImageAsBase64('public/logo.png');
}

function formatCurrency(amount: number | undefined | null, currency: string = 'SAR'): string {
  const val = Number(amount) || 0;
  return `${currency} ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateVal?: string | Date | null): string {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function generateQuotationHTML(data: QuotationPdfData): string {
  const logoBase64 = getMoulaviLogoBase64();
  const curr = data.currency || 'SAR';

  const defaultInclusions = data.inclusions || 
    '• Accommodation in selected hotels or similar category.\n• Daily meals as specified in meal plan.\n• All surface transfers as detailed in itinerary.\n• Umrah Visa processing assistance with health insurance.\n• 24/7 Ground handling & support in Makkah & Madinah.';
    
  const defaultExclusions = data.exclusions || 
    '• International / Domestic flight tickets unless mentioned.\n• Any personal expenses, laundry, room service, or phone calls.\n• Additional sightseeing / Ziyarat other than specified.\n• Excess baggage charges and tips.\n• Any PCR or medical testing if required.';

  const defaultTerms = data.termsAndConditions || 
    '• Quotation is valid till the validity date mentioned above and subject to room/vehicle availability.\n• Standard check-in time is 16:00 and check-out time is 12:00 PM (Saudi Time).\n• Rates are subject to change in case of currency fluctuation, government tax changes, or peak season tariffs.\n• 50% advance payment required upon confirmation, balance payable before voucher issuance.';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quotation - ${data.quotationNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    @page {
      size: A4;
      margin: 10mm;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #1e293b;
      line-height: 1.5;
      font-size: 11.5px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
    }
    
    /* Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border-bottom: 2.5px solid #ED1C25;
      padding-bottom: 14px;
    }
    .header-logo {
      vertical-align: top;
      width: 48%;
    }
    .logo-img {
      max-height: 65px;
      max-width: 200px;
      object-fit: contain;
      margin-bottom: 4px;
    }
    .brand-title {
      font-size: 19px;
      font-weight: 800;
      color: #ED1C25;
      letter-spacing: -0.5px;
      margin-bottom: 2px;
    }
    .brand-sub {
      font-size: 9.5px;
      color: #64748b;
      line-height: 1.4;
    }
    .header-meta {
      vertical-align: top;
      text-align: right;
      width: 52%;
    }
    .quote-badge {
      display: inline-block;
      background: #ED1C25;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 14px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      box-shadow: 0 2px 4px rgba(237, 28, 37, 0.2);
    }
    .quote-meta-row {
      font-size: 10px;
      color: #475569;
      margin-bottom: 2px;
    }
    .quote-meta-row strong {
      color: #0f172a;
    }

    /* Client & Pax Info Grid */
    .info-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      background: #FFF8F8;
      border: 1px solid #FECACA;
      border-radius: 8px;
      overflow: hidden;
    }
    .info-col {
      width: 50%;
      padding: 12px 16px;
      vertical-align: top;
    }
    .info-col:first-child {
      border-right: 1px solid #FECACA;
    }
    .col-title {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #ED1C25;
      margin-bottom: 6px;
    }
    .client-name {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .client-detail {
      font-size: 10.5px;
      color: #475569;
      line-height: 1.4;
    }
    .pax-chips {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }
    .pax-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      color: #1e293b;
    }
    .pax-chip.total {
      background: #FFF1F2;
      border-color: #FECACA;
      color: #C9141C;
      font-weight: 700;
    }

    /* Section Styles */
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e293b;
      margin: 14px 0 6px 0;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #FECACA;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-icon {
      color: #ED1C25;
      font-size: 13px;
    }

    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 10.5px;
    }
    .data-table thead {
      background: #FFF1F2;
    }
    .data-table th {
      padding: 7px 10px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #991B1B;
      border: 1px solid #FECACA;
      text-align: left;
    }
    .data-table th.text-right {
      text-align: right;
    }
    .data-table th.text-center {
      text-align: center;
    }
    .data-table td {
      padding: 7px 10px;
      border: 1px solid #E2E8F0;
      color: #334155;
      vertical-align: middle;
    }
    .data-table td.text-right {
      text-align: right;
    }
    .data-table td.text-center {
      text-align: center;
    }
    .data-table tr:nth-child(even) {
      background: #FDFBFB;
    }
    .stay-tag {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .stay-hotel {
      background: #FEE2E2;
      color: #991B1B;
    }
    .stay-iqama {
      background: #FEF3C7;
      color: #92400E;
    }
    .extra-bed-badge {
      display: inline-block;
      margin-top: 3px;
      padding: 1px 5px;
      background: #FEF2F2;
      border: 1px dashed #F87171;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 600;
      color: #DC2626;
    }
    .meal-spec {
      font-size: 9.5px;
      color: #059669;
      font-weight: 600;
      display: block;
      margin-top: 2px;
    }

    /* Summary & Pricing Split */
    .summary-container {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      margin-bottom: 16px;
    }
    .summary-left {
      width: 50%;
      vertical-align: top;
      padding-right: 14px;
    }
    .summary-right {
      width: 50%;
      vertical-align: top;
    }
    
    .pricing-table {
      width: 100%;
      border-collapse: collapse;
      background: #FFFFFF;
      border: 1px solid #FECACA;
      border-radius: 6px;
      overflow: hidden;
      font-size: 10.5px;
    }
    .pricing-table td {
      padding: 6px 12px;
      border-bottom: 1px solid #F1F5F9;
    }
    .pricing-table td.label {
      color: #64748b;
      font-weight: 500;
    }
    .pricing-table td.amount {
      text-align: right;
      color: #0f172a;
      font-weight: 600;
    }
    .pricing-table tr.grand-total {
      background: #ED1C25;
      color: #ffffff;
    }
    .pricing-table tr.grand-total td {
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 800;
      border-bottom: none;
      color: #ffffff;
    }
    .pricing-table tr.grand-total td.amount {
      color: #ffffff;
      font-size: 14.5px;
    }

    .per-pax-box {
      margin-top: 8px;
      background: #FFF1F2;
      border: 1px dashed #FECACA;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 10.5px;
    }
    .per-pax-title {
      font-weight: 700;
      color: #C9141C;
      margin-bottom: 3px;
    }
    .per-pax-item {
      display: flex;
      justify-content: space-between;
      color: #334155;
    }

    /* Notes / Inclusions */
    .terms-box {
      background: #FAFAFA;
      border: 1px solid #E5E7EB;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .terms-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .terms-text {
      font-size: 9.5px;
      color: #4B5563;
      white-space: pre-line;
      line-height: 1.45;
    }

    /* Footer */
    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #E2E8F0;
      text-align: center;
      font-size: 9.5px;
      color: #64748b;
    }
    .footer strong {
      color: #ED1C25;
    }
  </style>
</head>
<body>
  <div class="page-container">
    
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td class="header-logo">
          ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="Moulavi Travels" />` : '<div class="brand-title">MOULAVI TRAVELS</div>'}
          <div class="brand-sub">
            Moulavi Travel and Rec Agents Pvt Ltd<br/>
            Hajj & Umrah Tour Operators | Saudi Ministry Approved<br/>
            Web: https://umra.moulavi.in | Tel: +91 90044 81414 | Email: info@moulavi.in
          </div>
        </td>
        <td class="header-meta">
          <div class="quote-badge">OFFICIAL QUOTATION</div>
          <div class="quote-meta-row">Quote #: <strong>${data.quotationNumber}</strong></div>
          <div class="quote-meta-row">Date: <strong>${formatDate(data.createdAt)}</strong></div>
          <div class="quote-meta-row">Valid Until: <strong>${formatDate(data.validUntil || new Date(Date.now() + 7 * 86400000))}</strong></div>
          ${data.title ? `<div class="quote-meta-row" style="color: #ED1C25; font-weight: 600; margin-top: 3px;">${data.title}</div>` : ''}
        </td>
      </tr>
    </table>

    <!-- Client & Pax Info Grid -->
    <table class="info-grid">
      <tr>
        <td class="info-col">
          <div class="col-title">Quotation Prepared For</div>
          <div class="client-name">${data.guestName}</div>
          ${data.partyName ? `<div class="client-detail"><strong>Agency / Partner:</strong> ${data.partyName}</div>` : ''}
          ${data.guestPhone ? `<div class="client-detail"><strong>Phone / WhatsApp:</strong> ${data.guestPhone}</div>` : ''}
          ${data.guestEmail ? `<div class="client-detail"><strong>Email:</strong> ${data.guestEmail}</div>` : ''}
          ${data.guestCity || data.guestCountry ? `<div class="client-detail"><strong>Location:</strong> ${[data.guestCity, data.guestCountry].filter(Boolean).join(', ')}</div>` : ''}
        </td>
        <td class="info-col">
          <div class="col-title">Passenger Breakdown & Specifications</div>
          <div class="client-detail"><strong>Customer Mode:</strong> ${data.customerType === 'B2B' ? 'B2B / Agency Partner' : 'Direct Customer (B2C)'}</div>
          <div class="client-detail" style="margin-top: 4px;"><strong>Pilgrim Count Breakdown:</strong></div>
          <div class="pax-chips">
            <div class="pax-chip">Adults: ${data.adultsCount}</div>
            <div class="pax-chip">Children: ${data.childrenCount}</div>
            ${data.infantsCount > 0 ? `<div class="pax-chip">Infants: ${data.infantsCount}</div>` : ''}
            <div class="pax-chip total">Total Pax: ${data.totalPax}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Accommodation & Stay Details -->
    ${data.hotels && data.hotels.length > 0 ? `
      <div class="section-title">
        <span>🏨</span> Accommodation & Stay Details
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>City / Type</th>
            <th>Hotel / Stay Name</th>
            <th class="text-center">Dates (Nights)</th>
            <th>Room ${data.hideBreakdown ? '' : '& Extra Bed'}</th>
            <th>Meal Plan</th>
            ${!data.hideBreakdown ? '<th class="text-right">Total Amount</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${data.hotels.map(h => `
            <tr>
              <td>
                <span class="stay-tag ${h.stayType === 'IQAMA' ? 'stay-iqama' : 'stay-hotel'}">
                  ${h.stayType === 'IQAMA' ? 'Iqama / Sharing' : 'Hotel'}
                </span>
                <div style="font-weight: 700; margin-top: 3px; color: #0f172a;">${h.city}</div>
              </td>
              <td>
                <div style="font-weight: 600; color: #1e293b;">${h.hotelName}</div>
                ${h.notes ? `<div style="font-size: 9px; color: #64748b;">${h.notes}</div>` : ''}
              </td>
              <td class="text-center">
                <div>${formatDate(h.checkIn)} - ${formatDate(h.checkOut)}</div>
                <div style="font-weight: 700; color: #ED1C25;">${h.nights} Night${h.nights > 1 ? 's' : ''}</div>
              </td>
              <td>
                <div>${h.roomCount}x ${h.roomType} Room</div>
                ${!data.hideBreakdown && h.roomPricePerNight ? `<div style="font-size: 9px; color: #64748b;">@ ${formatCurrency(h.roomPricePerNight, curr)}/night</div>` : ''}
                ${h.hasExtraBed && h.extraBedCount ? `
                  <div class="extra-bed-badge">
                    +${h.extraBedCount} Extra Bed${h.extraBedCount > 1 ? 's' : ''} ${!data.hideBreakdown && h.extraBedPricePerNight ? `(@ ${formatCurrency(h.extraBedPricePerNight, curr)}/night)` : ''}
                  </div>
                ` : ''}
              </td>
              <td>
                <div style="font-weight: 600; color: #0f172a;">${h.mealPlan || 'No Meals Included'}</div>
                ${h.mealPlan && h.mealPlan !== 'None' && h.mealTimesPerDay ? `
                  <span class="meal-spec">
                    ✓ ${h.mealTimesPerDay} time(s)/day ${!data.hideBreakdown && h.mealPricePerPaxPerDay ? `(@ ${formatCurrency(h.mealPricePerPaxPerDay, curr)}/person/day)` : ''}
                  </span>
                ` : ''}
              </td>
              ${!data.hideBreakdown ? `
                <td class="text-right" style="font-weight: 700; color: #0f172a;">
                  ${formatCurrency(h.totalHotelWithMeals || h.hotelCost || 0, curr)}
                </td>
              ` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- Flight & Air Travel Details -->
    ${data.flights && data.flights.length > 0 ? `
      <div class="section-title">
        <span>✈️</span> Flight & Air Travel Details
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Sector / Type</th>
            <th>Airline & Flight #</th>
            <th>Departure (From)</th>
            <th>Arrival (To)</th>
            <th>Flight Notes</th>
            ${!data.hideBreakdown ? '<th class="text-right">Price</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${data.flights.map(f => {
            const vectorLabel = f.flightType === 'RETURN' ? 'Return Flight' : f.flightType === 'DOMESTIC' ? 'Domestic Leg' : 'Onward Flight';
            const fromText = [f.fromAirportCode, f.fromAirportName].filter(Boolean).join(' - ') || 'Origin Hub';
            const toText = [f.toAirportCode, f.toAirportName].filter(Boolean).join(' - ') || 'Destination Hub';
            const depTime = f.departureTime ? ` (${f.departureTime})` : '';
            const arrTime = f.arrivalTime ? ` (${f.arrivalTime})` : '';
            return `
              <tr>
                <td>
                  <span class="stay-tag" style="background: #EFF6FF; color: #1D4ED8; font-weight: 700;">
                    ${vectorLabel}
                  </span>
                </td>
                <td>
                  <div style="font-weight: 700; color: #0f172a;">${f.airline || 'Commercial Airline'}</div>
                  ${f.flightNumber ? `<div style="font-size: 9.5px; color: #64748b; font-weight: 600;">Flight: ${f.flightNumber}</div>` : ''}
                </td>
                <td>
                  <div style="font-weight: 600; color: #1e293b;">${fromText}</div>
                  <div style="font-size: 9.5px; color: #64748b;">${f.departureDate ? formatDate(f.departureDate) : 'Flexible'}${depTime}</div>
                </td>
                <td>
                  <div style="font-weight: 600; color: #1e293b;">${toText}</div>
                  <div style="font-size: 9.5px; color: #64748b;">${f.arrivalDate ? formatDate(f.arrivalDate) : 'Flexible'}${arrTime}</div>
                </td>
                <td style="color: #64748b; font-size: 9.5px;">${f.notes || 'Scheduled Flight'}</td>
                ${!data.hideBreakdown ? `
                  <td class="text-right" style="font-weight: 700; color: #0f172a;">${formatCurrency(f.price || 0, curr)}</td>
                ` : ''}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- Transportation & Transfers -->
    ${data.transports && data.transports.length > 0 ? `
      <div class="section-title">
        <span>🚐</span> Transportation & Route Transfers
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Route / Sector</th>
            <th>Vehicle Type & Quantity</th>
            <th class="text-center">Scheduled Date / Time</th>
            <th>Transfer Notes</th>
            ${!data.hideBreakdown ? '<th class="text-right">Price</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${data.transports.map(t => `
            <tr>
              <td style="font-weight: 600; color: #0f172a;">${t.route}</td>
              <td>${t.vehicleCount}x ${t.vehicleType}</td>
              <td class="text-center">${t.date ? formatDate(t.date) : 'Flexible'} ${t.time ? `(${t.time})` : ''}</td>
              <td style="color: #64748b;">${t.notes || 'Private Ground Transfer'}</td>
              ${!data.hideBreakdown ? `
                <td class="text-right" style="font-weight: 700; color: #0f172a;">${formatCurrency(t.price, curr)}</td>
              ` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- Visas & Additional Items Table -->
    ${(data.visas && (data.visas.adultVisaCount || data.visas.childVisaCount)) || (data.additionalItems && data.additionalItems.length > 0) ? `
      <div class="section-title">
        <span>📋</span> Visas, Ziyarat & Additional Services
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Item / Service Description</th>
            <th class="text-center">Specification / Qty</th>
            ${!data.hideBreakdown ? `
              <th class="text-right">Unit Rate</th>
              <th class="text-right">Total Amount</th>
            ` : `
              <th class="text-right">Inclusion Status</th>
            `}
          </tr>
        </thead>
        <tbody>
          ${data.visas && data.visas.adultVisaCount ? `
            <tr>
              <td style="font-weight: 600;">Umrah Visa & Medical Insurance (Adult)</td>
              <td class="text-center">${data.visas.adultVisaCount} Adult(s)</td>
              ${!data.hideBreakdown ? `
                <td class="text-right">${formatCurrency(data.visas.adultVisaRate, curr)}</td>
                <td class="text-right" style="font-weight: 700;">${formatCurrency((data.visas.adultVisaCount || 0) * (data.visas.adultVisaRate || 0), curr)}</td>
              ` : `
                <td class="text-right" style="font-weight: 700; color: #16a34a;">Included</td>
              `}
            </tr>
          ` : ''}
          ${data.visas && data.visas.childVisaCount ? `
            <tr>
              <td style="font-weight: 600;">Umrah Visa & Medical Insurance (Child)</td>
              <td class="text-center">${data.visas.childVisaCount} Child(ren)</td>
              ${!data.hideBreakdown ? `
                <td class="text-right">${formatCurrency(data.visas.childVisaRate, curr)}</td>
                <td class="text-right" style="font-weight: 700;">${formatCurrency((data.visas.childVisaCount || 0) * (data.visas.childVisaRate || 0), curr)}</td>
              ` : `
                <td class="text-right" style="font-weight: 700; color: #16a34a;">Included</td>
              `}
            </tr>
          ` : ''}
          ${data.additionalItems.map(item => `
            <tr>
              <td style="font-weight: 600;">${item.description}</td>
              <td class="text-center">${item.quantity}</td>
              ${!data.hideBreakdown ? `
                <td class="text-right">${formatCurrency(item.rate, curr)}</td>
                <td class="text-right" style="font-weight: 700;">${formatCurrency(item.total, curr)}</td>
              ` : `
                <td class="text-right" style="font-weight: 700; color: #16a34a;">Included</td>
              `}
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- Financial Breakdown & Notes Summary -->
    <table class="summary-container">
      <tr>
        <!-- Left: Inclusions & Terms -->
        <td class="summary-left">
          <div class="terms-box">
            <div class="terms-title">✓ Package Inclusions</div>
            <div class="terms-text">${defaultInclusions}</div>
          </div>
          <div class="terms-box">
            <div class="terms-title">✕ Package Exclusions</div>
            <div class="terms-text">${defaultExclusions}</div>
          </div>
          <div class="terms-box">
            <div class="terms-title">ℹ Terms & Conditions</div>
            <div class="terms-text">${defaultTerms}</div>
          </div>
        </td>

        <!-- Right: Financial Grand Total Table -->
        <td class="summary-right">
          ${!data.hideBreakdown ? `
            <table class="pricing-table">
              <tr>
                <td class="label">Total Accommodation (Hotels/Stay)</td>
                <td class="amount">${formatCurrency(data.totalHotelAmount, curr)}</td>
              </tr>
              ${data.totalMealAmount > 0 ? `
                <tr>
                  <td class="label">Total Meal Plans</td>
                  <td class="amount">${formatCurrency(data.totalMealAmount, curr)}</td>
                </tr>
              ` : ''}
              ${(data.totalFlightAmount || 0) > 0 ? `
                <tr>
                  <td class="label">Total Air Tickets / Flights</td>
                  <td class="amount">${formatCurrency(data.totalFlightAmount || 0, curr)}</td>
                </tr>
              ` : ''}
              ${data.totalTransportAmount > 0 ? `
                <tr>
                  <td class="label">Total Transportation & Transfers</td>
                  <td class="amount">${formatCurrency(data.totalTransportAmount, curr)}</td>
                </tr>
              ` : ''}
              ${data.totalVisaAmount > 0 ? `
                <tr>
                  <td class="label">Total Umrah Visas & Insurance</td>
                  <td class="amount">${formatCurrency(data.totalVisaAmount, curr)}</td>
                </tr>
              ` : ''}
              ${data.totalAdditionalAmount > 0 ? `
                <tr>
                  <td class="label">Additional Services & Ziyarat</td>
                  <td class="amount">${formatCurrency(data.totalAdditionalAmount, curr)}</td>
                </tr>
              ` : ''}
              <tr>
                <td class="label" style="font-weight: 700; color: #1e293b;">Subtotal</td>
                <td class="amount" style="font-weight: 700;">${formatCurrency(data.subtotal, curr)}</td>
              </tr>
              ${data.discountAmount > 0 ? `
                <tr>
                  <td class="label" style="color: #dc2626;">Discount</td>
                  <td class="amount" style="color: #dc2626;">-${formatCurrency(data.discountAmount, curr)}</td>
                </tr>
              ` : ''}
              ${data.taxAmount > 0 ? `
                <tr>
                  <td class="label">VAT / Taxes</td>
                  <td class="amount">${formatCurrency(data.taxAmount, curr)}</td>
                </tr>
              ` : ''}
              <tr class="grand-total">
                <td>NET GRAND TOTAL</td>
                <td class="amount">${formatCurrency(data.grandTotal, curr)}</td>
              </tr>
            </table>

            <!-- Per Pax Breakdown Box -->
            <div class="per-pax-box">
              <div class="per-pax-title">Rate Per Pilgrim (Specification)</div>
              <div class="per-pax-item">
                <span>Per Adult Rate (${data.adultsCount} Adult${data.adultsCount > 1 ? 's' : ''}):</span>
                <strong>${formatCurrency(data.pricePerAdult, curr)}</strong>
              </div>
              ${data.childrenCount > 0 ? `
                <div class="per-pax-item" style="margin-top: 2px;">
                  <span>Per Child Rate (${data.childrenCount} Child${data.childrenCount > 1 ? 'ren' : ''}):</span>
                  <strong>${formatCurrency(data.pricePerChild, curr)}</strong>
                </div>
              ` : ''}
            </div>
          ` : `
            <!-- Consolidated Package Total Box (Without Breakdown) -->
            <table class="pricing-table">
              <tr class="grand-total" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
                <td style="color: #ffffff; font-size: 11px; padding: 12px 10px; font-weight: 800;">TOTAL PACKAGE PRICE</td>
                <td class="amount" style="color: #ffffff; font-size: 15px; padding: 12px 10px; font-weight: 900;">${formatCurrency(data.grandTotal, curr)}</td>
              </tr>
              ${data.discountAmount > 0 ? `
                <tr>
                  <td class="label" style="color: #16a34a; font-size: 9.5px;">✓ Special Discount Applied</td>
                  <td class="amount" style="color: #16a34a; font-size: 9.5px;">-${formatCurrency(data.discountAmount, curr)}</td>
                </tr>
              ` : ''}
            </table>

            <!-- Consolidated Per Pilgrim Box -->
            <div class="per-pax-box" style="margin-top: 8px; background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 8px; padding: 10px;">
              <div class="per-pax-title" style="font-size: 10.5px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 6px;">
                Rate Per Pilgrim
              </div>
              <div class="per-pax-item" style="display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 4px;">
                <span>Per Adult Rate (${data.adultsCount} Adult${data.adultsCount > 1 ? 's' : ''}):</span>
                <strong style="color: #0f172a; font-size: 11.5px;">${formatCurrency(data.pricePerAdult, curr)}</strong>
              </div>
              ${data.childrenCount > 0 ? `
                <div class="per-pax-item" style="display: flex; justify-content: space-between; font-size: 10.5px; margin-top: 3px;">
                  <span>Per Child Rate (${data.childrenCount} Child${data.childrenCount > 1 ? 'ren' : ''}):</span>
                  <strong style="color: #0f172a; font-size: 11.5px;">${formatCurrency(data.pricePerChild, curr)}</strong>
                </div>
              ` : ''}
              ${data.infantsCount > 0 ? `
                <div class="per-pax-item" style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-top: 3px;">
                  <span>Infants (${data.infantsCount}):</span>
                  <strong style="color: #16a34a;">Complimentary</strong>
                </div>
              ` : ''}
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; font-size: 9.5px; color: #64748b; display: flex; justify-content: space-between;">
                <span>Total Pilgrims:</span>
                <strong style="color: #0f172a;">${data.totalPax} Pax</strong>
              </div>
            </div>
          `}
        </td>
      </tr>
    </table>

    <!-- Footer -->
    <div class="footer">
      <div>This is a computer-generated quotation from <strong>Moulavi Travels</strong>. No signature required.</div>
      <div style="margin-top: 3px;">
        Website: <a href="https://umra.moulavi.in" style="color: #ED1C25; text-decoration: none; font-weight: 600;">https://umra.moulavi.in</a> &nbsp;|&nbsp; Phone / WhatsApp: <strong>+91 90044 81414</strong> &nbsp;|&nbsp; Email: <strong>info@moulavi.in</strong>
      </div>
    </div>

  </div>
</body>
</html>
  `;
}

export class QuotationPdfService {
  static async generateQuotationPdf(data: QuotationPdfData): Promise<Buffer> {
    const html = generateQuotationHTML(data);
    let browser: any = null;

    try {
      const chromeExecutable = findChromeExecutable();
      const launchOptions: any = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions'
        ]
      };

      if (chromeExecutable) {
        launchOptions.executablePath = chromeExecutable;
      }

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      });

      return Buffer.from(pdfBuffer);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
