export type DisplayPreferences = {
  currency_code: string;
  currency_display: 'SYMBOL' | 'CODE';
  nepali_calendar_enabled: boolean;
};

let preferences: DisplayPreferences = { currency_code: 'NPR', currency_display: 'SYMBOL', nepali_calendar_enabled: true };

export function setDisplayPreferences(value?: DisplayPreferences | null) {
  preferences = value || { currency_code: 'NPR', currency_display: 'SYMBOL', nepali_calendar_enabled: true };
}

export function currencyLabel() {
  if (preferences.currency_display === 'CODE') return preferences.currency_code;
  return preferences.currency_code === 'NPR' ? 'Rs.' : preferences.currency_code;
}

export function showNepaliDates() { return preferences.nepali_calendar_enabled; }
