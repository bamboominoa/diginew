/**
 * Helper function for generating sequential formatted IDs across the webapp
 * Formats: NH00001, CTNH00001, SP00001, KH00001, NCC00001, DH00001, CTDH00001, TK00001
 */

export function generateNextId(
  prefix: string,
  items: any[],
  idKey?: string,
  digitCount: number = 5
): string {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return `${prefix}${String(1).padStart(digitCount, '0')}`;
  }

  let maxNum = 0;
  const prefixUpper = prefix.toUpperCase();

  for (const item of items) {
    const val = typeof item === 'string' ? item : idKey ? item[idKey] : '';
    if (!val) continue;

    const strVal = String(val).trim();
    if (strVal.toUpperCase().startsWith(prefixUpper)) {
      const rest = strVal.substring(prefixUpper.length);
      // Match leading digits right after the prefix, ignoring long timestamps (> 6 digits)
      const numMatch = rest.match(/^(\d+)/);
      if (numMatch && numMatch[1].length <= 6) {
        const num = parseInt(numMatch[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  // Fallback: If no direct prefix matches were found, try extracting any tail number <= 6 digits
  if (maxNum === 0) {
    for (const item of items) {
      const val = typeof item === 'string' ? item : idKey ? item[idKey] : '';
      if (!val) continue;

      const digitsMatch = String(val).match(/(\d+)$/);
      if (digitsMatch && digitsMatch[1].length <= 6) {
        const num = parseInt(digitsMatch[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(digitCount, '0')}`;
}
