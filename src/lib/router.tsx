import React from 'react';
import { Link as ReactRouterLink, useLocation, useNavigate, useSearchParams as useRouterSearchParams } from 'react-router-dom';

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; prefetch?: boolean };

export default function Link({ href, prefetch: _prefetch, children, ...props }: LinkProps) {
  const location = useLocation();
  if (/^(https?:|mailto:|tel:)/.test(href) || props.target === '_blank') return <a href={href} {...props}>{children}</a>;
  const state = href.startsWith('/book') && location.pathname !== '/book' ? { backgroundLocation: location } : undefined;
  return <ReactRouterLink to={href} state={state} {...props}>{children}</ReactRouterLink>;
}

export function usePathname() { return useLocation().pathname; }
export function useSearchParams() { return useRouterSearchParams()[0]; }
export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  return {
    push: (to: string) => navigate(to, { state: to.startsWith('/book') && location.pathname !== '/book' ? { backgroundLocation: location } : undefined }),
    replace: (to: string) => navigate(to, { replace: true }),
    refresh: () => window.location.reload(),
    prefetch: (_to: string) => undefined
  };
}
