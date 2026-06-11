
/**
 * Utility functions for combining and splitting date and time
 */

/**
 * Combines a date string (YYYY-MM-DD) and time string (HH:mm) into a single Date object in UTC
 */
export function combineDateTime(
  dateString: string | Date | null | undefined,
  timeString: string | Date | null | undefined
): Date | undefined {
  if (!dateString || !timeString) {
    return undefined;
  }

  let year: number, month: number, day: number;

  if (dateString instanceof Date) {
    year = dateString.getUTCFullYear();
    month = dateString.getUTCMonth();
    day = dateString.getUTCDate();
  } else {
    // Try to parse YYYY-MM-DD
    const matchISO = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchISO) {
      year = parseInt(matchISO[1], 10);
      month = parseInt(matchISO[2], 10) - 1;
      day = parseInt(matchISO[3], 10);
    } else {
      // Try parsing as regular date string
      const dt = new Date(dateString);
      if (isNaN(dt.getTime())) return undefined;
      // If it's a date string like "2026-06-11", new Date() might treat it as UTC already,
      // but let's be safe and extract what we need.
      year = dt.getUTCFullYear();
      month = dt.getUTCMonth();
      day = dt.getUTCDate();
    }
  }

  let hours = 0;
  let minutes = 0;

  if (timeString instanceof Date) {
    hours = timeString.getUTCHours();
    minutes = timeString.getUTCMinutes();
  } else if (typeof timeString === 'string') {
    const timeMatch = timeString.match(/(\d{1,2}):(\d{1,2})/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
    }
  }

  // Create combined date using UTC components
  const combined = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
  return isNaN(combined.getTime()) ? undefined : combined;
}

/**
 * Splits a Date object into date string (YYYY-MM-DD) and time string (HH:mm) in UTC
 */
export function splitDateTime(
  dateTime: Date | string | null | undefined
): { date: string; time: string } | undefined {
  if (!dateTime) {
    return undefined;
  }

  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  
  if (isNaN(date.getTime())) {
    return undefined;
  }

  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

/**
 * Formats a Date object to time string (HH:mm) in UTC
 */
export function formatTime(dateTime: Date | string | null | undefined): string {
  if (!dateTime) return '';
  
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  if (isNaN(date.getTime())) return '';
  
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Formats a Date object to date string (YYYY-MM-DD) in UTC
 */
export function formatDate(dateTime: Date | string | null | undefined): string {
  if (!dateTime) return '';
  
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  if (isNaN(date.getTime())) return '';
  
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
