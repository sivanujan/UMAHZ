import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Search, MapPin, Loader2 } from 'lucide-react';

// Vite rewrites the default marker image paths — point Leaflet at the bundled assets.
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const CANADA_CENTER = [56.130366, -106.346771];
const NOMINATIM = 'https://nominatim.openstreetmap.org';

/** Turn a Nominatim address object into our flat address shape. `provinces`
 * (when given) canonicalises the province against the app's dropdown values;
 * anything that doesn't match is left blank so the user can pick it. */
function toAddress(a = {}, lat, lng, provinces = []) {
    const line1 = [a.house_number, a.road].filter(Boolean).join(' ');
    const city = a.city || a.town || a.village || a.municipality || a.hamlet || '';
    const rawRegion = (a.state || '').replace(/é/gi, 'e');
    const region = provinces.find((p) => p.replace(/é/gi, 'e').toLowerCase() === rawRegion.toLowerCase()) || '';
    const country = a.country && a.country.toLowerCase() === 'canada' ? 'Canada' : (a.country || '');
    return { line1, city, region, country, lat, lng };
}

export default function AddressPicker({ lat, lng, onPick, provinces = [], dark = false }) {
    const mapEl = useRef(null);
    const map = useRef(null);
    const marker = useRef(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);

    const emit = (addr) => onPick?.(addr);

    const reverse = async (la, lo) => {
        try {
            const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&lat=${la}&lon=${lo}&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
            const json = await res.json();
            emit(toAddress(json.address, la, lo, provinces));
        } catch (e) { /* leave fields as-is on failure */ }
    };

    const placeMarker = (la, lo) => {
        if (!map.current) return;
        if (marker.current) {
            marker.current.setLatLng([la, lo]);
        } else {
            marker.current = L.marker([la, lo], { draggable: true }).addTo(map.current);
            marker.current.on('dragend', () => {
                const p = marker.current.getLatLng();
                reverse(p.lat, p.lng);
            });
        }
    };

    // Initialise the map once.
    useEffect(() => {
        if (map.current || !mapEl.current) return undefined;

        const hasPin = Number.isFinite(lat) && Number.isFinite(lng);
        const instance = L.map(mapEl.current).setView(hasPin ? [lat, lng] : CANADA_CENTER, hasPin ? 15 : 3);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(instance);

        instance.on('click', (e) => {
            placeMarker(e.latlng.lat, e.latlng.lng);
            reverse(e.latlng.lat, e.latlng.lng);
        });

        map.current = instance;
        if (hasPin) placeMarker(lat, lng);
        setTimeout(() => instance.invalidateSize(), 120);

        return () => { instance.remove(); map.current = null; marker.current = null; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounced Nominatim search, restricted to Canada.
    useEffect(() => {
        if (query.trim().length < 3) { setResults([]); return undefined; }
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`${NOMINATIM}/search?format=jsonv2&countrycodes=ca&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`, { headers: { 'Accept-Language': 'en' } });
                setResults(await res.json());
                setOpen(true);
            } catch (e) { setResults([]); } finally { setSearching(false); }
        }, 500);
        return () => clearTimeout(t);
    }, [query]);

    const choose = (r) => {
        const la = parseFloat(r.lat);
        const lo = parseFloat(r.lon);
        map.current?.setView([la, lo], 16);
        placeMarker(la, lo);
        emit(toAddress(r.address, la, lo, provinces));
        setQuery(r.display_name);
        setResults([]);
        setOpen(false);
    };

    const inputClass = dark
        ? 'w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/40'
        : 'w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-9 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-700 focus:border-violet-700';

    return (
        <div className="space-y-2">
            <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length && setOpen(true)}
                    placeholder="Search for the clinic address…"
                    className={inputClass}
                />
                {searching && <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}

                {open && results.length > 0 && (
                    <ul className={`absolute z-[500] mt-1 w-full rounded-lg border shadow-lg max-h-60 overflow-auto ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        {results.map((r) => (
                            <li key={r.place_id}>
                                <button
                                    type="button"
                                    onClick={() => choose(r)}
                                    className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2 ${dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-violet-500" />
                                    <span>{r.display_name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div ref={mapEl} className="w-full rounded-xl overflow-hidden border border-slate-200" style={{ height: 240 }} />
            <p className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                Search above, or click / drag the pin on the map to set the exact location.
            </p>
        </div>
    );
}
