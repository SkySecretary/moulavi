const XLSX = require('xlsx');
const path = require('path');

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
  const cleanDateStr = String(dateVal).trim();
  let day, month, year;
  
  if (cleanDateStr.includes('/')) {
    const parts = cleanDateStr.split('/');
    if (parts[2]?.length === 4) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    } else if (parts[0]?.length === 4) {
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
      const timeOnlyStr = cleanTimeStr.includes(' ') ? cleanTimeStr.split(/\s+/)[1] : cleanTimeStr;
      const matches = timeOnlyStr.match(/^(\d{1,2})[.:](\d{2})/);
      if (matches) {
        hour = parseInt(matches[1], 10);
        minute = parseInt(matches[2], 10);
      }
    }
  }
  
  return new Date(year, month, day, hour, minute);
}

async function main() {
  const filePath = path.join(__dirname, '../../Mutamers-Report_1782501624953.xlsx');
  console.log('Reading file:', filePath);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  console.log('Total rows in Excel:', rows.length);
  if (rows.length > 0) {
    console.log('Row Keys:', Object.keys(rows[0]));
    console.log('Sample Row:', rows[0]);
  }

  const parsedDates = [];
  const validDates = [];
  const statusCounts = {};

  const windowDays = 30;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - windowDays);
  console.log('Current Date Context:', new Date());
  console.log('30 Days Ago Window Threshold:', thirtyDaysAgo);

  let insideWindowCount = 0;
  const rowsWithEntryDate = rows.filter(r => getRowValue(r, ['Entry Date']) && String(getRowValue(r, ['Entry Date'])).trim() !== '');
  console.log('\nTotal rows with Entry Date:', rowsWithEntryDate.length);
  if (rowsWithEntryDate.length > 0) {
    console.log('Sample Row with Entry Date:', rowsWithEntryDate[0]);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const entryDateRaw = getRowValue(row, ['Entry Date', 'EntryDate']);
    const entryTimeRaw = getRowValue(row, ['Entry Time', 'EntryTime']);
    const exitDateRaw = getRowValue(row, ['Exit Date', 'ExitDate']);
    const exitTimeRaw = getRowValue(row, ['Exit Time', 'ExitTime']);
    
    const entryDate = parseExcelDate(entryDateRaw, entryTimeRaw);
    const exitDate = parseExcelDate(exitDateRaw, exitTimeRaw);

    const mStatus = getRowValue(row, ['Mutamer Status']) || 'N/A';
    statusCounts[mStatus] = (statusCounts[mStatus] || 0) + 1;

    if (entryDate) {
      parsedDates.push(entryDate);
      if (entryDate >= thirtyDaysAgo) {
        insideWindowCount++;
        validDates.push(entryDate);
      }
    }
  }

  console.log('\n--- Date Parsing Analysis (First 500 rows) ---');
  console.log('Parsed valid Date objects count:', parsedDates.length);
  console.log('Dates inside 30-day window (>= 30 days ago):', insideWindowCount);
  
  if (parsedDates.length > 0) {
    parsedDates.sort((a, b) => a - b);
    console.log('Min Date in Excel:', parsedDates[0]);
    console.log('Max Date in Excel:', parsedDates[parsedDates.length - 1]);
  }

  console.log('\n--- Mutamer Status counts (All rows) ---');
  console.log(statusCounts);
}

main().catch(console.error);
