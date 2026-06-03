const fs = require('fs');

const tsFilePath = 'backend/src/services/pdfService.ts';
let code = fs.readFileSync(tsFilePath, 'utf8');

const startMarker = '// Generate HTML template for voucher\nfunction generateVoucherHTML(data: VoucherPdfData): string {';
const endMarker = '\n// Helper to find Chrome/Chromium executable';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const newFunction = `// Generate HTML template for voucher
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
      return \`\${d.getDate()} \${months[d.getMonth()]}\`;
    } catch { return dateStr; }
  };

  return \`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Travel Voucher - \${data.voucherNumber}</title>
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
      <h1>\${providerName}</h1>
      <p>YOUR TRUSTED PARTNER FOR A SPIRITUAL JOURNEY</p>
      <div class="divider"></div>
    </div>

    <div class="top-boxes">
      <div class="box">
        <div class="box-icon">👤</div>
        <div class="box-text">
          <div class="box-label">AGENT NAME</div>
          <div class="box-value">\${agentName || 'N/A'}</div>
        </div>
      </div>
      <div class="box">
        <div class="box-icon">🚐</div>
        <div class="box-text">
          <div class="box-label">TRANSPORTATION COMPANY</div>
          <div class="box-value">\${transportName || 'N/A'}</div>
        </div>
      </div>
      <div class="box">
        <div class="box-icon">🎧</div>
        <div class="box-text">
          <div class="box-label">OPERATION NUMBER</div>
          <div class="box-value">\${contactNumber}</div>
        </div>
      </div>
    </div>

    <div class="main-grid">
      <div class="guest-card">
        <div class="g-row">
          <div class="g-icon">👥</div>
          <div class="g-label">GROUP CODES</div><div class="g-colon">:</div>
          <div class="g-val">\${data.groupCode || 'N/A'}</div>
        </div>
        <div class="g-row">
          <div class="g-icon">🎫</div>
          <div class="g-label">BRNS</div><div class="g-colon">:</div>
          <div class="g-val">\${brnsList || 'N/A'}</div>
        </div>
        <div class="g-row">
          <div class="g-icon">🏷️</div>
          <div class="g-label">VOUCHER NUMBER</div><div class="g-colon">:</div>
          <div class="g-val" style="text-decoration: underline;">\${data.voucherNumber}</div>
        </div>
        <div class="g-row">
          <div class="g-icon">👤</div>
          <div class="g-label">GUEST NAME</div><div class="g-colon">:</div>
          <div class="g-val">\${data.guestName || 'N/A'}</div>
        </div>
        <div class="g-row">
          <div class="g-icon">📞</div>
          <div class="g-label">GUEST CONTACT NUMBER</div><div class="g-colon">:</div>
          <div class="g-val">\${data.guestMobile || 'N/A'}</div>
        </div>
      </div>

      <div class="hotels-col">
        \${data.hotelSchedules.map(h => \`
          <div class="hotel-card">
            <div class="h-head">\${h.location || 'HOTEL'}</div>
            <div class="h-body">
              <div class="h-icon">🏨</div>
              <div>
                <div class="h-name">\${h.hotelName || 'N/A'}</div>
                <div class="h-dates">📅 \${formatShortDate(h.checkIn)} – \${formatShortDate(h.checkOut)}</div>
              </div>
            </div>
          </div>
        \`).join('')}
      </div>
    </div>

    \${(arrivalFlight || departureFlight) ? \`
    <div class="flight-box">
      <div class="f-badge">✈️ FLIGHT DETAILS</div>
      
      <div class="f-block">
        <div class="f-icon">🛬</div>
        <div class="flight-details-col">
          <div class="f-label">ARRIVAL</div>
          <div class="f-val">\${arrivalFlight ? \`\${formatShortDate(arrivalFlight.date)} \${arrivalFlight.carrier}\${arrivalFlight.number}<br/>\${formatTime(arrivalFlight.eta || arrivalFlight.etd)}\` : 'N/A'}</div>
        </div>
      </div>

      <div class="f-route"><span>\${arrivalFlight?.to || 'JEDDAH'} - \${departureFlight?.from || 'MAKKAH'}</span></div>

      <div class="f-block" style="justify-content: flex-end; text-align: right;">
        <div class="flight-details-col">
          <div class="f-label">DEPARTURE</div>
          <div class="f-val">\${departureFlight ? \`\${formatShortDate(departureFlight.date)} \${departureFlight.carrier}\${departureFlight.number}<br/>\${formatTime(departureFlight.etd || departureFlight.eta)}\` : 'N/A'}</div>
        </div>
        <div class="f-icon" style="transform: scaleX(-1);">🛫</div>
      </div>
    </div>
    \` : ''}

    <div class="itin-box">
      <div class="i-head">ITINERARY & SCHEDULE</div>
      <table class="i-table">
        \${data.movementDetails.map((m, i) => \`
          <tr>
            <td class="col-num">\${i + 1}</td>
            <td class="col-ic">\${m.from.toLowerCase().includes('mazarath') || m.to.toLowerCase().includes('mazarath') ? '🕋' : '🚌'}</td>
            <td class="col-desc">\${m.from} \${m.to ? \`- \${m.to}\` : ''}</td>
            <td class="col-date">📅 \${formatShortDate(m.date)}</td>
            <td class="col-time">🕒 \${formatTime(m.time)}</td>
          </tr>
        \`).join('')}
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
        <div class="sig-name">\${agentName || 'Agent'}</div>
        <div class="sig-line">( AGENT )</div>
      </div>
    </div>

  </div>
</body>
</html>
  \`;
}
`;

fs.writeFileSync(tsFilePath, code.substring(0, startIndex) + newFunction + code.substring(endIndex));
console.log('PDF template replaced successfully');
