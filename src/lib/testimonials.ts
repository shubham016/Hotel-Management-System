export type Testimonial = {
  id: string;
  name: string;
  origin: string;
  rating: number;
  comment: string;
  avatar: string;
  active: boolean;
  sortOrder: number;
};

export async function testimonialRequest<T>(path = '', init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/cms/testimonials${path}`, init);
  const result = await response.json();
  if (!response.ok || !result.success) {
    const details = result.details && typeof result.details === 'object'
      ? Object.entries(result.details).map(([field, messages]) => `${field} ${Array.isArray(messages) ? messages.join(', ') : messages}`).join('. ')
      : '';
    throw new Error(details || result.error || 'Unable to load or save guest feedback.');
  }
  return result as T;
}
