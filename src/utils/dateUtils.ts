/**
 * Utility functions for date parsing, formatting as dd/MM/yyyy HH:mm:ss,
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
    return new Date(year, month, day, hours, minutes, seconds);
  }

  // Match yyyy-MM-dd HH:mm:ss or yyyy-MM-dd HH:mm or yyyy-MM-dd
  const yyyymmddRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const match2 = str.match(yyyymmddRegex);
  if (match2) {
    const year = parseInt(match2[1], 10);
    const month = parseInt(match2[2], 10) - 1;
    const day = parseInt(match2[3], 10);
    const hours = match2[4] ? parseInt(match2[4], 10) : 0;
    const minutes = match2[5] ? parseInt(match2[5], 10) : 0;
    const seconds = match2[6] ? parseInt(match2[6], 10) : 0;
    return new Date(year, month, day, hours, minutes, seconds);
  }

  // Fallback to standard JS Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date(0);
}

/**
 * Format any date input into 'dd/MM/yyyy HH:mm:ss' format.
 */
export function formatDateTime(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return '';
  const date = parseDate(dateInput);
  if (date.getTime() === 0) {
    return String(dateInput);
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get current timestamp formatted as 'dd/MM/yyyy HH:mm:ss'
 */
export function getFormattedNow(): string {
  return formatDateTime(new Date());
}

/**
 * Helper to sort an array of objects by a date field descending (newest first).
 */
export function sortByDateDescending<T>(
  list: T[],
  getDateField: (item: T) => string | Date | number | null | undefined
): T[] {
  if (!list) return [];
  return [...list].sort((a, b) => {
    const timeA = parseDate(getDateField(a)).getTime();
    const timeB = parseDate(getDateField(b)).getTime();
    return timeB - timeA; // Descending (newest first)
  });
}
