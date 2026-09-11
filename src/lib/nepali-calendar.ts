/**
 * Nepali Bikram Sambat (BS) and Gregorian (AD) date formatting.
 *
 * BS month lengths vary by year, so conversion must use calendar data rather
 * than a fixed year/month/day offset.
 */

import {
  adToBs,
  BS_MONTHS_EN,
  BS_MONTHS_NE,
  getNepaliFiscalYear,
  toNepaliDigits
} from '@inicrea/bikram-sambat-core';

export const NEPALI_MONTHS_EN = [...BS_MONTHS_EN];
export const NEPALI_MONTHS_NP = [...BS_MONTHS_NE];

export interface DualDateInfo {
  adDateString: string; // "2026-09-11"
  adFormatted: string;  // "11 Sep 2026"
  bsDateString: string; // "2083-05-26"
  bsFormatted: string;  // "26 Bhadra, 2083"
  bsNepaliText: string;
  bsMonthName: string;
  combined: string;     // "11 Sep 2026 (26 Bhadra, 2083 BS)"
  fiscalYearBS: string; // "2083/84"
}

interface AdDateParts {
  iso: string;
  year: number;
  month: number;
  day: number;
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function createAdDateParts(year: number, month: number, day: number): AdDateParts | null {
  const validationDate = new Date(Date.UTC(year, month - 1, day));

  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() + 1 !== month ||
    validationDate.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    year,
    month,
    day
  };
}

function normalizeAdDate(input: Date | string): AdDateParts {
  if (typeof input === 'string') {
    const dateOnlyMatch = DATE_ONLY_PATTERN.exec(input);
    if (dateOnlyMatch) {
      const dateParts = createAdDateParts(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]),
        Number(dateOnlyMatch[3])
      );
      if (dateParts) return dateParts;
    }
  }

  const parsedDate = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  const validDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  return createAdDateParts(
    validDate.getFullYear(),
    validDate.getMonth() + 1,
    validDate.getDate()
  ) as AdDateParts;
}

export function formatNepaliDate(gregorianDate: Date | string): {
  bsDateString: string;
  bsFormatted: string;
  bsNepaliText: string;
  bsMonthName: string;
  bsYear: number;
  bsMonth: number;
  bsDay: number;
} {
  const adDate = normalizeAdDate(gregorianDate);
  const bsDate = adToBs(adDate.iso);
  const monthName = NEPALI_MONTHS_EN[bsDate.month - 1];
  const monthNameNp = NEPALI_MONTHS_NP[bsDate.month - 1];

  return {
    bsDateString: `${bsDate.year}-${String(bsDate.month).padStart(2, '0')}-${String(bsDate.day).padStart(2, '0')}`,
    bsFormatted: `${bsDate.day} ${monthName}, ${bsDate.year}`,
    bsNepaliText: `${toNepaliDigits(bsDate.day)} ${monthNameNp}, ${toNepaliDigits(bsDate.year)}`,
    bsMonthName: monthName,
    bsYear: bsDate.year,
    bsMonth: bsDate.month,
    bsDay: bsDate.day
  };
}

export function formatDualDate(dateInput: Date | string): DualDateInfo {
  const adDate = normalizeAdDate(dateInput);
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const adFormatted = `${adDate.day} ${monthsShort[adDate.month - 1]} ${adDate.year}`;
  const bsInfo = formatNepaliDate(adDate.iso);
  const fiscalYearBS = getNepaliFiscalYear({
    year: bsInfo.bsYear,
    month: bsInfo.bsMonth,
    day: bsInfo.bsDay
  }).label;

  return {
    adDateString: adDate.iso,
    adFormatted,
    bsDateString: bsInfo.bsDateString,
    bsFormatted: bsInfo.bsFormatted,
    bsNepaliText: bsInfo.bsNepaliText,
    bsMonthName: bsInfo.bsMonthName,
    combined: `${adFormatted} (${bsInfo.bsFormatted} BS)`,
    fiscalYearBS
  };
}

export function getCurrentNepaliDateString(): string {
  return formatNepaliDate(new Date()).bsDateString;
}

export function getCurrentNepaliFiscalYear(): string {
  return formatDualDate(new Date()).fiscalYearBS;
}
