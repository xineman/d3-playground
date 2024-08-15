<template>
  <div id="map"></div>
</template>
<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { onMounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { exampleCollection } from '../assets/exampleGeoJson'
import { center } from '@turf/center'

useHead({
  title: 'Yurii'
})

onMounted(() => {
  const routeCenter = center(exampleCollection).geometry.coordinates.reverse() as [number, number]
  const map = L.map('map', { center: routeCenter, zoom: 1 })
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map)
  const routeLayer = L.geoJSON(exampleCollection).addTo(map)
  const routeBounds = routeLayer.getBounds()
  map.fitBounds(routeBounds)
})
</script>
<style scoped lang="scss">
#map {
  height: 480px;
}
</style>
