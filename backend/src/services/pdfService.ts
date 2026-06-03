import puppeteer from 'puppeteer';
import { VoucherPdfData } from '../types/voucher';

// Helper function to format date (DD-MM-YYYY)
function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return 'N/A';
  }
}

// Helper function to format time (HH:MM)
function formatTime(timeString: string): string {
  if (!timeString) return 'N/A';
  if (timeString.includes('T')) {
    const timePart = timeString.split('T')[1];
    return timePart ? timePart.slice(0, 5) : 'N/A';
  }
  if (timeString.includes(':')) {
    return timeString.slice(0, 5);
  }
  return 'N/A';
}

// Generate HTML template for voucher
function generateVoucherHTML(data: VoucherPdfData): string {
  const providerName = data.umrahCompany?.partyName || 'UMRA SERVICES';
  const agentName = data.agentParty?.partyName || '';
  const transportName = data.transportCompany?.partyName || '';
  const contactNumber = data.umrahCompany?.contactNumber || data.umrahCompany?.whatsappNumber || 'N/A';

  // Aggregate BRNs
  const brnsList = data.hotelSchedules
    .map(h => (h.brn && Array.isArray(h.brn)) ? h.brn.join(', ') : '')
    .filter(b => b.length > 0)
    .join(', ');

  const arrivalFlight = data.flightDetails.find(f => f.type === 'AA');
  const departureFlight = data.flightDetails.find(f => f.type === 'AD');

  // Format Dates
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return `${d.getDate()} ${months[d.getMonth()]}`;
    } catch { return dateStr; }
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Travel Voucher - ${data.voucherNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #ffffff;
      color: #111827;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    :root {
      --n-green: #0d4732;
      --n-gold: #c39a5c;
      --bg-cream: #fbfaf6;
    }
    .container { width: 210mm; min-height: 297mm; padding: 12mm 15mm; position: relative; }
    
    /* Header */
    .header { text-align: center; margin-bottom: 25px; }
    .header h1 { color: var(--n-green); font-size: 32px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
    .header p { color: var(--n-gold); font-size: 13px; font-weight: 700; letter-spacing: 1.5px; margin-top: 4px; }
    .divider { height: 2px; background: var(--n-gold); width: 50%; margin: 12px auto; position: relative; }
    .divider::after { content: '◆'; position: absolute; top: -9px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 10px; color: var(--n-gold); font-size: 14px; }

    /* Top Boxes */
    .top-boxes { display: flex; gap: 15px; margin-bottom: 20px; }
    .box { flex: 1; background: var(--n-green); border: 2px solid var(--n-gold); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 10px; color: white; }
    .box-icon { width: 36px; height: 36px; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    .box-text { display: flex; flex-direction: column; justify-content: center; }
    .box-label { font-size: 8px; color: var(--n-gold); text-transform: uppercase; letter-spacing: 0.5px; }
    .box-value { font-size: 13px; font-weight: 700; line-height: 1.2; text-transform: uppercase; word-break: break-word; }

    /* Main Info */
    .main-grid { display: flex; gap: 15px; margin-bottom: 20px; }
    
    .guest-card { flex: 1.2; border: 1px solid var(--n-gold); border-radius: 8px; background: var(--bg-cream); padding: 20px; display: flex; flex-direction: column; justify-content: space-between; }
    .g-row { display: flex; align-items: center; border-bottom: 1px dashed rgba(195,154,92,0.4); padding: 8px 0; }
    .g-row:last-child { border-bottom: none; }
    .g-icon { width: 28px; height: 28px; background: var(--n-green); color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; margin-right: 15px; }
    .g-label { width: 150px; font-size: 12px; font-weight: 700; color: #374151; }
    .g-colon { margin-right: 15px; font-weight: bold; }
    .g-val { font-size: 14px; font-weight: 700; color: #111827; text-transform: uppercase; }

    .hotels-col { flex: 0.8; display: flex; flex-direction: column; gap: 10px; }
    .hotel-card { border: 1px solid var(--n-gold); border-radius: 8px; background: var(--bg-cream); overflow: hidden; display: flex; flex-direction: column; }
    .h-head { background: var(--n-green); color: white; font-size: 11px; font-weight: 700; text-align: center; padding: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .h-body { padding: 12px; display: flex; align-items: center; gap: 15px; }
    .h-icon { width: 40px; height: 40px; background: var(--n-green); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .h-name { font-size: 16px; font-weight: 800; color: var(--n-green); margin-bottom: 4px; text-transform: uppercase; }
    .h-dates { font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase; }

    /* Flight Details */
    .flight-box { border: 1px solid var(--n-gold); border-radius: 8px; padding: 20px; position: relative; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; background: #fff; }
    .f-badge { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: var(--n-green); color: white; padding: 6px 24px; border-radius: 20px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 8px; letter-spacing: 1px; }
    .f-block { display: flex; align-items: center; gap: 15px; width: 35%; }
    .f-icon { width: 45px; height: 45px; background: var(--n-green); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; }
    .f-label { font-size: 11px; font-weight: 700; color: var(--n-green); text-transform: uppercase; margin-bottom: 2px; }
    .f-val { font-size: 14px; font-weight: 700; color: #111827; text-transform: uppercase; }
    .f-route { flex: 1; text-align: center; position: relative; font-size: 14px; font-weight: 800; color: var(--n-green); text-transform: uppercase; }
    .f-route::after { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: var(--n-gold); z-index: 0; }
    .f-route span { background: #fff; padding: 0 15px; position: relative; z-index: 1; }

    /* Itinerary */
    .itin-box { border: 1px solid var(--n-gold); border-radius: 8px; overflow: hidden; margin-bottom: 25px; }
    .i-head { background: var(--n-green); color: white; font-size: 14px; font-weight: 700; text-align: center; padding: 10px; letter-spacing: 1px; }
    .i-table { width: 100%; border-collapse: collapse; }
    .i-table td { padding: 12px; border-bottom: 1px solid rgba(195,154,92,0.3); font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .i-table tr:last-child td { border-bottom: none; }
    .col-num { width: 40px; text-align: center; border-right: 1px solid rgba(195,154,92,0.3); }
    .col-ic { width: 50px; text-align: center; font-size: 18px; }
    .col-date { width: 130px; border-left: 1px solid rgba(195,154,92,0.3); color: #4b5563; }
    .col-time { width: 100px; border-left: 1px solid rgba(195,154,92,0.3); color: #4b5563; }

    /* Footer */
    .footer { display: flex; border: 1px solid var(--n-gold); border-radius: 8px; padding: 15px; align-items: flex-end; }
    .notes { flex: 1; }
    .notes h4 { font-size: 12px; font-weight: 800; margin-bottom: 6px; }
    .notes ul { list-style: none; padding-left: 5px; }
    .notes li { font-size: 10px; font-weight: 500; margin-bottom: 4px; display: flex; gap: 6px; }
    .notes li::before { content: '•'; color: var(--n-green); }
    .stamp { width: 100px; display: flex; justify-content: center; margin: 0 20px; }
    .stamp-circle { width: 70px; height: 70px; border: 2px dashed var(--n-green); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; color: var(--n-green); text-align: center; padding: 5px; }
    .sig { text-align: center; width: 180px; }
    .sig-title { font-size: 11px; font-weight: 800; margin-bottom: 25px; }
    .sig-name { font-family: 'Brush Script MT', cursive, serif; font-size: 22px; color: var(--n-green); margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;}
    .sig-line { border-top: 1px solid #111827; padding-top: 5px; font-size: 10px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    
    <div class="header">
      <h1>${providerName}</h1>
      <p>YOUR TRUSTED PARTNER FOR A SPIRITUAL JOURNEY</p>
      <div class="divider"></div>
    </div>

    <div class="top-boxes">
      <div class="box">
        <div class="box-icon">👤</div>
        <div class="box-text">
          <div class="box-label">AGENT NAME</div>
          <div class="box-value">${agentName || 'N/A'}</div>
        </div>
      </div>
      <div class="box">
        <div class="box-icon">🚐</div>
        <div class="box-text">
          <div class="box-label">TRANSPORTATION COMPANY</div>
          <div class="box-value">${transportName || 'N/A'}</div>
        </div>
      </div>
      <div class="box">
        <div class="box-icon">🎧</div>
        <div class="box-text">
          <div class="box-label">OPERATION NUMBER</div>
          <div class="box-value">${contactNumber}</div>
        </div>
      </div>
    </div>

    <div class="main-grid">
      <div class="guest-card">
        <div class="g-row">
          <div class="g-icon">👥</div>
          <div class="g-label">GROUP CODES</div><div class="g-colon">:</div>
          <div class="g-val">${data.groupCode || 'N/A'}</div>
        </div>
        <div class="g-row">
          <div class="g-icon">🎫</div>
          <div class="g-label">BRNS</div><div class="g-colon">:</div>
          <div class="g-val">${brnsList || 'N/A'}</div>
        </div>
        <div class="g-row">
          <div class="g-icon">🏷️</div>
          <div class="g-label">VOUCHER NUMBER</div><div class="g-colon">:</div>
          <div class="g-val" style="text-decoration: underline;">${data.voucherNumber}</div>
        </div>
        <div class="g-row">
          <div class="g-icon">👤</div>
          <div class="g-label">GUEST NAME</div><div class="g-colon">:</div>
          <div class="g-val">${data.guestName || 'N/A'}</div>
        </div>
        <div class="g-row">
          <div class="g-icon">📞</div>
          <div class="g-label">GUEST CONTACT NUMBER</div><div class="g-colon">:</div>
          <div class="g-val">${data.guestMobile || 'N/A'}</div>
        </div>
      </div>

      <div class="hotels-col">
        ${data.hotelSchedules.map(h => `
          <div class="hotel-card">
            <div class="h-head">${h.location || 'HOTEL'}</div>
            <div class="h-body">
              <div class="h-icon">🏨</div>
              <div>
                <div class="h-name">${h.hotelName || 'N/A'}</div>
                <div class="h-dates">📅 ${formatShortDate(h.checkIn)} – ${formatShortDate(h.checkOut)}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    ${(arrivalFlight || departureFlight) ? `
    <div class="flight-box">
      <div class="f-badge">✈️ FLIGHT DETAILS</div>
      
      <div class="f-block">
        <div class="f-icon">🛬</div>
        <div class="flight-details-col">
          <div class="f-label">ARRIVAL</div>
          <div class="f-val">${arrivalFlight ? `${formatShortDate(arrivalFlight.date)} ${arrivalFlight.carrier}${arrivalFlight.number}<br/>${formatTime(arrivalFlight.eta || arrivalFlight.etd)}` : 'N/A'}</div>
        </div>
      </div>

      <div class="f-route"><span>${arrivalFlight?.to || 'JEDDAH'} - ${departureFlight?.from || 'MAKKAH'}</span></div>

      <div class="f-block" style="justify-content: flex-end; text-align: right;">
        <div class="flight-details-col">
          <div class="f-label">DEPARTURE</div>
          <div class="f-val">${departureFlight ? `${formatShortDate(departureFlight.date)} ${departureFlight.carrier}${departureFlight.number}<br/>${formatTime(departureFlight.etd || departureFlight.eta)}` : 'N/A'}</div>
        </div>
        <div class="f-icon" style="transform: scaleX(-1);">🛫</div>
      </div>
    </div>
    ` : ''}

    <div class="itin-box">
      <div class="i-head">ITINERARY & SCHEDULE</div>
      <table class="i-table">
        ${data.movementDetails.map((m, i) => `
          <tr>
            <td class="col-num">${i + 1}</td>
            <td class="col-ic">${m.from.toLowerCase().includes('mazarath') || m.to.toLowerCase().includes('mazarath') ? '🕋' : '🚌'}</td>
            <td class="col-desc">${m.from} ${m.to ? `- ${m.to}` : ''}</td>
            <td class="col-date">📅 ${formatShortDate(m.date)}</td>
            <td class="col-time">🕒 ${formatTime(m.time)}</td>
          </tr>
        `).join('')}
      </table>
    </div>

    <div class="footer">
      <div class="notes">
        <h4>NOTES :</h4>
        <ul>
          <li>Please carry this voucher during the journey.</li>
          <li>Verify all details before the travel.</li>
          <li>For any assistance, contact your agent.</li>
        </ul>
      </div>
      <div class="stamp">
        <div class="stamp-circle">VALID<br/>VOUCHER</div>
      </div>
      <div class="sig">
        <div class="sig-title">AUTHORIZED SIGNATURE</div>
        <div class="sig-name">${agentName || 'Agent'}</div>
        <div class="sig-line">( AGENT )</div>
      </div>
    </div>

  </div>
</body>
</html>
  `;
}

// Helper to find Chrome/Chromium executable (Windows, Linux, macOS)
// NOTE: In production, prefer bundled Chromium (comes with Puppeteer) for reliability
function findChromeExecutable(): string | undefined {
  const fs = require('fs');
  const os = require('os');
  const platform = os.platform();

  // Check environment variable first (useful for production when explicitly set)
  // If CHROME_PATH is explicitly set, use it (user knows what they're doing)
  if (process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH) {
    const envPath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }
  }

  // For production on Linux, prefer bundled Chromium to avoid snap/installation issues
  // Only check for system Chrome if explicitly requested via USE_SYSTEM_CHROME env var
  if (platform === 'linux' && !process.env.USE_SYSTEM_CHROME) {
    // Skip system Chrome detection on Linux - use bundled Chromium
    return undefined;
  }

  // Platform-specific paths (mainly for Windows and macOS, or when USE_SYSTEM_CHROME is set)
  const possiblePaths: string[] = [];

  if (platform === 'win32') {
    // Windows paths
    possiblePaths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
    );
  } else if (platform === 'linux' && process.env.USE_SYSTEM_CHROME) {
    // Linux paths - only check if USE_SYSTEM_CHROME is set
    // Skip chromium-browser (requires snap) and /snap/bin/chromium
    possiblePaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium', // Only check this if not snap-based
    );
  } else if (platform === 'darwin') {
    // macOS paths
    possiblePaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    );
  }

  // Check each path
  for (const path of possiblePaths.filter(Boolean)) {
    if (path && fs.existsSync(path)) {
      // On Linux, verify it's not a snap-based chromium-browser wrapper
      if (platform === 'linux' && path.includes('chromium')) {
        try {
          const { execSync } = require('child_process');
          const realPath = execSync(`readlink -f "${path}"`, { encoding: 'utf8' }).trim();
          // If it points to snap, skip it
          if (realPath.includes('/snap/')) {
            continue;
          }
        } catch (e) {
          // If we can't check, skip to be safe
          continue;
        }
      }
      return path;
    }
  }

  return undefined; // Will use bundled Chromium (recommended for production)
}

// Generate PDF from HTML using Puppeteer
export async function generateVoucherPDF(data: VoucherPdfData): Promise<Buffer> {
  const startTime = Date.now();
  const logPrefix = '[PDF-VOUCHER]';
  let browser;
  
  console.log(`${logPrefix} ========== START: Generating Voucher PDF ==========`);
  console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);
  console.log(`${logPrefix} Voucher Number: ${data.voucherNumber || 'N/A'}`);
  console.log(`${logPrefix} Guest Name: ${data.guestName || 'N/A'}`);
  console.log(`${logPrefix} Group Code: ${data.groupCode || 'N/A'}`);
  console.log(`${logPrefix} Hotel Schedules: ${data.hotelSchedules?.length || 0}`);
  console.log(`${logPrefix} Movement Details: ${data.movementDetails?.length || 0}`);
  console.log(`${logPrefix} Flight Details: ${data.flightDetails?.length || 0}`);
  
  try {
    // Prefer bundled Chromium for production reliability
    // Only use system Chrome if explicitly set via CHROME_PATH or USE_SYSTEM_CHROME
    console.log(`${logPrefix} Finding Chrome executable...`);
    const chromePath = findChromeExecutable();
    
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
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-default-apps',
        '--disable-features=TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain',
      ],
      timeout: 60000,
    };

    // Use system Chrome/Chromium only if explicitly provided
    // Otherwise use bundled Chromium (most reliable for production)
    if (chromePath) {
      console.log(`${logPrefix} ✓ Using system browser: ${chromePath}`);
      launchOptions.executablePath = chromePath;
    } else {
      console.log(`${logPrefix} ✓ Using bundled Chromium (recommended for production)`);
      console.log(`${logPrefix}   Note: Bundled Chromium is more reliable and doesn't require system installation`);
      console.log(`${logPrefix}   To use system Chrome, set CHROME_PATH or USE_SYSTEM_CHROME environment variable`);
    }

    console.log(`${logPrefix} Launching browser...`);
    const browserStartTime = Date.now();
    browser = await puppeteer.launch(launchOptions);
    const browserDuration = Date.now() - browserStartTime;
    console.log(`${logPrefix} ✓ Browser launched in ${browserDuration}ms`);

    console.log(`${logPrefix} Creating new page...`);
    const page = await browser.newPage();
    console.log(`${logPrefix} ✓ Page created`);

    console.log(`${logPrefix} Generating HTML template...`);
    const htmlStartTime = Date.now();
    const html = generateVoucherHTML(data);
    const htmlDuration = Date.now() - htmlStartTime;
    console.log(`${logPrefix} ✓ HTML generated in ${htmlDuration}ms`);
    console.log(`${logPrefix} HTML length: ${html.length} characters`);

    console.log(`${logPrefix} Setting page content and waiting for resources...`);
    const contentStartTime = Date.now();
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    const contentDuration = Date.now() - contentStartTime;
    console.log(`${logPrefix} ✓ Page content loaded in ${contentDuration}ms`);

    console.log(`${logPrefix} Generating PDF...`);
    const pdfStartTime = Date.now();
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      preferCSSPageSize: true,
    });
    const pdfDuration = Date.now() - pdfStartTime;
    const totalDuration = Date.now() - startTime;
    const bufferSize = Buffer.from(pdfBuffer).length;
    
    console.log(`${logPrefix} ✅ SUCCESS: PDF generated`);
    console.log(`${logPrefix} PDF size: ${(bufferSize / 1024).toFixed(2)} KB`);
    console.log(`${logPrefix} PDF generation duration: ${pdfDuration}ms`);
    console.log(`${logPrefix} Total duration: ${totalDuration}ms`);
    console.log(`${logPrefix} ========== END: PDF Generated Successfully ==========`);

    return Buffer.from(pdfBuffer);
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`${logPrefix} ❌ EXCEPTION: Error generating PDF`);
    console.error(`${logPrefix} Duration before error: ${totalDuration}ms`);
    console.error(`${logPrefix} Error Type: ${error?.constructor?.name || 'Unknown'}`);
    console.error(`${logPrefix} Error Message: ${error?.message || 'Unknown error'}`);
    console.error(`${logPrefix} Error Stack:`, error?.stack || 'No stack trace available');
    
    if (error?.name) {
      console.error(`${logPrefix} Error Name: ${error.name}`);
    }
    
    console.error(`${logPrefix} Voucher Number: ${data.voucherNumber || 'N/A'}`);
    console.error(`${logPrefix} ========== END: Exception ==========`);
    throw new Error(`Failed to generate PDF: ${error?.message || 'Unknown error'}`);
  } finally {
    if (browser) {
      console.log(`${logPrefix} Closing browser...`);
      try {
        await browser.close();
        console.log(`${logPrefix} ✓ Browser closed`);
      } catch (closeError: any) {
        console.error(`${logPrefix} ⚠️ Error closing browser: ${closeError?.message || 'Unknown error'}`);
      }
    }
  }
}
