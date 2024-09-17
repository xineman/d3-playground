<template>
  <div id="map"></div>
  <form>
    <label for="photos">Photos</label>
    <input id="photos" type="file" multiple accept="image/*" @change="handlePhotosChange" />
    <label for="track">Track</label>
    <input ref="trackInput" id="track" type="file" accept=".gpx" @change="updateGpxTrack" />
    <button type="button" @click="removeTrack">Remove track</button>
    <button type="reset" @click="resetMap">Reset</button>
  </form>
</template>
<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { onMounted, ref, watch } from 'vue'
import L, { LatLng } from 'leaflet'
import ExifReader from 'exifreader'
import 'leaflet/dist/leaflet.css'
import type { FeatureCollection, GeoJsonProperties, Geometry, LineString, Position } from 'geojson'
import { parseGpx } from '@/services/gpx'

useHead({
  title: 'Yurii'
})

function findClosestCoordinate(coords: Position[], target: LatLng) {
  let minDistance = Infinity
  let closestIndex = -1
  coords.forEach((c, index) => {
    const coordLatLng = L.latLng(c[1], c[0])
    const distance = target.distanceTo(coordLatLng)
    if (distance < minDistance) {
      minDistance = distance
      closestIndex = index
    }
  })
  return { index: closestIndex, minDistance }
}
function getPhotoDistanceToRoute(photoLatLng: L.LatLng) {
  return trackGeoJson.value
    ? findClosestCoordinate(
        (trackGeoJson.value.features[0].geometry as LineString).coordinates,
        photoLatLng
      ).minDistance
    : Infinity
}

function getBase64(file: File): Promise<string> {
  var fileReader = new FileReader()
  if (file) {
    fileReader.readAsDataURL(file)
  }
  return new Promise((resolve, reject) => {
    fileReader.onload = function (event: ProgressEvent<FileReader>) {
      resolve(event.target?.result)
    }
  })
}

const trackInput = ref<HTMLInputElement>()
const map = ref<L.Map>()
const routeLayer = ref<L.GeoJSON | null>(null)
const photoMarkersLayer = ref(L.layerGroup())
const photoPopupsLayer = ref(L.layerGroup())

const trackGeoJson = ref<FeatureCollection | null>(null)
const selectedPhotos = ref<RoutePhoto[]>([])
interface RoutePhoto {
  base64: string
  latlng: L.LatLng
  distance: number
  id: string
}

onMounted(() => {
  map.value = L.map('map', {
    center: [0, 0],
    zoom: 1
  })
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map.value)
})

watch(selectedPhotos, () => {
  openPhotoPopups()
  placeUnrelevantPhotos()
})

function calculateSelectedPhotosDistanceToRoute() {
  selectedPhotos.value = selectedPhotos.value.map((p) => ({
    ...p,
    distance: getPhotoDistanceToRoute(p.latlng)
  }))
}
watch(trackGeoJson, calculateSelectedPhotosDistanceToRoute)

function removeTrack() {
  if (trackInput.value) {
    trackInput.value.value = ''
    trackGeoJson.value = null
  }
  if (routeLayer.value) {
    routeLayer.value.remove()
    routeLayer.value = null
    trackGeoJson.value = null
  }
}

function resetMap() {
  map.value?.setView([0, 0], 1)
  trackGeoJson.value = null
  routeLayer.value?.remove()
  routeLayer.value = null
  selectedPhotos.value = []
}

function placeTrackOnMap(features: FeatureCollection<Geometry, GeoJsonProperties>) {
  if (!map.value) {
    return
  }
  routeLayer.value = L.geoJSON(features)
  routeLayer.value.addTo(map.value)
  const routeBounds = routeLayer.value.getBounds()
  map.value.fitBounds(routeBounds)

  const circleMarker = L.circleMarker([0, 0], {
    radius: 7,
    interactive: false
  })
  routeLayer.value.on('mousemove', ({ propagatedFrom, latlng }) => {
    const coords = propagatedFrom.feature.geometry.coordinates
    const { index: hoveredIndex } = findClosestCoordinate(coords, latlng)
    circleMarker.setLatLng(L.latLng(coords[hoveredIndex][1], coords[hoveredIndex][0]))
    if (!map.value) {
      return
    }
    map.value.addLayer(circleMarker)
    photoPopupsLayer.value.remove()
    L.popup({ content: `<p>Elevation: ${coords[hoveredIndex][2].toFixed(2)} m</p>` })
      .setLatLng(latlng)
      .openOn(map.value)
  })
  routeLayer.value.on('mouseout', () => {
    if (!map.value) {
      return
    }
    map.value.removeLayer(circleMarker)
    map.value.closePopup()
    openPhotoPopups()
  })
}

async function updateGpxTrack(event: Event) {
  const track = (event.target as HTMLInputElement).files?.[0]
  if (!track) {
    return
  }
  try {
    const geoJson = parseGpx(await track.text())
    trackGeoJson.value = geoJson as FeatureCollection
    placeTrackOnMap(trackGeoJson.value)
  } catch (error) {
    console.error(error)
    alert(error)
  }
}

function computeFileId(file: File) {
  return `${file.name}+${file.size}+${file.lastModified}`
}
async function processPhoto(
  photo: File,
  existingFiles: Record<string, RoutePhoto>
): Promise<RoutePhoto | null> {
  const photoId = computeFileId(photo)
  if (existingFiles[photoId]) {
    return existingFiles[photoId]
  }
  const tags = await ExifReader.load(photo)
  const lat = tags.GPSLatitude?.description
  const lng = tags.GPSLongitude?.description
  const date = tags.DateTimeOriginal?.description

  if (!lat || !lng) {
    return null
  }
  const photoLatLng = L.latLng(Number(lat), Number(lng))
  const minDistance = getPhotoDistanceToRoute(photoLatLng)

  console.log(
    'Processed photo',
    photo.name,
    `Coordinates: ${lat}, ${lng}`,
    'Distance:',
    minDistance,
    'm',
    `Date: ${date}`
  )
  return {
    id: computeFileId(photo),
    base64: await getBase64(photo),
    latlng: photoLatLng,
    distance: minDistance
  }
}

async function handlePhotosChange(event: Event) {
  const { files } = event.target as HTMLInputElement
  if (!files) {
    return
  }

  const existingFiles = selectedPhotos.value.reduce(
    (acc, cur) => ({ ...acc, [cur.id]: cur }),
    {} as Record<string, RoutePhoto>
  )

  const photos = (
    await Promise.all(Array.from(files).map((f) => processPhoto(f, existingFiles)))
  ).filter((f) => !!f)
  selectedPhotos.value = photos
}

function placeUnrelevantPhotos() {
  photoMarkersLayer.value.clearLayers()
  selectedPhotos.value
    .filter((p) => p.distance > 100)
    .forEach((photo) => {
      photoMarkersLayer.value.addLayer(
        L.marker(photo.latlng).bindPopup(`<img class="route-image" src=${photo.base64} />`)
      )
    })
  if (map.value) {
    photoMarkersLayer.value.addTo(map.value)
  }
}

function openPhotoPopups() {
  photoPopupsLayer.value.clearLayers()
  selectedPhotos.value
    .filter((p) => p.distance <= 100)
    .forEach((photo) => {
      photoPopupsLayer.value.addLayer(
        L.popup({ content: `<img class="route-image" src=${photo.base64} />` }).setLatLng(
          photo.latlng
        )
      )
    })
  if (map.value) {
    photoPopupsLayer.value.addTo(map.value)
  }
}
</script>
<style scoped lang="scss">
#map {
  height: 480px;
}
:deep(.route-image) {
  height: 150px;
}
</style>
