import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RunPoint } from "../lib/types";

/**
 * Dark GPS map (OpenStreetMap / CARTO tiles — no API key required).
 * Swap tileLayer for Google Maps JS API later without touching callers.
 */
export default function RunMap({
  points,
  follow = false,
  fit = false,
  className,
  showDot = true,
}: {
  points: RunPoint[];
  follow?: boolean;
  fit?: boolean;
  className?: string;
  showDot?: boolean;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const dotRef = useRef<L.Marker | null>(null);
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, {
      zoomControl: false,
      zoom: 15,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: true,
      dragging: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);
    lineRef.current = L.polyline([], {
      color: "#d7ff3f",
      weight: 4,
      opacity: 0.95,
      lineJoin: "round",
      lineCap: "round",
    }).addTo(map);
    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 80);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      dotRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const line = lineRef.current;
    if (!map || !line) return;
    const ll = points.map((p) => [p.lat, p.lng] as [number, number]);
    line.setLatLngs(ll);

    if (ll.length > 0 && showDot) {
      if (!dotRef.current) {
        dotRef.current = L.marker(ll[ll.length - 1], {
          icon: L.divIcon({
            className: "",
            html: '<div class="runner-dot"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
          interactive: false,
        }).addTo(map);
      } else {
        dotRef.current.setLatLng(ll[ll.length - 1]);
      }
    }

    if (follow && ll.length > 0) {
      map.setView(ll[ll.length - 1], Math.max(map.getZoom(), 16));
    }
    if (fit && !fittedRef.current && ll.length > 4) {
      fittedRef.current = true;
      setTimeout(() => {
        lineRef.current && map.fitBounds(lineRef.current.getBounds(), { padding: [26, 26] });
      }, 120);
    }
  }, [points, follow, fit, showDot]);

  return <div ref={divRef} className={className} />;
}
