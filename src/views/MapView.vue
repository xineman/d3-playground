<template>
  <div id="map"></div>
</template>
<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { onMounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

useHead({
  title: 'Yurii'
})

onMounted(() => {
  const map = L.map('map').setView([51.505, -0.09], 13)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map)
})
</script>
<style scoped lang="scss">
#map {
  height: 380px;
}
</style>
