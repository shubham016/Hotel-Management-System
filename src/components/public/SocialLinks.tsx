import React from 'react';
import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';

const profiles = [
  { name: 'Facebook', Icon: Facebook, url: import.meta.env.VITE_PUBLIC_FACEBOOK_URL },
  { name: 'Instagram', Icon: Instagram, url: import.meta.env.VITE_PUBLIC_INSTAGRAM_URL },
  { name: 'YouTube', Icon: Youtube, url: import.meta.env.VITE_PUBLIC_YOUTUBE_URL },
  { name: 'LinkedIn', Icon: Linkedin, url: import.meta.env.VITE_PUBLIC_LINKEDIN_URL },
];

export function SocialLinks({ location }: { location: 'header' | 'footer' }) {
  return (
    <div className={`public-social-links public-social-links-${location}`} aria-label="Hotel New Era social media">
      <span className="public-social-label">Follow us</span>
      {profiles.map(({ name, Icon, url }) => url ? (
        <a key={name} className="public-social-link" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Hotel New Era on ${name}`} title={name}>
          <Icon size={location === 'header' ? 15 : 17} aria-hidden="true" />
        </a>
      ) : (
        <span key={name} className="public-social-link public-social-link-pending" role="img" aria-label={`${name} profile link pending`} title={`${name} profile link pending`}>
          <Icon size={location === 'header' ? 15 : 17} aria-hidden="true" />
        </span>
      ))}
    </div>
  );
}
