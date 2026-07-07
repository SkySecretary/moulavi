import puppeteer from 'puppeteer';

export interface BillPdfData {
  partyName: string;
  groupNumber: string;
  groupName: string;
  passengerCount: number;
  passengers: Array<{
    name: string;
    visaNumber: string;
  }>;
  amount: number; // Total amount in display currency
  currencyCode?: string;
  currencySymbol?: string;
}

// Helper function to find Chrome executable (same as voucher PDF)
// NOTE: In production, prefer bundled Chromium (comes with Puppeteer) for reliability
function findChromeExecutable(): string | undefined {
  const fs = require('fs');
  const os = require('os');
  const platform = os.platform();

  // Check environment variable first (useful for production when explicitly set)
  if (process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH) {
    const envPath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }
  }

  // For production on Linux, prefer bundled Chromium to avoid snap/installation issues
  if (platform === 'linux' && !process.env.USE_SYSTEM_CHROME) {
    return undefined; // Use bundled Chromium
  }

  const possiblePaths: string[] = [];

  if (platform === 'win32') {
    possiblePaths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    );
  } else if (platform === 'darwin') {
    possiblePaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    );
  }

  for (const path of possiblePaths.filter(Boolean)) {
    if (path && fs.existsSync(path)) {
      return path;
    }
  }

  return undefined; // Will use bundled Chromium (recommended for production)
}

// Generate HTML template for bill
function generateBillHTML(data: BillPdfData): string {
  const primaryColor = '#dc2626';
  const currentDate = new Date().toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
  const timestamp = Date.now().toString().slice(-8);
  const billNumber = `BILL-${data.groupNumber}-${timestamp}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${billNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 15mm;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #1f2937;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .invoice-container {
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
    }

    /* Header */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid ${primaryColor};
    }

    .company-info {
      flex: 1;
    }

    .company-name {
      font-size: 28px;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    .company-details {
      font-size: 11px;
      color: #6b7280;
      line-height: 1.8;
    }

    .invoice-title {
      text-align: right;
    }

    .invoice-title h1 {
      font-size: 36px;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 10px;
      letter-spacing: -1px;
    }

    .invoice-meta {
      font-size: 11px;
      color: #6b7280;
      text-align: right;
      line-height: 1.8;
    }

    .invoice-meta strong {
      color: #1f2937;
      font-weight: 600;
    }

    /* Bill To Section */
    .bill-to-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
      padding: 25px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }

    .bill-to-info {
      font-size: 13px;
      color: #1f2937;
      line-height: 1.8;
    }

    .bill-to-info strong {
      font-size: 15px;
      font-weight: 600;
      color: #111827;
      display: block;
      margin-bottom: 8px;
    }

    .group-details {
      font-size: 13px;
      color: #1f2937;
      line-height: 1.8;
    }

    .group-details .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .group-details .detail-label {
      color: #6b7280;
      font-weight: 500;
    }

    .group-details .detail-value {
      color: #1f2937;
      font-weight: 600;
    }

    /* Items Table */
    .items-section {
      margin-bottom: 30px;
    }

    .section-heading {
      font-size: 12px;
      font-weight: 600;
      color: #1f2937;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .items-table thead {
      background: ${primaryColor};
      color: #ffffff;
    }

    .items-table th {
      padding: 12px 15px;
      font-size: 11px;
      font-weight: 600;
      text-align: left;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .items-table th,
    .items-table td {
      text-align: left;
    }

    .items-table tbody tr {
      border-bottom: 1px solid #e5e7eb;
      page-break-inside: avoid;
    }

    .items-table tbody tr:hover {
      background: #f9fafb;
    }

    .items-table td {
      padding: 6px 15px;
      font-size: 11px;
      color: #1f2937;
    }

    .items-table .item-name {
      font-weight: 500;
      color: #111827;
    }

    /* Summary Section */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
      page-break-inside: avoid;
    }

    .summary-box {
      width: 300px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      page-break-inside: avoid;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 20px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 12px;
      page-break-inside: avoid;
    }

    .summary-row:last-child {
      border-bottom: none;
    }

    .summary-label {
      color: #6b7280;
      font-weight: 500;
    }

    .summary-value {
      color: #1f2937;
      font-weight: 600;
    }

    .summary-row.total {
      background: ${primaryColor};
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
      padding: 18px 20px;
    }

    .summary-row.total .summary-label,
    .summary-row.total .summary-value {
      color: #ffffff;
    }

    /* Footer */
    .invoice-footer {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }

    .footer-note {
      font-size: 10px;
      color: #9ca3af;
      line-height: 1.8;
      margin-bottom: 15px;
    }

    .footer-terms {
      font-size: 9px;
      color: #6b7280;
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
    }

    .footer-terms strong {
      color: #1f2937;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="invoice-header">
      <div class="company-info">
        <div class="company-name">NuSync</div>
        <div class="company-details">
          Umrah Visa Services<br>
          Email: Info@moulavi.com<br>
          Phone: +91-XXXXXXXXXX
        </div>
      </div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="invoice-meta">
          <div><strong>Invoice No:</strong> ${billNumber}</div>
          <div><strong>Date:</strong> ${currentDate}</div>
          <div><strong>Group:</strong> ${data.groupNumber}</div>
        </div>
      </div>
    </div>

    <!-- Bill To Section -->
    <div class="bill-to-section">
      <div>
        <div class="section-label">Bill To</div>
        <div class="bill-to-info">
          <strong>${data.partyName}</strong>
        </div>
      </div>
      <div>
        <div class="section-label">Group Details</div>
        <div class="group-details">
          <div class="detail-row">
            <span class="detail-label">Group Number:</span>
            <span class="detail-value">${data.groupNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Group Name:</span>
            <span class="detail-value">${data.groupName || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Total Passengers:</span>
            <span class="detail-value">${data.passengerCount}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="items-section">
      <div class="section-heading">Passenger Details</div>
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Passenger Name</th>
            <th style="width: 150px;">Visa Number</th>
          </tr>
        </thead>
        <tbody>
          ${data.passengers.map((passenger, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>
                <div class="item-name">${passenger.name || 'N/A'}</div>
              </td>
              <td>${passenger.visaNumber || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Summary Section -->
    <div class="summary-section">
      <div class="summary-box">
        <div class="summary-row">
          <span class="summary-label">Subtotal:</span>
          <span class="summary-value">${data.currencySymbol || '₹'}${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-row total">
          <span class="summary-label">Total Amount:</span>
          <span class="summary-value">${data.currencySymbol || '₹'}${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${data.currencyCode || 'INR'}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="invoice-footer">
      <div class="footer-note">
        This is a computer-generated invoice. No signature required.
      </div>
      <div class="footer-terms">
        <strong>Payment Terms:</strong> Payment is due within the agreed terms. For any queries regarding this invoice, please contact us at Info@moulavi.com
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// Generate PDF from HTML using Puppeteer
export async function generateBillPDF(data: BillPdfData): Promise<Buffer> {
  const startTime = Date.now();
  const logPrefix = '[PDF-BILL]';
  let browser;
  
  console.log(`${logPrefix} ========== START: Generating Bill PDF ==========`);
  console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);
  console.log(`${logPrefix} Party Name: ${data.partyName || 'N/A'}`);
  console.log(`${logPrefix} Group Number: ${data.groupNumber || 'N/A'}`);
  console.log(`${logPrefix} Group Name: ${data.groupName || 'N/A'}`);
  console.log(`${logPrefix} Passenger Count: ${data.passengerCount || 0}`);
  console.log(`${logPrefix} Passengers: ${data.passengers?.length || 0}`);
  console.log(`${logPrefix} Amount: ${data.currencySymbol || '₹'}${data.amount?.toLocaleString('en-IN') || '0'} ${data.currencyCode || 'INR'}`);
  
  try {
    // Prefer bundled Chromium for production reliability
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
    if (chromePath) {
      console.log(`${logPrefix} ✓ Using system browser: ${chromePath}`);
      launchOptions.executablePath = chromePath;
    } else {
      console.log(`${logPrefix} ✓ Using bundled Chromium (recommended for production)`);
      console.log(`${logPrefix}   Note: Bundled Chromium is more reliable and doesn't require system installation`);
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
    const html = generateBillHTML(data);
    const htmlDuration = Date.now() - htmlStartTime;
    console.log(`${logPrefix} ✓ HTML generated in ${htmlDuration}ms`);
    console.log(`${logPrefix} HTML length: ${html.length} characters`);

    console.log(`${logPrefix} Setting page content and waiting for resources...`);
    const contentStartTime = Date.now();
    await page.setContent(html, {
      waitUntil: 'load',
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
    console.error(`${logPrefix} ❌ EXCEPTION: Error generating bill PDF`);
    console.error(`${logPrefix} Duration before error: ${totalDuration}ms`);
    console.error(`${logPrefix} Error Type: ${error?.constructor?.name || 'Unknown'}`);
    console.error(`${logPrefix} Error Message: ${error?.message || 'Unknown error'}`);
    console.error(`${logPrefix} Error Stack:`, error?.stack || 'No stack trace available');
    
    if (error?.name) {
      console.error(`${logPrefix} Error Name: ${error.name}`);
    }
    
    console.error(`${logPrefix} Group Number: ${data.groupNumber || 'N/A'}`);
    console.error(`${logPrefix} ========== END: Exception ==========`);
    throw new Error(`Failed to generate bill PDF: ${error?.message || 'Unknown error'}`);
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
