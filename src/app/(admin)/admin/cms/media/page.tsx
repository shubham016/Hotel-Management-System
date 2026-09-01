'use client';

import React, { useState } from 'react';
import { Image, Upload, Search, Filter, Trash2, Copy, CheckCircle2, Tag } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function MediaLibraryPage() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [mediaItems, setMediaItems] = useState([
    {
      id: 'med-0',
      title: 'Official Hotel New Era HD Vector Logo',
      category: 'BRANDING',
      url: '/logo.png',
      size: '533 KB',
      dimensions: '1920x840',
      alt: 'Official Hotel New Era Brand Emblem & Wordmark Logo'
    },
    {
      id: 'med-1',
      title: 'Deluxe King Himalayan View Balcony',
      category: 'ROOMS',
      url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      size: '2.4 MB',
      dimensions: '1920x1080',
      alt: 'Deluxe King Room with sunrise view of Annapurna range'
    },
    {
      id: 'med-2',
      title: 'Executive Lake-View Suite Living Area',
      category: 'ROOMS',
      url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      size: '3.1 MB',
      dimensions: '2048x1365',
      alt: 'Luxury Suite with panoramic glass views over Fewa Lake'
    },
    {
      id: 'med-3',
      title: 'The Panorama Restaurant Outdoor Terrace',
      category: 'DINING',
      url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      size: '1.9 MB',
      dimensions: '1920x1280',
      alt: 'Outdoor dining with sunset cocktail tables'
    },
    {
      id: 'med-4',
      title: 'Annapurna Grand Ballroom Gala Seating',
      category: 'BANQUETS',
      url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
      size: '2.8 MB',
      dimensions: '1920x1080',
      alt: 'Ballroom arranged for corporate conference'
    },
    {
      id: 'med-5',
      title: 'Hotel Exterior & Mountain Sunrise',
      category: 'HERO',
      url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      size: '4.2 MB',
      dimensions: '3840x2160',
      alt: 'Hotel New Era facade with Himalayan mountain backdrop'
    }
  ]);

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMedia = selectedCategory === 'ALL'
    ? mediaItems
    : mediaItems.filter(m => m.category === selectedCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Central Media Library & Digital Assets</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            High-resolution asset storage, optimized web formats, alt-text tagging, and CDN URL management
          </p>
        </div>

        <Button variant="primary" onClick={() => alert('Media uploader activated! Choose JPG/PNG/WebP assets to upload.')}>
          <Upload size={16} />
          <span>Upload New Images</span>
        </Button>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['ALL', 'ROOMS', 'DINING', 'BANQUETS', 'HERO'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`hne-btn ${selectedCategory === cat ? 'hne-btn-primary' : 'hne-btn-secondary'} hne-btn-sm`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {filteredMedia.map((media) => (
          <div key={media.id} className="hne-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 190, overflow: 'hidden', position: 'relative' }}>
              <img src={media.url} alt={media.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <Badge variant="orange" style={{ position: 'absolute', top: 10, left: 10, fontSize: 10 }}>
                {media.category}
              </Badge>
            </div>

            <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{media.title}</h4>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {media.dimensions} • {media.size}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, fontStyle: 'italic' }}>
                  "{media.alt}"
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => handleCopyUrl(media.url, media.id)}
                  className="hne-btn hne-btn-secondary hne-btn-sm"
                  style={{ fontSize: 11.5 }}
                >
                  <Copy size={12} />
                  <span>{copiedId === media.id ? 'Copied!' : 'Copy Asset URL'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
