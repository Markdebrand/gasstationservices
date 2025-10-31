import React, { useEffect, useRef, useState } from 'react';
import type { LatLng } from './RouteProgress';

type Props = {
  origin: LatLng | null; // current position (or projected point)
  destination: LatLng | null; // final destination
  enabled?: boolean; // whether to run
  intervalMs?: number; // request cadence
  smoothingAlpha?: number; // EMA alpha for duration smoothing (0..1)
  onUpdate?: (data: { durationSec: number; distanceM: number; smoothedDurationSec: number }) => void;
};

export default function RouteETA({ origin, destination, enabled = false, intervalMs = 8000, smoothingAlpha = 0.35, onUpdate }: Props) {
  const lastReq = useRef(0);
  const inFlight = useRef(false);
  const [smoothed, setSmoothed] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!enabled) return;
    if (!origin || !destination) return;

    const run = async () => {
      const now = Date.now();
      if (inFlight.current) return;
      if (now - lastReq.current < intervalMs) return;
      inFlight.current = true;
      lastReq.current = now;
      try {
        const s = `${origin.longitude},${origin.latitude}`;
        const e = `${destination.longitude},${destination.latitude}`;
        const url = `https://router.project-osrm.org/route/v1/driving/${s};${e}?overview=false&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (!mounted) return;
        if (data && data.routes && data.routes.length > 0) {
          const r = data.routes[0];
          const duration = Number(r.duration || 0); // seconds
          const distance = Number(r.distance || 0); // meters
          const prev = smoothed;
          const next = prev == null ? duration : (smoothingAlpha * duration + (1 - smoothingAlpha) * prev);
          setSmoothed(next);
          if (onUpdate) {
            try { onUpdate({ durationSec: duration, distanceM: distance, smoothedDurationSec: next }); } catch (e) {}
          }
        }
      } catch (e) {
        // ignore network/parse errors; consumer should fallback
        // console.warn('RouteETA failed', e);
      } finally {
        inFlight.current = false;
      }
    };

    // run immediately and then on interval
    run();
    const id = setInterval(() => run(), Math.max(1000, intervalMs));
    return () => { mounted = false; clearInterval(id); };
  }, [origin, destination, enabled, intervalMs, smoothingAlpha, onUpdate, smoothed]);

  return null;
}
