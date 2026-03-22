const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'

export async function reverseGeocode({ lat, lng }) {
  try {
    const res = await fetch(`${NOMINATIM_URL}?format=json&lat=${lat}&lon=${lng}`)
    if (!res.ok) return null
    const data = await res.json()

    if (data.name && data.name.length > 0) {
      return data.name
    }

    if (data.address?.road && data.address?.city) {
      return `${data.address.road}, ${data.address.city}`
    }

    if (data.display_name && data.display_name.length > 0) {
      return data.display_name.substring(0, 60)
    }

    return null
  } catch {
    return null
  }
}
