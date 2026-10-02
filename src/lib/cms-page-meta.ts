import { useEffect } from 'react';

export function useCmsPageMeta(pathname: string) {
  useEffect(() => {
    const slug = pathname === '/' ? 'home' : pathname.slice(1);
    if (!['home', 'about', 'rooms', 'dining', 'banquet', 'offers', 'contact'].includes(slug)) return;
    const controller = new AbortController();
    fetch(`/api/cms/pages?slug=${slug}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((result) => {
        if (!result.success || !result.page || controller.signal.aborted) return;
        const page = result.page;
        document.title = page.seoTitle || page.title || 'Hotel New Era';
        const update = (attribute: 'name' | 'property', key: string, content: string) => {
          let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
          if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element); }
          element.content = content || '';
        };
        update('name', 'description', page.seoDescription);
        update('property', 'og:title', document.title);
        update('property', 'og:description', page.seoDescription);
        update('property', 'og:image', page.heroImageUrl);
      })
      .catch((error: Error) => { if (error.name !== 'AbortError') console.error('Unable to load page metadata:', error.message); });
    return () => controller.abort();
  }, [pathname]);
}
