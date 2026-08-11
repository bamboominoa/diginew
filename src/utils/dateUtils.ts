/**
 * Utility functions for date parsing, formatting as dd/MM/yyyy HH:mm:ss in Vietnam timezone (Asia/Ho_Chi_Minh / UTC+7),
 * and sorting items with newest dates first.
 */

/**
 * Safely parse any date string or Date object into a JavaScript Date instance.
 */
export function parseDate(dateInput: string | Date | number | null | undefined): Date {
  if (!dateInput) return new Date(0);
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? new Date(0) : dateInput;
  }
  if (typeof dateInput === 'number') {
    return new Date(dateInput);
  }

  const str = String(dateInput).trim();
  if (!str) return new Date(0);

  // Check if it's an ISO 8601 string or standard ISO date (e.g. 2026-08-11T05:32:00.000Z or 2026-08-11)
  if (str.includes('T') || str.endsWith('Z')) {
    let isoStr = str;
    // If ISO format without explicit offset or Z, assume Vietnam local time (+07:00)
    if (str.includes('T') && !str.includes('Z') && !str.includes('+') && !str.includes('-', 10)) {
      isoStr = str + '+07:00';
    }
    const parsedIso = new Date(isoStr);
    if (!isNaN(parsedIso.getTime())) {
      return parsedIso;
    }
  }

  // Match dd/MM/yyyy HH:mm:ss or dd/MM/yyyy HH:mm or dd/MM/yyyy
  const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const match = str.match(ddmmyyyyRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const seconds = match[6] ? parseInt(match[6], 10) : 0;
    // Parse as Vietnam local time (UTC+7) by subtracting 7 hours from UTC
    return new Date(Date.UTC(year, month, day, hours - 7, minutes, seconds));
  }

  // Match yyyy-MM-dd HH:mm:ss or yyyy-MM-dd HH:mm or yyyy-MM-dd
  const yyyymmddRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const match2 = str.match(yyyymmddRegex);
  if (match2) {
    const year = parseInt(match2[1], 10);
    const month = parseInt(match2[2], 10) - 1;
    const day = parseInt(match2[3], 10);
    const hours = match2[4] ? parseInt(match2[4], 10) : 0;
    const minutes = match2[5] ? parseInt(match2[5], 10) : 0;
    const seconds = match2[6] ? parseInt(match2[6], 10) : 0;
    // Parse as Vietnam local time (UTC+7)
    return new Date(Date.UTC(year, month, day, hours - 7, minutes, seconds));
  }

  // Fallback to standard JS Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date(0);
}

/**
 * Format any date input into 'dd/MM/yyyy HH:mm:ss' format in Vietnam timezone (Asia/Ho_Chi_Minh / UTC+7).
 */
export function formatDateTime(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return '';
  const date = parseDate(dateInput);
  if (date.getTime() === 0) {
    return String(dateInput);
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    let hours = getPart('hour');
    if (hours === '24') hours = '00';
    const minutes = getPart('minute');
    const seconds = getPart('second');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch (e) {
    // Fallback if Intl fails
    const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const day = String(vnTime.getUTCDate()).padStart(2, '0');
    const month = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
    const year = vnTime.getUTCFullYear();
    const hours = String(vnTime.getUTCHours()).padStart(2, '0');
    const minutes = String(vnTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(vnTime.getUTCSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
}

/**
 * Get current timestamp formatted as 'dd/MM/yyyy HH:mm:ss' in Vietnam timezone
 */
export function getFormattedNow(): string {
  return formatDateTime(new Date());
}

/**
 * Helper to sort an array of objects by a date field descending (newest first).
 */
export function sortByDateDescending<T = any>(
  list: T[],
  getDateField: (item: any) => string | Date | number | null | undefined
): T[] {
  if (!list) return [];
  return [...list].sort((a, b) => {
    const timeA = parseDate(getDateField(a)).getTime();
    const timeB = parseDate(getDateField(b)).getTime();
    return timeB - timeA; // Descending (newest first)
  });
}
