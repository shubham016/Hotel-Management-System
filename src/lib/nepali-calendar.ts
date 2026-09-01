/**
 * Nepali Bikram Sambat (BS) & English Gregorian (AD) Dual Calendar Engine
 * Comprehensive bidirectional date utilities, formatting, and fiscal year calculations.
 */

export const NEPALI_MONTHS_EN = [
  'Baishakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra'
];

export const NEPALI_MONTHS_NP = [
  'बैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कार्तिक',
  'मंसिर',
  'पुस',
  'माघ',
  'फागुन',
  'चैत'
];

export interface DualDateInfo {
  adDateString: string; // "2026-08-22"
  adFormatted: string;  // "22 Aug 2026"
  bsDateString: string; // "2083-05-06"
  bsFormatted: string;  // "6 Bhadra, 2083"
  bsNepaliText: string; // "६ भदौ, २०८३"
  bsMonthName: string;
  combined: string;     // "22 Aug 2026 (6 Bhadra 2083 BS)"
  fiscalYearBS: string; // "2083/84"
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
  const d = typeof gregorianDate === 'string' ? new Date(gregorianDate) : gregorianDate;
  if (isNaN(d.getTime())) {
    const today = new Date();
    return formatNepaliDate(today);
  }

  const gYear = d.getFullYear();
  const gMonth = d.getMonth(); // 0-indexed (0 = Jan, 7 = Aug)
  const gDay = d.getDate();

  let bsYear = gYear + 56;
  let bsMonth = 0;
  let bsDay = gDay;

  if (gMonth >= 3) {
    bsMonth = gMonth - 3;
    if (gMonth === 3 && gDay < 14) {
      bsYear -= 1;
      bsMonth = 11; // Chaitra
      bsDay = gDay + 17;
    } else {
      bsDay = (gDay >= 14) ? gDay - 13 : gDay + 17;
    }
  } else {
    bsYear = gYear + 56;
    bsMonth = gMonth + 9;
    bsDay = (gDay >= 14) ? gDay - 13 : gDay + 16;
  }

  if (bsMonth > 11) {
    bsMonth = 11;
  }

  const monthName = NEPALI_MONTHS_EN[bsMonth] || 'Bhadra';
  const monthNameNp = NEPALI_MONTHS_NP[bsMonth] || 'भदौ';
  const monthPad = String(bsMonth + 1).padStart(2, '0');
  const dayPad = String(Math.min(Math.max(bsDay, 1), 32)).padStart(2, '0');

  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  const toNepaliNum = (num: number | string) =>
    num.toString().split('').map(c => nepaliDigits[parseInt(c)] || c).join('');

  return {
    bsDateString: `${bsYear}-${monthPad}-${dayPad}`,
    bsFormatted: `${bsDay} ${monthName}, ${bsYear}`,
    bsNepaliText: `${toNepaliNum(bsDay)} ${monthNameNp}, ${toNepaliNum(bsYear)}`,
    bsMonthName: monthName,
    bsYear,
    bsMonth: bsMonth + 1,
    bsDay
  };
}

export function formatDualDate(dateInput: Date | string): DualDateInfo {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const adDateString = validDate.toISOString().split('T')[0];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const adFormatted = `${validDate.getDate()} ${monthsShort[validDate.getMonth()]} ${validDate.getFullYear()}`;

  const bsInfo = formatNepaliDate(validDate);

  const fiscalYearBS = bsInfo.bsMonth >= 4
    ? `${bsInfo.bsYear}/${(bsInfo.bsYear + 1).toString().slice(-2)}`
    : `${bsInfo.bsYear - 1}/${bsInfo.bsYear.toString().slice(-2)}`;

  return {
    adDateString,
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
