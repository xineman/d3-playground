import { parseGPX } from '@we-gold/gpxjs'
import type { FeatureCollection } from 'geojson'

export function parseGpx(gpxString: string): FeatureCollection {
  const [parsedFile, error] = parseGPX(gpxString)
  if (error || !parsedFile) {
    throw error || new Error('File could not be parsed')
  }
  const geoJson = parsedFile.toGeoJSON()
  if (geoJson.type !== 'FeatureCollection') {
    throw new Error('File does not have a valid track')
  }
  return geoJson as FeatureCollection
}
