import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, MapPin, Loader2, X, ExternalLink, AlertCircle } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const CANADA_CENTER = { lat: 56.130366, lng: -106.346771 };

// ---- Google Maps SDK (map display + marker only) ----
let _loaderPromise = null;

function loadGoogleMaps() {
    if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
    if (_loaderPromise) return _loaderPromise;

    if (!API_KEY) {
        return Promise.reject(new Error('Google Maps API key is not configured.'));
    }

    _loaderPromise = new Promise((resolve, reject) => {
        const cb = '_gmapsReady_umahz';
        window[cb] = () => {
            resolve(window.google.maps);
            delete window[cb];
        };
        const s = document.createElement('script');
        s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geocoding&callback=${cb}`;
        s.async = true;
        s.defer = true;
        s.onerror = () => {
            _loaderPromise = null;
            reject(new Error('Google Maps SDK could not be loaded.'));
        };
        document.head.appendChild(s);
    });

    return _loaderPromise;
}

// ---- Places API (New) — direct REST calls with fallback to Geocoder ----
async function autocomplete(input) {
    if (input.trim().length < 2 || !API_KEY) return [];
    try {
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
    } catch (e) {
        console.warn('Autocomplete fetch error:', e);
        return [];
    }
}

async function placeDetails(placeId) {
    if (!API_KEY) return null;
    const res = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?fields=location,addressComponents&languageCode=en`,
        { headers: { 'X-Goog-Api-Key': API_KEY } },
    );
    if (!res.ok) throw new Error(`Place details error ${res.status}`);
    return res.json();
}

function parseComponents(components = [], lat, lng, provinces = []) {
    const get = (type) => {
        const c = components.find((ac) => (ac.types ?? []).includes(type));
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
export default function AddressPicker({ lat, lng, onPick, provinces = [], dark = false, addressText = '' }) {
    let themeCtx = null;
    try {
        themeCtx = useTheme();
    } catch (e) {}
    const isDark = (themeCtx ? themeCtx.resolved === 'dark' : false) || dark;

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
        if (!geocoderRef.current) return;
        geocoderRef.current.geocode({ location: { lat: la, lng: lo } }, (results, status) => {
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

        const m = new gmaps.Marker({
            map: mapRef.current,
            position: { lat: la, lng: lo },
            draggable: true,
            animation: gmaps.Animation ? gmaps.Animation.DROP : null,
        });

        m.addListener('dragend', () => {
            const p = m.getPosition();
            if (p) {
                reverseGeocode(p.lat(), p.lng());
            }
        });

        markerRef.current = m;
    }, [reverseGeocode]);

    // ---- Initialise map once ----
    useEffect(() => {
        let cancelled = false;

        // Catch Google Auth Failures (restricted keys / billing)
        window.gm_authFailure = () => {
            if (!cancelled) {
                setMapError('Google Maps authorization failed (key may be domain-restricted).');
                setMapLoading(false);
            }
        };

        loadGoogleMaps()
            .then((gmaps) => {
                if (cancelled || !mapEl.current) return;
                gmapsRef.current = gmaps;

                const hasPin = Number.isFinite(lat) && Number.isFinite(lng);
                const map = new gmaps.Map(mapEl.current, {
                    center: hasPin ? { lat, lng } : CANADA_CENTER,
                    zoom:   hasPin ? 15 : 4,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    zoomControl: true,
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

                if (hasPin) {
                    placeMarker(lat, lng);
                }
                setMapLoading(false);
            })
            .catch((err) => {
                if (!cancelled) {
                    setMapError(err.message || 'Map unavailable');
                    setMapLoading(false);
                }
            });

        return () => {
            cancelled = true;
            if (markerRef.current) {
                if (typeof markerRef.current.setMap === 'function') markerRef.current.setMap(null);
                markerRef.current = null;
            }
            mapRef.current      = null;
            geocoderRef.current = null;
            gmapsRef.current    = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync pin when lat/lng changes externally
    useEffect(() => {
        if (mapRef.current && Number.isFinite(lat) && Number.isFinite(lng)) {
            mapRef.current.panTo({ lat, lng });
            placeMarker(lat, lng);
        }
    }, [lat, lng, placeMarker]);

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
                console.warn('Autocomplete error:', e);
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
            const la = details?.location?.latitude;
            const lo = details?.location?.longitude;
            if (la == null || lo == null) return;

            if (mapRef.current) {
                mapRef.current.panTo({ lat: la, lng: lo });
                mapRef.current.setZoom(16);
            }
            placeMarker(la, lo);
            emit(parseComponents(details.addressComponents ?? [], la, lo, provinces));
        } catch (e) {
            console.warn('Place details error:', e);
        }
    };

    const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

    return (
        <div className="space-y-3">
            {/* Search Input Box */}
            <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => suggestions.length && setOpen(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="Search address or landmark to auto-fill…"
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 outline-none border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-[#8200db] focus:border-transparent"
                    autoComplete="off"
                />

                {/* Right-side spinner / clear */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                    {searching ? (
                        <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                    ) : query ? (
                        <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); }}>
                            <X className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                        </button>
                    ) : null}
                </div>

                {/* Suggestions dropdown */}
                {open && suggestions.length > 0 && (
                    <ul className="absolute z-50 mt-1.5 w-full rounded-2xl border border-slate-200/80 dark:border-white/15 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-60 overflow-auto divide-y divide-slate-100 dark:divide-white/5">
                        {suggestions.map((s, i) => {
                            const pred     = s.placePrediction ?? {};
                            const mainText = pred.structuredFormat?.mainText?.text ?? pred.text?.text ?? '';
                            const secText  = pred.structuredFormat?.secondaryText?.text ?? '';
                            return (
                                <li key={pred.placeId ?? i}>
                                    <button
                                        type="button"
                                        onClick={() => choose(s)}
                                        className="w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-purple-500/10 transition-colors"
                                    >
                                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#8200db] dark:text-purple-400" />
                                        <div>
                                            <span className="text-xs font-bold block text-slate-900 dark:text-white">
                                                {mainText}
                                            </span>
                                            {secText && (
                                                <span className="text-[11px] block mt-0.5 text-slate-500 dark:text-slate-400">
                                                    {secText}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Map Canvas Container (with rounded-2xl matching cards) */}
            <div className="relative rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
                {/* Real Google Map element */}
                <div
                    ref={mapEl}
                    className={`w-full transition-opacity duration-300 ${
                        mapError ? 'hidden' : 'block'
                    }`}
                    style={{ height: 260 }}
                />

                {/* Loading state */}
                {mapLoading && !mapError && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin text-[#8200db] dark:text-purple-300" />
                        <span>Initializing interactive map…</span>
                    </div>
                )}

                {/* Graceful Fallback (if map fails to load or key restricted) */}
                {mapError && (
                    <div className="p-6 bg-white/40 dark:bg-white/[0.02] backdrop-blur-md flex flex-col items-center justify-center text-center space-y-2 min-h-[220px]">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div className="space-y-0.5 max-w-md">
                            <div className="flex items-center justify-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {addressText || 'Clinic Location Saved'}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                                    Map preview unavailable
                                </span>
                            </div>
                            {hasCoordinates ? (
                                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                    Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}
                                </p>
                            ) : (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Search above or type street address to update coordinates.
                                </p>
                            )}
                        </div>

                        {hasCoordinates && (
                            <a
                                href={`https://maps.google.com/?q=${lat},${lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#8200db] dark:text-purple-300 hover:underline pt-1"
                            >
                                <span>View on Google Maps</span>
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                )}
            </div>

            {/* Helper tip */}
            {!mapError && (
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>Search above, or click and drag the pin on the map to set exact entrance coordinates.</span>
                </p>
            )}
        </div>
    );
}
