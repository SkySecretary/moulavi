/**
 * Parse date string in DD-MM-YYYY format to Date object
 * @param dateString - Date string in DD-MM-YYYY format
 * @returns Date object or null if parsing fails
 */
export function parseDateDDMMYYYY(dateString: string | null | undefined): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  // Remove any whitespace
  const cleaned = dateString.trim();
  
  // Handle empty strings
  if (cleaned === '' || cleaned === '-') {
    return null;
  }

  // Try to parse DD-MM-YYYY format or DD/MM/YYYY
  let parts = cleaned.split('-');
  if (parts.length !== 3) {
    parts = cleaned.split('/');
  }
  
  if (parts.length !== 3) {
    return null;
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  // Validate parsed values
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  // Handle 2-digit year (e.g., 26 -> 2026, 99 -> 1999)
  const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;

  // Create date object using UTC (month is 0-indexed in JavaScript)
  const date = new Date(Date.UTC(fullYear, month - 1, day, 0, 0, 0, 0));

  // Validate the date (check if it's a valid date using UTC methods)
  if (
    date.getUTCFullYear() === fullYear &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  ) {
    return date;
  }

  return null;
}

/**
 * Safely parse a date string or Date object
 * @param dateStr - The date string or Date object to parse
 * @returns Date object or null if parsing fails
 */
export const parseSafeDate = (dateStr: string | Date | null | undefined): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  
  // Try ISO format first (YYYY-MM-DD)
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY using the utility
  return parseDateDDMMYYYY(typeof dateStr === 'string' ? dateStr : null);
};
