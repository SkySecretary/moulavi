import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatTransportRoute = (route: any) => {
  if (!route) return 'N/A';
  const cities = [
    route.city1?.name,
    route.city2?.name,
    route.city3?.name,
    route.city4?.name,
  ].filter(Boolean);
  return cities.length > 0 ? cities.join(' → ') : 'N/A';
};

/**
 * Formats a price with currency symbol and handles conversion if needed.
 * @param amount Amount in base currency (INR)
 * @param currency CurrencyMaster object for target currency
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency?: { symbol: string, currencyCode: string, exchangeRate: number }) => {
  if (!currency || currency.currencyCode === 'INR' || currency.exchangeRate <= 0) {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  const convertedAmount = amount / currency.exchangeRate;
  return `${currency.symbol}${convertedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Converts an amount from base currency (INR) to target currency.
 * @param amount Amount in base currency (INR)
 * @param exchangeRate Rate to convert from base to target (1 Unit = ? INR)
 * @returns Converted amount
 */
export const convertFromINR = (amount: number, exchangeRate: number) => {
  if (exchangeRate <= 0) return amount;
  return amount / exchangeRate;
};

/**
 * Converts an amount from target currency to base currency (INR).
 * @param amount Amount in target currency
 * @param exchangeRate Rate to convert from base to target (1 Unit = ? INR)
 * @returns Amount in base currency (INR)
 */
export const convertToINR = (amount: number, exchangeRate: number) => {
  if (exchangeRate <= 0) return amount;
  return amount * exchangeRate;
};

