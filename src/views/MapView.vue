<template>
  <div id="map"></div>
</template>
<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { onMounted } from 'vue'
import L, { LatLng } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { exampleCollection } from '../assets/exampleGeoJson'

useHead({
  title: 'Yurii'
})

function findHoveredCoordIndex(coords: [number, number, number][], target: LatLng) {
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

onMounted(() => {
  const routeLayer = L.geoJSON(exampleCollection)
  const routeBounds = routeLayer.getBounds()
  const routeCenter = routeBounds.getCenter()
  const map = L.map('map', { center: routeCenter })
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map)
  routeLayer.addTo(map)
  const circleMarker = L.circleMarker([0, 0], {
    radius: 7,
    color: 'red',
    fillOpacity: 0.5,
    className: 'hover-indicator'
  })
  routeLayer.on('mousemove', ({ propagatedFrom, latlng }) => {
    const coords = propagatedFrom.feature.geometry.coordinates
    const hoveredIndex = findHoveredCoordIndex(coords, latlng)
    circleMarker.setLatLng(L.latLng(coords[hoveredIndex][1], coords[hoveredIndex][0]))
    map.addLayer(circleMarker)
  })
  routeLayer.on('mouseout', () => {
    map.removeLayer(circleMarker)
  })
  map.fitBounds(routeBounds)
})
</script>
<style scoped lang="scss">
#map {
  height: 480px;
}
:deep(.hover-indicator) {
  pointer-events: none !important;
}
</style>
