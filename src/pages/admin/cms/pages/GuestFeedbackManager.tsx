import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { testimonialRequest, type Testimonial } from '@/lib/testimonials';

type FeedbackForm = Omit<Testimonial, 'id'> & { id?: string };
const blankFeedback: FeedbackForm = { name: '', origin: '', rating: 5, comment: '', avatar: '', active: true, sortOrder: 0 };

export function GuestFeedbackManager() {
  const [entries, setEntries] = useState<Testimonial[]>([]);
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;
    testimonialRequest<{ testimonials: Testimonial[] }>()
      .then((result) => { if (mounted) setEntries(result.testimonials); })
      .catch((reason: Error) => { if (mounted) setError(reason.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const edit = (entry: FeedbackForm) => {
    setForm({ ...entry, origin: entry.origin || '', avatar: entry.avatar || '' });
    setPhoto(null);
    setError('');
    setNotice('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError('');
    try {
      let avatar = form.avatar;
      if (photo) {
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(photo.type) || photo.size > 10 * 1024 * 1024) {
          throw new Error('Choose a JPG, PNG, WebP, or GIF photo that is 10 MB or smaller.');
        }
        const body = new FormData();
        body.append('file', photo);
        body.append('title', `${form.name} guest photo`);
        body.append('altText', form.name);
        body.append('category', 'SITE_PAGE');
        const response = await fetch('/api/cms/media', { method: 'POST', body });
        const result = await response.json();
        if (!response.ok || !result.success || !result.media?.url) throw new Error(result.error || 'Guest photo upload failed.');
        avatar = result.media.url;
      }
      const result = await testimonialRequest<{ testimonial: Testimonial }>(form.id ? `/${form.id}` : '', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testimonial: { ...form, avatar } })
      });
      setEntries((current) => [...current.filter((entry) => entry.id !== result.testimonial.id), result.testimonial]
        .sort((left, right) => left.sortOrder - right.sortOrder));
      setForm(null);
      setPhoto(null);
      setNotice('Guest feedback saved. Active feedback is now published on the homepage.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save guest feedback.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: Testimonial) => {
    if (!window.confirm(`Delete feedback from ${entry.name}?`)) return;
    setSaving(true);
    setError('');
    try {
      await testimonialRequest(`/${entry.id}`, { method: 'DELETE' });
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      if (form?.id === entry.id) setForm(null);
      setNotice('Guest feedback deleted.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete guest feedback.');
    } finally {
      setSaving(false);
    }
  };

  return <Card title="Guest Feedback" action={<Button size="sm" disabled={loading || saving} onClick={() => edit({ ...blankFeedback, sortOrder: entries.length ? Math.max(...entries.map((entry) => entry.sortOrder)) + 1 : 0 })}><Plus size={16} />Add Feedback</Button>}>

    {error && <p role="alert" style={{ color: 'var(--danger-red)', marginBottom: 12 }}>{error}</p>}
    {notice && <p role="status" style={{ color: 'var(--brand-green)', marginBottom: 12 }}>{notice}</p>}
    {form && <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24, padding: 20, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
      <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary-orange)' }}>{form.id ? 'Edit Guest Feedback' : 'Add Guest Feedback'}</h3>
      <label className="hne-form-group"><span className="hne-label">Guest name</span><input required maxLength={120} className="hne-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label className="hne-form-group"><span className="hne-label">Location or guest description</span><input maxLength={160} className="hne-input" placeholder="e.g. Kathmandu, Nepal" value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value })} /></label>
      <label className="hne-form-group"><span className="hne-label">Rating</span><select className="hne-input" value={form.rating} onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} {rating === 1 ? 'star' : 'stars'}</option>)}</select></label>
      <label className="hne-form-group"><span className="hne-label">Review</span><textarea required maxLength={2000} rows={4} className="hne-textarea" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} /></label>
      <label className="hne-form-group"><span className="hne-label">Guest photo (optional)</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setPhoto(event.target.files?.[0] || null)} /><input type="url" className="hne-input" placeholder="Or paste a photo URL" value={form.avatar} onChange={(event) => setForm({ ...form, avatar: event.target.value })} />{form.avatar && <img src={form.avatar} alt={form.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />}</label>
      <label className="hne-form-group"><span className="hne-label">Display order</span><input required type="number" min={0} step={1} className="hne-input" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} /></label>
      <label className="hne-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />Show on homepage</label>
      <div style={{ display: 'flex', gap: 10 }}><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Feedback'}</Button><Button type="button" variant="secondary" disabled={saving} onClick={() => { setForm(null); setPhoto(null); }}>Cancel</Button></div>
    </form>}
    {loading ? <p>Loading guest feedback…</p> : !entries.length ? <p style={{ color: 'var(--text-muted)' }}>No feedback yet. Click Add Feedback to publish your first review.</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{entries.map((entry) => <div key={entry.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div><strong>{entry.name}</strong> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entry.active ? 'Published' : 'Hidden'} · Order {entry.sortOrder}</span><div style={{ fontSize: 12 }}>{entry.origin}</div></div>
        <div style={{ display: 'flex', gap: 8 }}><Button size="sm" variant="secondary" disabled={saving} onClick={() => edit(entry)}><Pencil size={14} />Edit</Button><Button size="sm" variant="secondary" disabled={saving} onClick={() => void remove(entry)}><Trash2 size={14} />Delete</Button></div>
      </div>
      <div aria-label={`${entry.rating} stars`} style={{ display: 'flex', gap: 3, margin: '8px 0', color: 'var(--brand-gold)' }}>{Array.from({ length: entry.rating }, (_, index) => <Star key={index} size={14} fill="currentColor" />)}</div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{entry.comment}</p>
    </div>)}</div>}
  </Card>;
}
