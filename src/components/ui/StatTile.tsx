import React, { useId } from 'react';

type ColorTheme = 'orange' | 'green' | 'golden' | 'blue';

const THEME_COLORS: Record<ColorTheme, { bg: string; icon: string }> = {
  orange: { bg: 'var(--primary-orange-light)', icon: 'var(--primary-orange)' },
  green: { bg: 'var(--green-light)', icon: 'var(--green)' },
  golden: { bg: 'var(--golden-light)', icon: 'var(--golden)' },
  blue: { bg: 'var(--info-light)', icon: 'var(--info-blue)' }
};

interface SparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

function Sparkline({ values, color, width = 96, height = 32 }: SparklineProps) {
  const gradientId = useId();
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;
  const chartWidth = width - pad * 2;
  const chartHeight = height - pad * 2;
  const points = values.map((value, index) => [
    pad + (index / (values.length - 1)) * chartWidth,
    pad + chartHeight - ((value - min) / range) * chartHeight
  ] as const);

  const linePoints = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPoints = `${pad},${height - pad} ${linePoints} ${width - pad},${height - pad}`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.4" fill={color} />
    </svg>
  );
}

interface StatTileProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorTheme?: ColorTheme;
  /** Small muted line under the value (e.g. "RevPAR Rs. 983"). */
  caption?: React.ReactNode;
  /** Trend values oldest -> newest, rendered as a sparkline. Ignored if `progress` is set. */
  sparkline?: number[];
  /** Renders a progress bar + caption instead of a sparkline (e.g. occupancy). */
  progress?: { pct: number; caption: string };
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, icon, colorTheme = 'orange', caption, sparkline, progress }) => {
  const theme = THEME_COLORS[colorTheme];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        padding: 16,
        border: '1px solid #E4E4E7',
        borderRadius: 12,
        backgroundColor: '#FFFFFF'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            flexShrink: 0,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: theme.bg,
            color: theme.icon,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#71717A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: '#18181B', fontFamily: 'var(--font-family-display)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {value}
          </div>
          {caption && <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 2, lineHeight: 1.2 }}>{caption}</div>}
        </div>
        {sparkline && sparkline.length > 0 ? <div style={{ flexShrink: 0 }}><Sparkline values={sparkline} color={theme.icon} /></div> : null}
      </div>

      {progress ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 6, borderRadius: 9999, backgroundColor: '#F4F4F5', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, progress.pct))}%`, backgroundColor: theme.icon, borderRadius: 'var(--radius-full)' }} />
          </div>
          <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#A1A1AA' }}>{progress.caption}</span>
        </div>
      ) : null}
    </div>
  );
};
