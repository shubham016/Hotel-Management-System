import React from 'react';
import { adToBs, bsToAdIso, daysInBsMonth, MIN_BS_YEAR, MAX_BS_YEAR, BS_MONTHS_EN } from '@inicrea/bikram-sambat-core';

const years = Array.from({ length: MAX_BS_YEAR - MIN_BS_YEAR + 1 }, (_, index) => MIN_BS_YEAR + index);
const pad = (value: number) => String(value).padStart(2, '0');

export function BsMonthPicker({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [year, month] = value.split('-').map(Number);
  return <div className="hne-form-group" style={{ maxWidth: 380 }}>
    <span className="hne-label">Payroll month (BS)</span>
    <div style={{ display: 'flex', gap: 8 }}>
      <select className="hne-select" aria-label="Payroll BS month" value={month} disabled={disabled} onChange={event => onChange(`${year}-${pad(Number(event.target.value))}`)}>{BS_MONTHS_EN.map((name, index) => <option value={index + 1} key={name}>{name}</option>)}</select>
      <select className="hne-select" aria-label="Payroll BS year" style={{ width: 115, flexShrink: 0 }} value={year} disabled={disabled} onChange={event => onChange(`${event.target.value}-${pad(month)}`)}>{years.map(option => <option value={option} key={option}>{option} BS</option>)}</select>
    </div>
  </div>;
}

export function BsDatePicker({ value, onChange, maxDate, disabled }: { value: string; onChange: (value: string) => void; maxDate?: string; disabled?: boolean }) {
  const bs = adToBs(value);
  function change(year: number, month: number, day: number) {
    const converted = bsToAdIso(year, month, Math.min(day, daysInBsMonth(year, month)));
    onChange(maxDate && converted > maxDate ? maxDate : converted);
  }
  return <div className="hne-form-group">
    <span className="hne-label">Payment date (BS)</span>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <select aria-label="Payment BS day" className="hne-select" style={{ width: 70 }} disabled={disabled} value={bs.day} onChange={event => change(bs.year, bs.month, Number(event.target.value))}>{Array.from({ length: daysInBsMonth(bs.year, bs.month) }, (_, index) => index + 1).map(day => <option key={day} value={day} disabled={Boolean(maxDate && bsToAdIso(bs.year, bs.month, day) > maxDate)}>{day}</option>)}</select>
      <select aria-label="Payment BS month" className="hne-select" style={{ flex: '1 1 130px' }} disabled={disabled} value={bs.month} onChange={event => change(bs.year, Number(event.target.value), bs.day)}>{BS_MONTHS_EN.map((name, index) => <option key={name} value={index + 1} disabled={Boolean(maxDate && bsToAdIso(bs.year, index + 1, 1) > maxDate)}>{name}</option>)}</select>
      <select aria-label="Payment BS year" className="hne-select" style={{ width: 100 }} disabled={disabled} value={bs.year} onChange={event => change(Number(event.target.value), bs.month, bs.day)}>{years.map(year => <option key={year} value={year} disabled={Boolean(maxDate && bsToAdIso(year, 1, 1) > maxDate)}>{year}</option>)}</select>
    </div>
    <small style={{ display: 'block', marginTop: 6, color: 'var(--text-secondary)' }}>AD reference: {value}</small>
  </div>;
}
