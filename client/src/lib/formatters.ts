/**
 * Format a number with comma separators for thousands
 * @param num - Number to format
 * @returns Formatted string with commas
 */
export const formatNumber = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined || num === '') return '0';
  
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return '0';
  
  return number.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
};

/**
 * Format currency with comma separators
 * @param num - Number to format
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export const formatCurrency = (num: number | string | null | undefined, currency: string = 'USD'): string => {
  if (num === null || num === undefined || num === '') return `$0`;
  
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return `$0`;
  
  return number.toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

/**
 * Format percentage
 * @param num - Number to format (0-100)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export const formatPercentage = (num: number | string | null | undefined, decimals: number = 0): string => {
  if (num === null || num === undefined || num === '') return '0%';
  
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return '0%';
  
  return `${number.toFixed(decimals)}%`;
};
