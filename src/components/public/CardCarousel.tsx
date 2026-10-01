import { Children, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import './CardCarousel.css';

const arrowStyle: CSSProperties = {
  position: 'absolute', transform: 'translateY(-50%)',
  width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: '#FFFFFF',
  color: 'var(--brand-crimson)', boxShadow: 'var(--shadow-md)', cursor: 'pointer', zIndex: 1
};

export function CardCarousel({ children, label, arrowTop = '50%', roomControls = false }: { children: ReactNode; label: string; arrowTop?: CSSProperties['top']; roomControls?: boolean }) {
  const cards = Children.toArray(children);
  const count = cards.length;
  const viewport = useRef<HTMLDivElement>(null);
  const moving = useRef(false);
  const drag = useRef<{ pointerId: number; x: number; y: number; offset: number } | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [width, setWidth] = useState(0);
  const [position, setPosition] = useState(0);
  const [animated, setAnimated] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const visible = Math.max(1, Math.min(count, width >= 1000 ? 3 : width >= 640 ? 2 : 1));
  const clones = count > 1 ? visible : 0;
  const step = (width + 24) / visible;
  const buttonStyle: CSSProperties = roomControls ? { position: 'absolute', transform: 'translateY(-50%)', zIndex: 1 } : arrowStyle;

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [count]);

  useEffect(() => {
    setPosition(0);
    setAnimated(false);
    moving.current = false;
    drag.current = null;
    setDragging(false);
    setDragOffset(0);
  }, [count]);

  useEffect(() => {
    if (animated) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setAnimated(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [animated]);

  const advance = (direction: number) => {
    if (count < 2 || moving.current) return;
    moving.current = true;
    setPosition((current) => current + direction);
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!roomControls || count < 2 || moving.current || !animated || !event.isPrimary || event.button !== 0) return;
    const interactive = (event.target as Element).closest('a, button, input, select, textarea');
    if (interactive && !interactive.hasAttribute('data-carousel-draggable')) return;
    suppressClick.current = false;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offset: 0 };
    setDragging(true);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const horizontal = event.clientX - gesture.x;
    const vertical = event.clientY - gesture.y;
    if (Math.abs(horizontal) < 6 || Math.abs(horizontal) < Math.abs(vertical)) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    const limit = step * 0.9;
    gesture.offset = Math.max(-limit, Math.min(limit, horizontal));
    setDragOffset(gesture.offset);
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    setDragOffset(0);
    suppressClick.current = Math.abs(gesture.offset) >= 6;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancelled && Math.abs(gesture.offset) >= Math.max(30, Math.min(60, step * 0.15))) {
      advance(gesture.offset < 0 ? 1 : -1);
    }
  };

  useEffect(() => {
    if (count < 2 || hovered || focused) return;
    const timer = window.setInterval(() => {
      if (document.hidden || moving.current || drag.current) return;
      moving.current = true;
      setPosition((current) => current + 1);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [count, hovered, focused]);

  if (!count) return null;
  const slides = clones ? [...cards.slice(-clones), ...cards, ...cards.slice(0, clones)] : cards;

  return <div role="region" aria-roledescription="carousel" aria-label={label} style={{ position: 'relative', padding: count > 1 ? (roomControls ? '0 24px' : '0 44px') : undefined }}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div ref={viewport} className={roomControls ? 'hne-carousel-room-viewport' : undefined} style={{ overflow: 'hidden', paddingBottom: 8, touchAction: roomControls ? 'pan-y' : undefined, userSelect: roomControls ? 'none' : undefined, cursor: roomControls && count > 1 ? (dragging ? 'grabbing' : 'grab') : undefined }}
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={(event) => finishDrag(event)}
      onPointerCancel={(event) => finishDrag(event, true)} onLostPointerCapture={(event) => finishDrag(event, true)}
      onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) finishDrag(event, true); }}
      onDragStart={(event) => { if (roomControls) event.preventDefault(); }}
      onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'stretch', transform: `translateX(${-(position + clones) * step + dragOffset}px)`, transition: animated && !dragging ? 'transform 450ms ease' : 'none' }}
        onTransitionEnd={(event) => {
          if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
          moving.current = false;
          if (position >= count || position < 0) {
            setAnimated(false);
            setPosition((position + count) % count);
          }
        }}>
        {slides.map((card, index) => {
          const original = index - clones;
          const active = original >= 0 && original < count && Array.from({ length: visible }, (_, offset) => (position + offset + count) % count).includes(original);
          return <div key={index} role="group" aria-roledescription="slide" aria-label={`${(index - clones + count) % count + 1} of ${count}`} aria-hidden={!active}
            ref={(element) => { if (active) element?.removeAttribute('inert'); else element?.setAttribute('inert', ''); }}
            style={{ flex: `0 0 calc((100% - ${(visible - 1) * 24}px) / ${visible})`, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {card}
          </div>;
        })}
      </div>
    </div>
    {count > 1 && <>
      <button type="button" className={roomControls ? 'hne-carousel-room-arrow' : undefined} style={{ ...buttonStyle, top: arrowTop, left: 0 }} aria-label={`Previous ${label}`} onClick={() => advance(-1)}>{roomControls ? <ArrowLeft size={24} strokeWidth={2.25} /> : <ChevronLeft size={20} />}</button>
      <button type="button" className={roomControls ? 'hne-carousel-room-arrow' : undefined} style={{ ...buttonStyle, top: arrowTop, right: 0 }} aria-label={`Next ${label}`} onClick={() => advance(1)}>{roomControls ? <ArrowRight size={24} strokeWidth={2.25} /> : <ChevronRight size={20} />}</button>
    </>}
  </div>;
}
