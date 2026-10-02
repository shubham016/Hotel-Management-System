import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BedDouble, Box, Check, ImageOff, Loader2, Maximize2, RotateCcw, Users, X, ZoomIn, ZoomOut } from 'lucide-react';
import './RoomPhotoPreview.css';

function getPreviewDocument() {
  // A same-origin embedded booking should cover the dashboard, not just its iframe.
  try {
    return window.top?.document || document;
  } catch {
    return document;
  }
}

export type RoomPhoto = {
  name: string;
  img: string;
  desc: string;
  price: number;
  bedLabel?: string;
  maxOccupancy?: number;
  amenities?: string[];
};

export function RoomPhotoButton({ room, onOpen, compact = false, disabled = false }: {
  room: RoomPhoto;
  onOpen: () => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <button type="button" className={`room-photo-trigger${compact ? ' room-photo-trigger--compact' : ''}`}
      aria-label={`Preview ${room.name} photo`} aria-haspopup="dialog" disabled={disabled}
      onClick={(event) => { event.stopPropagation(); event.currentTarget.focus({ preventScroll: true }); onOpen(); }}>
      <img src={room.img} alt={room.name} />
      {!disabled && <span className="room-photo-trigger__hint"><Maximize2 size={12} /><span>View</span></span>}
    </button>
  );
}

export function RoomPhotoPreview({ room, onClose }: { room: RoomPhoto; onClose: () => void }) {
  const [previewDocument] = useState(getPreviewDocument);
  const previewWindow = previewDocument.defaultView || window;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const titleId = useId();
  const hintId = useId();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [depth, setDepth] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [viewport, setViewport] = useState(() => ({ width: previewDocument.documentElement.clientWidth, height: previewDocument.documentElement.clientHeight }));

  useEffect(() => {
    const dialog = dialogRef.current!;
    const previousOverflow = previewDocument.body.style.overflow;
    const resize = () => setViewport({ width: previewDocument.documentElement.clientWidth, height: previewDocument.documentElement.clientHeight });
    dialog.showModal();
    previewDocument.body.style.overflow = 'hidden';
    previewWindow.addEventListener('resize', resize);
    return () => {
      previewWindow.removeEventListener('resize', resize);
      dialog.close();
      previewDocument.body.style.overflow = previousOverflow;
      openerRef.current?.focus({ preventScroll: true });
    };
  }, [previewDocument, previewWindow]);

  const changeZoom = (value: number) => {
    setZoom(Math.min(3, Math.max(1, value)));
    setPan({ x: 0, y: 0 });
    setTilt({ x: 0, y: 0 });
  };
  const reset = () => changeZoom(1);
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current && drag.current.pointerId === event.pointerId) {
      const image = imageRef.current!;
      const stage = stageRef.current!;
      const maxX = Math.max(0, (image.clientWidth * zoom - stage.clientWidth) / 2);
      const maxY = Math.max(0, (image.clientHeight * zoom - stage.clientHeight) / 2);
      setPan({
        x: Math.max(-maxX, Math.min(maxX, drag.current.originX + event.clientX - drag.current.x)),
        y: Math.max(-maxY, Math.min(maxY, drag.current.originY + event.clientY - drag.current.y))
      });
    } else if (depth && zoom === 1 && loaded && (event.pointerType === 'mouse' || event.buttons === 1)) {
      const bounds = event.currentTarget.getBoundingClientRect();
      setTilt({ x: ((event.clientY - bounds.top) / bounds.height - 0.5) * -7, y: ((event.clientX - bounds.left) / bounds.width - 0.5) * 10 });
    }
  };
  const endDrag = () => { drag.current = null; setDragging(false); };

  return createPortal(
    <dialog ref={dialogRef} className="room-photo-preview" data-room-preview aria-labelledby={titleId} aria-describedby={hintId}
      style={{ left: viewport.width / 2, top: viewport.height / 2 }}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        // Escape belongs to this preview, not the booking modal underneath it.
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.target === stageRef.current && loaded && !failed) {
          if (event.key === '+' || event.key === '=') changeZoom(zoom + 0.5);
          if (event.key === '-') changeZoom(zoom - 0.5);
          if (event.key === '0') reset();
          if (zoom > 1 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            const image = imageRef.current;
            const stage = stageRef.current;
            if (image && stage) {
              const maxX = Math.max(0, (image.clientWidth * zoom - stage.clientWidth) / 2);
              const maxY = Math.max(0, (image.clientHeight * zoom - stage.clientHeight) / 2);
              setPan((current) => ({
                x: Math.max(-maxX, Math.min(maxX, current.x + (event.key === 'ArrowLeft' ? 40 : event.key === 'ArrowRight' ? -40 : 0))),
                y: Math.max(-maxY, Math.min(maxY, current.y + (event.key === 'ArrowUp' ? 40 : event.key === 'ArrowDown' ? -40 : 0)))
              }));
            }
          }
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}>
      <header className="room-photo-preview__header">
        <div><span className="room-photo-preview__eyebrow">A closer look</span><h2 id={titleId}>{room.name}</h2></div>
        <button type="button" className="room-photo-preview__icon" aria-label="Close room preview" autoFocus onClick={onClose}><X size={20} /></button>
      </header>
      <div className={`room-photo-preview__stage${zoom > 1 ? ' is-zoomed' : ''}${dragging ? ' is-dragging' : ''}`}
        data-depth={depth && zoom === 1}
        ref={stageRef} tabIndex={0} role="group" aria-label="Room photo. Use plus and minus to zoom, arrow keys to move, and zero to reset."
        onPointerMove={handlePointerMove}
        onPointerDown={(event) => {
          if (!loaded || event.button !== 0) return;
          if (zoom === 1) {
            if (depth && event.pointerType !== 'mouse') event.currentTarget.setPointerCapture(event.pointerId);
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y };
          setDragging(true);
        }}
        onPointerUp={() => { endDrag(); setTilt({ x: 0, y: 0 }); }} onPointerCancel={() => { endDrag(); setTilt({ x: 0, y: 0 }); }} onLostPointerCapture={endDrag}
        onPointerLeave={() => { if (!drag.current) setTilt({ x: 0, y: 0 }); }}>
        {!loaded && !failed && <div className="room-photo-preview__status" role="status"><Loader2 className="hne-spin" size={24} /><span>Loading room photo…</span></div>}
        {failed ? <div className="room-photo-preview__status" role="status"><ImageOff size={30} /><span>This room photo is unavailable.</span><span>Please close the preview and try again.</span></div> :
          <img ref={imageRef} src={room.img} alt={room.name} draggable={false}
            onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
            style={{ opacity: loaded ? 1 : 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotateX(${depth && zoom === 1 ? tilt.x : 0}deg) rotateY(${depth && zoom === 1 ? tilt.y : 0}deg)` }} />}
        {loaded && !failed && <span className="room-photo-preview__photo-label">Room photo</span>}
      </div>
      <div className="room-photo-preview__toolbar">
        <button type="button" className="room-photo-preview__depth" aria-pressed={depth} disabled={!loaded || failed || zoom > 1}
          onClick={() => { setDepth(!depth); setTilt({ x: 0, y: 0 }); }}><Box size={16} />Depth view</button>
        <div className="room-photo-preview__zoom">
          <button type="button" className="room-photo-preview__icon" aria-label="Zoom out" disabled={!loaded || failed || zoom === 1} onClick={() => changeZoom(zoom - 0.5)}><ZoomOut size={18} /></button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" className="room-photo-preview__icon" aria-label="Zoom in" disabled={!loaded || failed || zoom === 3} onClick={() => changeZoom(zoom + 0.5)}><ZoomIn size={18} /></button>
          <button type="button" className="room-photo-preview__icon" aria-label="Reset photo view" disabled={!loaded || failed} onClick={reset}><RotateCcw size={16} /></button>
        </div>
      </div>
      <p id={hintId} className="room-photo-preview__hint">{zoom > 1 ? 'Drag the photo or use arrow keys to explore details.' : depth ? 'Move across the photo for a subtle depth effect. Zoom in to explore details.' : 'View the complete room photo. Zoom in to explore details.'}</p>
      <div className="room-photo-preview__details">
        <div className="room-photo-preview__facts">
          {room.bedLabel && <span><BedDouble size={15} />{room.bedLabel}</span>}
          {room.maxOccupancy && <span><Users size={15} />Up to {room.maxOccupancy} guests</span>}
          <span className="room-photo-preview__rate">Rs. {room.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}<small> / night</small></span>
        </div>
        {room.desc && <p>{room.desc}</p>}
        {!!room.amenities?.length && <div className="room-photo-preview__amenities">{room.amenities.map((amenity, index) => <span key={`${amenity}-${index}`}><Check size={12} />{amenity}</span>)}</div>}
      </div>
      <footer className="room-photo-preview__footer"><span>Keep exploring. Your booking details stay in place.</span><button type="button" onClick={onClose}>Back to booking</button></footer>
    </dialog>, previewDocument.body
  );
}
