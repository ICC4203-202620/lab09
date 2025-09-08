let _geocoder = null;

export function ensureGeocoder() {
    if (!_geocoder) {
        if (!window.google || !window.google.maps) return null;
        _geocoder = new window.google.maps.Geocoder();
    }
    return _geocoder;
}

export async function geocodeAddress(query) {
    const geocoder = ensureGeocoder();
    if (!geocoder) throw new Error("Google Maps no está listo");
    const { results } = await geocoder.geocode({ address: query });
    if (!results?.length) throw new Error("Sin resultados");
    const loc = results[0].geometry.location;
    return {
        latLng: { lat: loc.lat(), lng: loc.lng() },
        formatted: results[0].formatted_address,
    };
}

export async function reverseGeocode(latLng) {
    const geocoder = ensureGeocoder();
    if (!geocoder) throw new Error("Google Maps no está listo");
    const { results } = await geocoder.geocode({ location: latLng });
    return results?.[0]?.formatted_address || "";
}