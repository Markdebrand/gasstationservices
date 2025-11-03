import React, { useEffect, useRef } from 'react';
import type { LatLng } from './RouteProgress';

type Props = {
  routeCoords: LatLng[];
  userLocation: LatLng | null;
  navIndex?: number; // hint for local window search
  enabled?: boolean;
  offRouteThresholdMeters?: number; // meters
  cooldownMs?: number;
  onStart?: () => void;
  onReroute?: (coords: LatLng[], routeInfo?: { distance?: number; duration?: number }) => void;
};

const R = 6371000;
const deg2rad = (d: number) => (d * Math.PI) / 180;

function haversineMeters(a: LatLng, b: LatLng) {
  const dLat = deg2rad(b.latitude - a.latitude);
  const dLon = deg2rad(b.longitude - a.longitude);
  const lat1 = deg2rad(a.latitude);
  const lat2 = deg2rad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

// simple local planar projection (meters) based on reference latitude
function latLonToXY(lat: number, lon: number, refLat: number) {
  const x = deg2rad(lon) * R * Math.cos(deg2rad(refLat));
  const y = deg2rad(lat) * R;
  return { x, y };
}

export default function RouteReroute({ routeCoords, userLocation, navIndex = 0, enabled = false, offRouteThresholdMeters = 30, cooldownMs = 15000, onStart, onReroute }: Props) {
  const lastAt = useRef<number>(0);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!userLocation) return;
    if (!routeCoords || routeCoords.length < 2) return;

    // find nearest distance to route in a window around navIndex
    const n = routeCoords.length;
    const start = Math.max(0, Math.min(n - 2, navIndex - 60));
    const end = Math.min(n - 2, Math.max(0, navIndex + 60));
    const refLat = routeCoords[Math.max(0, Math.min(n - 1, navIndex))].latitude;

    let best = { dist: Infinity, idx: start };
    const userXY = latLonToXY(userLocation.latitude, userLocation.longitude, refLat);
    for (let i = start; i <= end; i++) {
      const A = routeCoords[i];
      const B = routeCoords[i + 1];
      const Axy = latLonToXY(A.latitude, A.longitude, refLat);
      const Bxy = latLonToXY(B.latitude, B.longitude, refLat);
      const vx = Bxy.x - Axy.x;
      const vy = Bxy.y - Axy.y;
      const wx = userXY.x - Axy.x;
      const wy = userXY.y - Axy.y;
      const vv = vx * vx + vy * vy;
      const t = vv === 0 ? 0 : (wx * vx + wy * vy) / vv;
      const tc = Math.max(0, Math.min(1, t));
      const projX = Axy.x + tc * vx;
      const projY = Axy.y + tc * vy;
      const dx = userXY.x - projX;
      const dy = userXY.y - projY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < best.dist) best = { dist: d, idx: i };
    }

    const distMeters = best.dist; // already in meters via projection
    const now = Date.now();
    if (distMeters > offRouteThresholdMeters && now - lastAt.current > (cooldownMs || 15000) && !inFlight.current) {
      // trigger reroute
      inFlight.current = true;
      lastAt.current = now;
      if (onStart) try { onStart(); } catch (e) {}

      (async () => {
        try {
          // call OSRM from current user location to final destination
          const dest = routeCoords[routeCoords.length - 1];
          const s = `${userLocation.longitude},${userLocation.latitude}`;
          const e = `${dest.longitude},${dest.latitude}`;
          const url = `https://router.project-osrm.org/route/v1/driving/${s};${e}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();
          if (data && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coords = route.geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] }));
            if (onReroute) try { onReroute(coords, { distance: route.distance, duration: route.duration }); } catch (e) {}
          }
        } catch (err) {
          // fail silently; consumer may retry later
          console.warn('RouteReroute failed', err);
        } finally {
          inFlight.current = false;
        }
      })();
    }
  }, [enabled, userLocation, routeCoords, navIndex, offRouteThresholdMeters, cooldownMs, onStart, onReroute]);

  return null;
}
