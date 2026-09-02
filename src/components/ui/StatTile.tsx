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

function Sparkline({ values, color, width = 100, height = 30 }: SparklineProps) {
  const gradientId = useId();
  if (values.length < 2) return <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} />;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => [i * stepX, height - ((v - min) / range) * height]);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r={4} fill={color} stroke="var(--bg-card)" strokeWidth={2} />
    </svg>
  );
}

interface StatTileProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorTheme?: ColorTheme;
  /** Small muted line under the value (e.g. "RevPAR Rs. 983"). */
  caption?: string;
  /** Trend values oldest -> newest, rendered as a sparkline. Ignored if `progress` is set. */
  sparkline?: number[];
  /** Renders a progress bar + caption instead of a sparkline (e.g. occupancy). */
  progress?: { pct: number; caption: string };
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, icon, colorTheme = 'orange', caption, sparkline, progress }) => {
  const theme = THEME_COLORS[colorTheme];

  return (
    <div
      className="hne-card"
      style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', minWidth: 0 }}
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
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      </div>

      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-family-display)', lineHeight: 1.1 }}>
          {value}
        </div>
        {caption && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{caption}</div>}
      </div>

      {progress ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ height: 5, borderRadius: 'var(--radius-full)', backgroundColor: theme.bg, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, progress.pct))}%`, backgroundColor: theme.icon, borderRadius: 'var(--radius-full)' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{progress.caption}</span>
        </div>
      ) : sparkline && sparkline.length > 0 ? (
        <Sparkline values={sparkline} color={theme.icon} />
      ) : null}
    </div>
  );
};
