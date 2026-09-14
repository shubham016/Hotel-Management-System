import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import { formatDualDate } from '@/lib/nepali-calendar';

interface DualCalendarPickerProps {
  label: string;
  value: string; // ISO date string "YYYY-MM-DD"
  onChange: (newDate: string) => void;
  minDate?: string;
  required?: boolean;
  showBsIcon?: boolean;
  showBsBadge?: boolean;
  className?: string;
}

export const DualCalendarPicker: React.FC<DualCalendarPickerProps> = ({
  label,
  value,
  onChange,
  minDate,
  required = false,
  showBsIcon = true,
  showBsBadge = true,
  className = ''
}) => {
  const dualInfo = formatDualDate(value || new Date());

  return (
    <div className={`hne-form-group ${className}`} style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <label className="hne-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} color="var(--primary-orange)" />
          <span>{label}</span>
        </label>
        {showBsBadge && <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#B45309',
            backgroundColor: 'var(--golden-light)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          {showBsIcon && <Sparkles size={10} />} BS: {dualInfo.bsFormatted}
        </span>}
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type="date"
          className="hne-input"
          value={value}
          min={minDate}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          style={{ fontWeight: 600 }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
        <span>AD: {dualInfo.adFormatted}</span>
        <span style={{ color: 'var(--text-secondary)' }}>नेपाली: {dualInfo.bsNepaliText}</span>
      </div>
    </div>
  );
};
