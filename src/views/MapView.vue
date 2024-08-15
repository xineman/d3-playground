<template>
  <div id="map"></div>
</template>
<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { onMounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { exampleCollection } from '../assets/exampleGeoJson'

useHead({
  title: 'Yurii'
})

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
  map.fitBounds(routeBounds)
})
</script>
<style scoped lang="scss">
#map {
  height: 480px;
}
</style>
