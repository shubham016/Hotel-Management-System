import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorTheme?: 'orange' | 'green' | 'golden' | 'blue';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorTheme = 'orange'
}) => {
  const themeColors = {
    orange: { bg: 'var(--primary-orange-light)', icon: 'var(--primary-orange)' },
    green: { bg: 'var(--green-light)', icon: 'var(--green)' },
    golden: { bg: 'var(--golden-light)', icon: 'var(--golden)' },
    blue: { bg: 'var(--info-light)', icon: 'var(--info-blue)' }
  };

  const currentTheme = themeColors[colorTheme] || themeColors.orange;

  return (
    <div className="hne-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            backgroundColor: currentTheme.bg,
            color: currentTheme.icon,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-family-display)' }}>
          {value}
        </div>
        {(subtitle || trend) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12 }}>
            {trend && (
              <span
                style={{
                  fontWeight: 700,
                  color: trend.isPositive ? 'var(--green)' : 'var(--danger-red)'
                }}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {subtitle && <span style={{ color: 'var(--text-muted)' }}>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
