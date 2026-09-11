'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Image as ImageIcon, Loader2, Search, Trash2, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type MediaAsset = {
  id: string;
  title: string;
  alt: string;
  category: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
  dimensions: string;
  createdAt: string;
};

const CATEGORIES = ['ALL', 'BRANDING', 'HERO', 'ROOMS', 'DINING', 'BANQUETS', 'OFFERS', 'GENERAL'];
const UPLOAD_CATEGORIES = CATEGORIES.filter((category) => category !== 'ALL');
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryPage() {
  const [mediaItems, setMediaItems] = useState<MediaAsset[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploadCategory, setUploadCategory] = useState('GENERAL');

  const loadMedia = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cms/media', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load the media library.');
      setMediaItems(data.media || []);
    } catch (loadError: any) {
      setError(loadError.message || 'Unable to load the media library.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const filteredMedia = useMemo(() => mediaItems.filter((media) => {
    const categoryMatches = selectedCategory === 'ALL' || media.category === selectedCategory;
    const query = searchTerm.trim().toLowerCase();
    const searchMatches = !query || [media.title, media.alt, media.filename, media.category]
      .some((value) => value.toLowerCase().includes(query));
    return categoryMatches && searchMatches;
  }), [mediaItems, searchTerm, selectedCategory]);

  const resetUpload = () => {
    setUploadFile(null);
    setUploadTitle('');
    setUploadAlt('');
    setUploadCategory('GENERAL');
    setIsUploadOpen(false);
  };

  const selectFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Images must be 10 MB or smaller.');
      return;
    }
    setError(null);
    setUploadFile(file);
    setUploadTitle((current) => current || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' '));
    setUploadAlt((current) => current || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' '));
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!uploadFile || !uploadTitle.trim() || !uploadAlt.trim()) {
      setError('Choose an image and provide both a title and meaningful alt text.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle.trim());
      formData.append('altText', uploadAlt.trim());
      formData.append('category', uploadCategory);

      const response = await fetch('/api/cms/media', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Upload failed.');

      setMediaItems((current) => [data.media, ...current]);
      resetUpload();
    } catch (uploadError: any) {
      setError(uploadError.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyUrl = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Unable to copy the URL. Please copy it from the browser address bar.');
    }
  };

  const handleDelete = async (asset: MediaAsset) => {
    if (!window.confirm(`Delete “${asset.title}”? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/cms/media?id=${encodeURIComponent(asset.id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to delete this image.');
      setMediaItems((current) => current.filter((item) => item.id !== asset.id));
    } catch (deleteError: any) {
      setError(deleteError.message || 'Unable to delete this image.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Media Library</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Upload, organize, search, and manage your hotel image assets in one place.
          </p>
        </div>
        <Button variant="primary" onClick={() => { setError(null); setIsUploadOpen(true); }}>
          <Upload size={16} />
          <span>Upload image</span>
        </Button>
      </div>

      {error && (
        <div role="alert" style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#991B1B', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', minWidth: 220, flex: '1 1 260px', maxWidth: 380 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search title, alt text, or file name" style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)' }} />
        </div>
        {CATEGORIES.map((category) => (
          <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`hne-btn ${selectedCategory === category ? 'hne-btn-primary' : 'hne-btn-secondary'} hne-btn-sm`}>
            {category}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ minHeight: 260, display: 'grid', placeItems: 'center', color: 'var(--text-secondary)', gap: 10 }}><Loader2 className="hne-spin" size={24} />Loading media library…</div>
      ) : filteredMedia.length === 0 ? (
        <div className="hne-card" style={{ minHeight: 260, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
          <div><ImageIcon size={38} style={{ margin: '0 auto 12px', color: 'var(--primary-orange)' }} /><strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: 6 }}>No images found</strong><span>Upload an image to begin building your hotel media collection.</span></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {filteredMedia.map((media) => (
            <article key={media.id} className="hne-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 190, overflow: 'hidden', position: 'relative', background: 'var(--bg-subtle)' }}>
                <img src={media.url} alt={media.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <Badge variant="orange" style={{ position: 'absolute', top: 10, left: 10, fontSize: 10 }}>{media.category}</Badge>
              </div>
              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{media.title}</h2>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{media.dimensions} • {formatFileSize(media.size)} • {media.filename}</div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, fontStyle: 'italic', flex: 1 }}>“{media.alt}”</p>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <button type="button" onClick={() => handleCopyUrl(media.url, media.id)} className="hne-btn hne-btn-secondary hne-btn-sm" style={{ fontSize: 11.5 }}>
                    {copiedId === media.id ? <CheckCircle2 size={13} /> : <Copy size={13} />}<span>{copiedId === media.id ? 'Copied' : 'Copy URL'}</span>
                  </button>
                  <button type="button" onClick={() => handleDelete(media)} className="hne-btn hne-btn-secondary hne-btn-sm" aria-label={`Delete ${media.title}`} style={{ color: 'var(--danger-red)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {isUploadOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="upload-media-title" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15, 23, 42, 0.55)' }}>
          <form onSubmit={handleUpload} className="hne-card" style={{ width: 'min(100%, 580px)', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div><h2 id="upload-media-title" style={{ fontSize: 19, fontWeight: 800 }}>Upload image</h2><p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>JPG, PNG, WebP, or GIF up to 10 MB.</p></div>
              <button type="button" onClick={resetUpload} aria-label="Close upload form" style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 700 }}>Image file<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => selectFile(event.target.files?.[0] || null)} style={{ display: 'block', width: '100%', marginTop: 6 }} /></label>
              {uploadFile && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{uploadFile.name} • {formatFileSize(uploadFile.size)}</div>}
              <label style={{ fontSize: 13, fontWeight: 700 }}>Title<input required value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="e.g. Deluxe room balcony" style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} /></label>
              <label style={{ fontSize: 13, fontWeight: 700 }}>Alt text<input required value={uploadAlt} onChange={(event) => setUploadAlt(event.target.value)} placeholder="Describe what guests see in the image" style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} /></label>
              <label style={{ fontSize: 13, fontWeight: 700 }}>Category<select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)} style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>{UPLOAD_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}><Button type="button" variant="secondary" onClick={resetUpload}>Cancel</Button><Button type="submit" variant="primary" disabled={isUploading}>{isUploading ? <Loader2 className="hne-spin" size={16} /> : <Upload size={16} />}<span>{isUploading ? 'Uploading…' : 'Upload image'}</span></Button></div>
          </form>
        </div>
      )}
    </div>
  );
}
