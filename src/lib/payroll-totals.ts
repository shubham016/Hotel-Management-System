type PayrollAmounts = { base_salary: string; monthly_allowance?: string; earnings: string; deductions: string; advance_amount: string; tds_rate: string };

function minor(value: string) {
  if (!/^\d{1,12}(?:\.\d{0,2})?$/.test(value || '0')) throw new Error('Invalid amount');
  const [whole, fraction = ''] = (value || '0').split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function calculateSalaryBreakdown(value: string) {
  try {
    const gross = minor(value);
    const basic = (gross * 60n + 50n) / 100n;
    return { gross: Number(gross) / 100, basic: Number(basic) / 100, allowance: Number(gross - basic) / 100 };
  } catch { return null; }
}

// Integer paise and hundredths of a percent keep the preview consistent with
// Rails/PostgreSQL's decimal, half-up rounding (including a half-paisa TDS).
export function calculatePayrollPreview(values: PayrollAmounts) {
  try {
    const gross = minor(values.base_salary) + minor(values.monthly_allowance || '0') + minor(values.earnings);
    const rate = minor(values.tds_rate);
    if (rate > 10000n) return null;
    const tds = (gross * rate + 5000n) / 10000n;
    const net = gross - tds - minor(values.deductions) - minor(values.advance_amount);
    return { gross: Number(gross) / 100, tds: Number(tds) / 100, net: Number(net) / 100 };
  } catch { return null; }
}
