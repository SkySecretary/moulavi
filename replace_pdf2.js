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
  
  // Header details
  const contactNumber = data.umrahCompany?.contactNumber || data.umrahCompany?.whatsappNumber || '';
  const address = data.umrahCompany?.address || '';
  const email = data.umrahCompany?.email || '';

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
      --n-green: #064e3b;
      --n-gold: #b48608;
      --bg-cream: #fbfaf6;
    }
    .container { width: 210mm; min-height: 297mm; padding: 12mm 15mm; position: relative; }
    
    /* Header */
    .header { text-align: center; margin-bottom: 20px; }
    .header h1 { color: var(--n-green); font-size: 28px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
    .header .subtitle { color: var(--n-gold); font-size: 11px; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 8px; text-transform: uppercase; }
    .header-details { display: flex; justify-content: center; gap: 20px; font-size: 10px; color: #4b5563; font-weight: 600; text-transform: uppercase; }
    .header-details span { display: flex; align-items: center; gap: 4px; }
    
    .divider { height: 2px; background: var(--n-gold); width: 100%; margin: 15px auto; position: relative; }
    .divider::after { content: '◆'; position: absolute; top: -9px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 10px; color: var(--n-gold); font-size: 14px; }

    /* Top Boxes */
    .top-boxes { display: flex; gap: 12px; margin-bottom: 20px; }
    .box { flex: 1; background: var(--n-green); border: 1px solid var(--n-gold); border-radius: 6px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .box-icon { width: 32px; height: 32px; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
    .box-text { display: flex; flex-direction: column; justify-content: center; }
    .box-label { font-size: 8px; color: var(--n-gold); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 2px; }
    .box-value { font-size: 12px; font-weight: 700; line-height: 1.2; text-transform: uppercase; word-break: break-word; }

    /* Guest Details - Full Width Corporate Look */
    .guest-section { border: 1px solid var(--n-gold); border-radius: 6px; background: var(--bg-cream); padding: 15px 20px; margin-bottom: 20px; }
    .guest-grid { display: grid; grid-template-columns: 1fr 1fr; row-gap: 12px; column-gap: 40px; }
    .g-row { display: flex; align-items: center; border-bottom: 1px dashed rgba(180, 134, 8, 0.3); padding-bottom: 6px; }
    .g-icon { width: 24px; height: 24px; background: var(--n-green); color: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px; }
    .g-label { width: 140px; font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; }
    .g-colon { margin-right: 12px; font-weight: bold; color: #4b5563; }
    .g-val { font-size: 13px; font-weight: 700; color: #111827; text-transform: uppercase; }

    /* Hotels Section - Side by Side if multiple */
    .hotels-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .hotel-card { border: 1px solid var(--n-gold); border-radius: 6px; background: var(--bg-cream); overflow: hidden; display: flex; flex-direction: column; }
    .h-head { background: var(--n-green); color: white; font-size: 11px; font-weight: 700; text-align: center; padding: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .h-body { padding: 12px; display: flex; align-items: center; gap: 15px; }
    .h-icon { width: 40px; height: 40px; background: var(--n-green); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .h-name { font-size: 15px; font-weight: 800; color: var(--n-green); margin-bottom: 4px; text-transform: uppercase; }
    .h-dates { font-size: 11px; font-weight: 600; color: #4b5563; text-transform: uppercase; }

    /* Flight Details */
    .flight-box { border: 1px solid var(--n-gold); border-radius: 6px; padding: 18px 20px; position: relative; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; background: #fff; }
    .f-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--n-green); color: white; padding: 4px 20px; border-radius: 20px; font-size: 11px; font-weight: 700; display: flex; align-items: center; gap: 8px; letter-spacing: 1px; }
    .f-block { display: flex; align-items: center; gap: 15px; width: 35%; }
    .f-icon { width: 40px; height: 40px; background: var(--n-green); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .f-label { font-size: 10px; font-weight: 700; color: var(--n-green); text-transform: uppercase; margin-bottom: 2px; }
    .f-val { font-size: 13px; font-weight: 700; color: #111827; text-transform: uppercase; line-height: 1.3; }
    .f-route { flex: 1; text-align: center; position: relative; font-size: 13px; font-weight: 800; color: var(--n-green); text-transform: uppercase; }
    .f-route::after { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1.5px; background: var(--n-gold); z-index: 0; }
    .f-route span { background: #fff; padding: 0 15px; position: relative; z-index: 1; }

    /* Itinerary */
    .itin-box { border: 1px solid var(--n-gold); border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
    .i-head { background: var(--n-green); color: white; font-size: 12px; font-weight: 700; text-align: center; padding: 8px; letter-spacing: 1px; }
    .i-table { width: 100%; border-collapse: collapse; }
    .i-table th { background: var(--bg-cream); color: #4b5563; font-size: 9px; padding: 8px 12px; text-transform: uppercase; border-bottom: 1px solid var(--n-gold); text-align: left; }
    .i-table td { padding: 10px 12px; border-bottom: 1px solid rgba(180, 134, 8, 0.2); font-size: 11px; font-weight: 700; text-transform: uppercase; color: #111827; }
    .i-table tr:last-child td { border-bottom: none; }
    .col-num { width: 40px; text-align: center; border-right: 1px solid rgba(180, 134, 8, 0.2); }
    .col-desc { color: var(--n-green); }
    .col-date, .col-time { width: 120px; color: #4b5563; font-weight: 600; border-left: 1px solid rgba(180, 134, 8, 0.2); }

    /* Footer */
    .footer { display: flex; border: 1px solid var(--n-gold); border-radius: 6px; padding: 15px; align-items: flex-end; background: var(--bg-cream); }
    .notes { flex: 1; }
    .notes h4 { font-size: 11px; font-weight: 800; margin-bottom: 6px; color: var(--n-green); }
    .notes ul { list-style: none; padding-left: 5px; }
    .notes li { font-size: 9px; font-weight: 600; margin-bottom: 4px; display: flex; gap: 6px; color: #4b5563; }
    .notes li::before { content: '■'; color: var(--n-gold); font-size: 8px; }
    .stamp { width: 100px; display: flex; justify-content: center; margin: 0 20px; }
    .stamp-circle { width: 65px; height: 65px; border: 2px dashed var(--n-green); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 800; color: var(--n-green); text-align: center; padding: 5px; }
    .sig { text-align: center; width: 180px; }
    .sig-title { font-size: 10px; font-weight: 800; margin-bottom: 25px; color: #4b5563; }
    .sig-name { font-family: 'Brush Script MT', cursive, serif; font-size: 20px; color: var(--n-green); margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;}
    .sig-line { border-top: 1px solid #111827; padding-top: 5px; font-size: 9px; font-weight: 700; color: #4b5563; }
  </style>
</head>
<body>
  <div class="container">
    
    <div class="header">
      <h1>\${providerName}</h1>
      <p class="subtitle">YOUR TRUSTED PARTNER FOR A SPIRITUAL JOURNEY</p>
      
      \${(address || contactNumber || email) ? \`
      <div class="header-details">
        \${address ? \`<span>📍 \${address}</span>\` : ''}
        \${contactNumber ? \`<span>📞 \${contactNumber}</span>\` : ''}
        \${email ? \`<span>✉️ \${email}</span>\` : ''}
      </div>
      \` : ''}
      
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
          <div class="box-value">\${contactNumber || 'N/A'}</div>
        </div>
      </div>
    </div>

    <!-- Full Width Guest Section -->
    <div class="guest-section">
      <div class="guest-grid">
        <div class="g-row"><div class="g-icon">👥</div><div class="g-label">GROUP CODES</div><div class="g-colon">:</div><div class="g-val">\${data.groupCode || 'N/A'}</div></div>
        <div class="g-row"><div class="g-icon">🎫</div><div class="g-label">BRNS</div><div class="g-colon">:</div><div class="g-val">\${brnsList || 'N/A'}</div></div>
        <div class="g-row"><div class="g-icon">🏷️</div><div class="g-label">VOUCHER NUMBER</div><div class="g-colon">:</div><div class="g-val" style="text-decoration: underline;">\${data.voucherNumber}</div></div>
        <div class="g-row"><div class="g-icon">👤</div><div class="g-label">GUEST NAME</div><div class="g-colon">:</div><div class="g-val">\${data.guestName || 'N/A'}</div></div>
        <div class="g-row"><div class="g-icon">📞</div><div class="g-label">GUEST CONTACT</div><div class="g-colon">:</div><div class="g-val">\${data.guestMobile || 'N/A'}</div></div>
        <div class="g-row"><div class="g-icon">🔢</div><div class="g-label">PAX COUNT</div><div class="g-colon">:</div><div class="g-val">\${data.paxCount}</div></div>
      </div>
    </div>

    <!-- Hotels Grid -->
    \${data.hotelSchedules.length > 0 ? \`
    <div class="hotels-section">
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
    \` : ''}

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
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th colspan="2">DESCRIPTION</th>
            <th class="col-date">DATE</th>
            <th class="col-time">TIME</th>
          </tr>
        </thead>
        <tbody>
        \${data.movementDetails.map((m, i) => {
          const isMazarath = m.from.toLowerCase().includes('mazarath') || m.to.toLowerCase().includes('mazarath') || m.fromLocation.toLowerCase().includes('mazarath') || m.toLocation.toLowerCase().includes('mazarath');
          const isFlight = (i === 0 && arrivalFlight) || (i === data.movementDetails.length - 1 && departureFlight);
          let icon = '🚌';
          if (isMazarath) icon = '🕋';
          if (isFlight) icon = i === 0 ? '🛬' : '🛫';

          return \`
          <tr>
            <td class="col-num">\${i + 1}</td>
            <td style="width: 40px; text-align: center; font-size: 16px;">\${icon}</td>
            <td class="col-desc">\${m.from} \${m.to ? \`- \${m.to}\` : ''}</td>
            <td class="col-date">📅 \${formatShortDate(m.date)}</td>
            <td class="col-time">🕒 \${formatTime(m.time)}</td>
          </tr>
        \`}).join('')}
        </tbody>
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
console.log('Corporate PDF template replaced successfully');
