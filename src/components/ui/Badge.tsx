import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'orange' | 'danger' | 'neutral' | 'primary' | 'secondary' | 'outline';
  className?: string;
  style?: React.CSSProperties;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  style,
  icon
}) => {
  return (
    <span className={`hne-badge hne-badge-${variant} ${className}`} style={style}>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
};
