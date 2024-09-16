<template>
  <div id="map"></div>
  <form>
    <label for="photo">Photo</label>
    <input id="photo" type="file" accept="image/*" @change="handlePhoto" />
    <label for="track">Track</label>
    <input id="track" type="file" accept=".gpx" @change="updateGpxTrack" />
    <button type="reset" @click="resetMap">Reset</button>
  </form>
</template>
<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { onMounted, ref } from 'vue'
import L, { LatLng } from 'leaflet'
import ExifReader from 'exifreader'
import 'leaflet/dist/leaflet.css'
import { exampleCollection } from '../assets/swedenGeoJson'
import type { FeatureCollection, GeoJsonProperties, Geometry, LineString, Position } from 'geojson'
import { parseGpx } from '@/services/gpx'

useHead({
  title: 'Yurii'
})

function findHoveredCoordIndex(coords: Position[], target: LatLng) {
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
  return closestIndex
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

const map = ref<L.Map>()
const routeLayer = ref<L.GeoJSON>()

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

function resetMap() {
  map.value?.setView([0, 0], 1)
  routeLayer.value?.remove()
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
    const hoveredIndex = findHoveredCoordIndex(coords, latlng)
    circleMarker.setLatLng(L.latLng(coords[hoveredIndex][1], coords[hoveredIndex][0]))
    if (!map.value) {
      return
    }
    map.value.addLayer(circleMarker)
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
    openPhotoPopup()
  })
}

async function updateGpxTrack(event: Event) {
  const track = (event.target as HTMLInputElement).files?.[0]
  if (!track) {
    return
  }
  try {
    const geoJson = parseGpx(await track.text())
    placeTrackOnMap(geoJson as FeatureCollection)
  } catch (error) {
    console.error(error)
    alert(error)
  }
}

interface RoutePhoto {
  base64: string
  latlng: L.LatLng
}

const routePhoto = ref<RoutePhoto>()

async function handlePhoto(event: Event) {
  const photo = (event.target as HTMLInputElement).files?.[0]
  if (!photo) {
    return
  }
  const tags = await ExifReader.load(photo)
  const lat = tags.GPSLatitude?.description
  const lng = tags.GPSLongitude?.description
  const date = tags.DateTimeOriginal?.description

  if (!lat || !lng || !routeLayer.value) {
    return
  }

  routePhoto.value = {
    base64: await getBase64(photo),
    latlng: L.latLng(Number(lat), Number(lng))
  }
  const index = findHoveredCoordIndex(
    (exampleCollection.features[0].geometry as LineString).coordinates,
    routePhoto.value.latlng
  )
  console.log(
    `Coordinates: ${lat}, ${lng}`,
    `Date: ${date}, ${date ? new Date(date) : ''}`,
    `Index: ${index}`
  )
  openPhotoPopup()
}

function openPhotoPopup() {
  if (!map.value || !routePhoto.value) {
    return
  }
  L.popup({ content: `<img class="route-image" src=${routePhoto.value.base64} />` })
    .setLatLng(routePhoto.value.latlng)
    .openOn(map.value)
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
