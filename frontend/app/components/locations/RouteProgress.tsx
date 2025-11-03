import React, { useEffect, useMemo, useRef } from 'react';

export type LatLng = { latitude: number; longitude: number };

type Props = {
  routeCoords: LatLng[];
  userLocation: LatLng | null;
  navIndex?: number; // hint for search window
  window?: number; // number of segments around navIndex to check
  smoothingAlpha?: number; // EMA alpha for remaining distance
  onUpdate?: (data: {
    nearestIndex: number;
    t: number; // fraction along the segment [0..1]
    projected: LatLng;
    distanceToSegmentKm: number;
    remainingKm: number;
    smoothedRemainingKm: number;
  }) => void;
};

const R = 6371000; // meters
const deg2rad = (d: number) => (d * Math.PI) / 180;

function haversineKm(a: LatLng, b: LatLng) {
  const dLat = deg2rad(b.latitude - a.latitude);
  const dLon = deg2rad(b.longitude - a.longitude);
  const lat1 = deg2rad(a.latitude);
  const lat2 = deg2rad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return (R * c) / 1000;
}

// convert lat/lon to local XY meters around a reference latitude
function latLonToXY(lat: number, lon: number, refLat: number) {
  const x = deg2rad(lon) * R * Math.cos(deg2rad(refLat));
  const y = deg2rad(lat) * R;
  return { x, y };
}

export default function RouteProgress({ routeCoords, userLocation, navIndex = 0, window = 60, smoothingAlpha = 0.45, onUpdate }: Props) {
  const prevSmoothed = useRef<number | null>(null);

  // prefixRemaining[i] = distance in km from point i to destination (point i included)
  const prefixRemaining = useMemo(() => {
    const n = routeCoords ? routeCoords.length : 0;
    const pref: number[] = new Array(Math.max(0, n)).fill(0);
    if (n === 0) return pref;
    // compute from back to front
    pref[n - 1] = 0;
    for (let i = n - 2; i >= 0; i--) {
      pref[i] = pref[i + 1] + haversineKm(routeCoords[i], routeCoords[i + 1]);
    }
    return pref;
  }, [routeCoords]);

  useEffect(() => {
    if (!userLocation || !routeCoords || routeCoords.length < 2) return;

    // search window around navIndex
    const n = routeCoords.length;
    const start = Math.max(0, Math.min(n - 2, navIndex - window));
    const end = Math.min(n - 2, Math.max(0, navIndex + window));

    // reference latitude for projection accuracy
    const refLat = routeCoords[Math.max(0, Math.min(n - 1, navIndex))].latitude;

    let best = {
      idx: start,
      t: 0,
      dist: Infinity,
      projected: { latitude: routeCoords[start].latitude, longitude: routeCoords[start].longitude },
      remaining: prefixRemaining[start] || 0,
    };

    // convert user to XY
    const userXY = latLonToXY(userLocation.latitude, userLocation.longitude, refLat);

    for (let i = start; i <= end; i++) {
      const A = routeCoords[i];
      const B = routeCoords[i + 1];
      // project in meters using local planar approx
      const Axy = latLonToXY(A.latitude, A.longitude, refLat);
      const Bxy = latLonToXY(B.latitude, B.longitude, refLat);
      const vx = Bxy.x - Axy.x;
      const vy = Bxy.y - Axy.y;
      const wx = userXY.x - Axy.x;
      const wy = userXY.y - Axy.y;
      const vv = vx * vx + vy * vy;
      let t = vv === 0 ? 0 : (wx * vx + wy * vy) / vv;
      const tClamped = Math.max(0, Math.min(1, t));
      const projX = Axy.x + tClamped * vx;
      const projY = Axy.y + tClamped * vy;
      // convert proj back to lat/lon (approx inverse)
      const projLat = (projY / R) * (180 / Math.PI);
      const projLon = (projX / (R * Math.cos(deg2rad(refLat)))) * (180 / Math.PI);
      const projPoint = { latitude: projLat, longitude: projLon };
      const dKm = haversineKm(userLocation, projPoint);
      if (dKm < best.dist) {
        const segDist = haversineKm(A, B);
        const remaining = (1 - tClamped) * segDist + (prefixRemaining[i + 1] || 0);
        best = { idx: i, t: tClamped, dist: dKm, projected: projPoint, remaining } as any;
      }
    }

    // smoothing remaining via EMA
    const prev = prevSmoothed.current;
    const newRem = best.remaining;
    const smoothed = prev == null ? newRem : (smoothingAlpha * newRem + (1 - smoothingAlpha) * prev);
    prevSmoothed.current = smoothed;

    if (onUpdate) {
      try {
        onUpdate({
          nearestIndex: best.idx,
          t: best.t,
          projected: best.projected,
          distanceToSegmentKm: best.dist,
          remainingKm: newRem,
          smoothedRemainingKm: smoothed,
        });
      } catch (e) {
        // ignore
      }
    }
  }, [userLocation, routeCoords, prefixRemaining, navIndex, window, smoothingAlpha, onUpdate]);

  return null; // purely computational component
}
