import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const CANADA_CENTER = { lat: 56.130366, lng: -106.346771 };

// ---- Google Maps SDK (map display + marker only) ----
let _loaderPromise = null;

function loadGoogleMaps() {
    if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
    if (_loaderPromise) return _loaderPromise;

    _loaderPromise = new Promise((resolve, reject) => {
        const cb = '_gmapsReady_umahz';
        window[cb] = () => { resolve(window.google.maps); delete window[cb]; };
        const s = document.createElement('script');
        s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=marker,geocoding&callback=${cb}&loading=async&v=weekly`;
        s.async = true;
        s.defer = true;
        s.onerror = () => { _loaderPromise = null; reject(new Error('Google Maps SDK failed to load.')); };
        document.head.appendChild(s);
    });

    return _loaderPromise;
}

// ---- Places API (New) — direct REST calls, no SDK widget needed ----
async function autocomplete(input) {
    if (input.trim().length < 2) return [];
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY,
        },
        body: JSON.stringify({
            input,
            includedRegionCodes: ['ca'],
            languageCode: 'en',
        }),
    });
    if (!res.ok) throw new Error(`Places autocomplete error ${res.status}`);
    const data = await res.json();
    return data.suggestions ?? [];
}

async function placeDetails(placeId) {
    const res = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?fields=location,addressComponents&languageCode=en`,
        { headers: { 'X-Goog-Api-Key': API_KEY } },
    );
    if (!res.ok) throw new Error(`Place details error ${res.status}`);
    return res.json();
}

// ---- Parse address components (works for both SDK + REST shapes) ----
function parseComponents(components = [], lat, lng, provinces = []) {
    const get = (type) => {
        const c = components.find((ac) => (ac.types ?? []).includes(type));
        // REST API (New): longText   |   SDK geocoder: long_name
        return c?.longText ?? c?.long_name ?? '';
    };
    const line1 = [get('street_number'), get('route')].filter(Boolean).join(' ');
    const city =
        get('locality') || get('sublocality_level_1') ||
        get('administrative_area_level_3') || get('administrative_area_level_2');
    const rawRegion = get('administrative_area_level_1');
    const region =
        provinces.find((p) => p.toLowerCase() === rawRegion.toLowerCase()) || rawRegion;
    return { line1, city, region, country: get('country'), lat, lng };
}

// ========== Component ==========
export default function AddressPicker({ lat, lng, onPick, provinces = [], dark = false }) {
    const mapEl       = useRef(null);
    const mapRef      = useRef(null);
    const markerRef   = useRef(null);
    const geocoderRef = useRef(null);
    const gmapsRef    = useRef(null);

    const [mapLoading, setMapLoading]     = useState(true);
    const [mapError,   setMapError]       = useState(null);
    const [query,      setQuery]          = useState('');
    const [suggestions, setSuggestions]   = useState([]);
    const [searching,  setSearching]      = useState(false);
    const [open,       setOpen]           = useState(false);

    const emit = useCallback((addr) => onPick?.(addr), [onPick]);

    // Reverse geocode via Maps JS API geocoder
    const reverseGeocode = useCallback((la, lo) => {
        geocoderRef.current?.geocode({ location: { lat: la, lng: lo } }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
                emit(parseComponents(results[0].address_components, la, lo, provinces));
            }
        });
    }, [emit, provinces]);

    // Add / move marker
    const placeMarker = useCallback((la, lo) => {
        const gmaps = gmapsRef.current;
        if (!gmaps || !mapRef.current) return;

        if (markerRef.current) {
            if (typeof markerRef.current.setPosition === 'function') {
                markerRef.current.setPosition({ lat: la, lng: lo });
            } else {
                markerRef.current.position = { lat: la, lng: lo };
            }
            return;
        }

        const AdvancedMarkerElement = gmaps.marker?.AdvancedMarkerElement;
        if (AdvancedMarkerElement) {
            const m = new AdvancedMarkerElement({
                map: mapRef.current,
                position: { lat: la, lng: lo },
                gmpDraggable: true,
            });
            m.addListener('dragend', () => {
                const pos = m.position;
                reverseGeocode(Number(pos.lat), Number(pos.lng));
            });
            markerRef.current = m;
        } else {
            const m = new gmaps.Marker({
                map: mapRef.current,
                position: { lat: la, lng: lo },
                draggable: true,
            });
            m.addListener('dragend', () => {
                const p = m.getPosition();
                reverseGeocode(p.lat(), p.lng());
            });
            markerRef.current = m;
        }
    }, [reverseGeocode]);

    // ---- Initialise map once ----
    useEffect(() => {
        let cancelled = false;

        loadGoogleMaps()
            .then((gmaps) => {
                if (cancelled || !mapEl.current) return;
                gmapsRef.current = gmaps;

                const hasPin = Number.isFinite(lat) && Number.isFinite(lng);
                const map = new gmaps.Map(mapEl.current, {
                    center: hasPin ? { lat, lng } : CANADA_CENTER,
                    zoom:   hasPin ? 15 : 4,
                    mapId: 'umahz_address_picker',
                    mapTypeControl:    false,
                    streetViewControl: false,
                    fullscreenControl: false,
                });
                mapRef.current      = map;
                geocoderRef.current = new gmaps.Geocoder();

                map.addListener('click', (e) => {
                    const la = e.latLng.lat();
                    const lo = e.latLng.lng();
                    map.panTo({ lat: la, lng: lo });
                    placeMarker(la, lo);
                    reverseGeocode(la, lo);
                });

                if (hasPin) placeMarker(lat, lng);
                setMapLoading(false);
            })
            .catch((err) => {
                if (!cancelled) { setMapError(err.message); setMapLoading(false); }
            });

        return () => {
            cancelled = true;
            if (markerRef.current) {
                if (typeof markerRef.current.setMap === 'function') markerRef.current.setMap(null);
                else markerRef.current.map = null;
                markerRef.current = null;
            }
            mapRef.current      = null;
            geocoderRef.current = null;
            gmapsRef.current    = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- Debounced Places search ----
    useEffect(() => {
        if (query.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const results = await autocomplete(query);
                setSuggestions(results);
                setOpen(results.length > 0);
            } catch (e) {
                console.error('Autocomplete error:', e);
                setSuggestions([]);
            } finally {
                setSearching(false);
            }
        }, 400);
        return () => clearTimeout(t);
    }, [query]);

    // ---- Select a suggestion ----
    const choose = async (suggestion) => {
        const pred      = suggestion.placePrediction ?? {};
        const placeId   = pred.placeId ?? '';
        const mainText  = pred.structuredFormat?.mainText?.text ?? '';
        const secText   = pred.structuredFormat?.secondaryText?.text ?? '';

        setQuery([mainText, secText].filter(Boolean).join(', '));
        setOpen(false);
        setSuggestions([]);

        if (!placeId) return;
        try {
            const details = await placeDetails(placeId);
            const la = details.location?.latitude;
            const lo = details.location?.longitude;
            if (la == null || lo == null) return;

            if (mapRef.current) {
                mapRef.current.panTo({ lat: la, lng: lo });
                mapRef.current.setZoom(16);
            }
            placeMarker(la, lo);
            emit(parseComponents(details.addressComponents ?? [], la, lo, provinces));
        } catch (e) {
            console.error('Place details error:', e);
        }
    };

    // ---- Styles ----
    const inputCls = dark
        ? 'w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/40 placeholder-slate-500'
        : 'w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-8 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-700 focus:border-violet-700 placeholder-slate-400';

    return (
        <div className="space-y-2">
            {/* ---- Search box with our own dropdown ---- */}
            <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => suggestions.length && setOpen(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="Search for the clinic address…"
                    className={inputCls}
                    autoComplete="off"
                />

                {/* Right-side spinner / clear */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {searching
                        ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                        : query
                            ? <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); }}>
                                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                              </button>
                            : null
                    }
                </div>

                {/* Suggestions dropdown */}
                {open && suggestions.length > 0 && (
                    <ul
                        className={`absolute z-[9999] mt-1 w-full rounded-xl border shadow-2xl max-h-64 overflow-auto ${
                            dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                    >
                        {suggestions.map((s, i) => {
                            const pred      = s.placePrediction ?? {};
                            const mainText  = pred.structuredFormat?.mainText?.text ?? pred.text?.text ?? '';
                            const secText   = pred.structuredFormat?.secondaryText?.text ?? '';
                            return (
                                <li key={pred.placeId ?? i}>
                                    <button
                                        type="button"
                                        onClick={() => choose(s)}
                                        className={`w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors ${
                                            dark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-violet-500" />
                                        <span>
                                            <span className={`text-xs font-semibold block ${dark ? 'text-slate-100' : 'text-slate-800'}`}>
                                                {mainText}
                                            </span>
                                            {secText && (
                                                <span className={`text-[11px] block mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    {secText}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* ---- Map canvas ---- */}
            <div
                ref={mapEl}
                className={`w-full rounded-xl overflow-hidden border ${dark ? 'border-slate-800' : 'border-slate-200'} ${mapLoading ? 'animate-pulse bg-slate-100' : ''}`}
                style={{ height: 240 }}
            />

            {mapError
                ? <p className="text-[11px] text-rose-500">⚠ {mapError}</p>
                : <p className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Search above, or click / drag the pin on the map to set the exact location.
                  </p>
            }
        </div>
    );
}
