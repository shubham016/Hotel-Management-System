import React from 'react';
import { Link as ReactRouterLink, useLocation, useNavigate, useSearchParams as useRouterSearchParams } from 'react-router-dom';

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; prefetch?: boolean };

export default function Link({ href, prefetch: _prefetch, children, ...props }: LinkProps) {
  if (/^(https?:|mailto:|tel:)/.test(href) || props.target === '_blank') return <a href={href} {...props}>{children}</a>;
  return <ReactRouterLink to={href} {...props}>{children}</ReactRouterLink>;
}

export function usePathname() { return useLocation().pathname; }
export function useSearchParams() { return useRouterSearchParams()[0]; }
export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (to: string) => navigate(to),
    replace: (to: string) => navigate(to, { replace: true }),
    refresh: () => window.location.reload(),
    prefetch: (_to: string) => undefined
  };
}
