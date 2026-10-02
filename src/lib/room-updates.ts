import { useEffect, useRef } from 'react';

const roomEvent = 'hne:room-updated';

export function publishRoomUpdate() {
  window.dispatchEvent(new Event(roomEvent));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(roomEvent);
    channel.postMessage({ type: roomEvent });
    channel.close();
  }
}

// Cross-tab updates are immediate; polling also covers other staff devices.
export function useRoomUpdates(refresh: () => unknown, interval = 15_000) {
  const latestRefresh = useRef(refresh);
  latestRefresh.current = refresh;
  useEffect(() => {
    const update = () => {
      if (document.visibilityState === 'visible') latestRefresh.current();
    };
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(roomEvent) : null;
    if (channel) channel.onmessage = update;
    window.addEventListener(roomEvent, update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    const timer = interval > 0 ? window.setInterval(update, interval) : null;
    return () => {
      channel?.close();
      window.removeEventListener(roomEvent, update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [interval]);
}
