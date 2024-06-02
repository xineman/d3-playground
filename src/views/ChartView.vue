<template>
  <div class="chart">
    <button @click="addElement">Add element</button>
    <svg :width="WIDTH" :height="HEIGHT">
      <g v-if="piePaths" transform="translate(200, 200)" ref="pieChart">
        <path
          v-for="(arc, index) in piePaths"
          :d="arc.path"
          :key="arc.currency"
          :fill="colorScale(index)"
          @click="incrementElement(index)"
        />
      </g>
    </svg>
  </div>
</template>
<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { onMounted, ref, nextTick } from 'vue'
import * as d3 from 'd3'

useHead({
  title: 'Chart'
})

const WIDTH = 500
const HEIGHT = 400

const pieChart = ref<SVGGElement | null>(null)
const piePaths = ref<PiePiece[] | null>(null)
const arcs = ref<d3.PieArcDatum<Currency>[] | null>(null)

interface Currency {
  currency: number
  value: number
}

function getRandom() {
  return 1000 + Math.round(Math.random() * 1000)
}

const pieGenerator = d3
  .pie<Currency>()
  .value((p) => p.value)
  .sortValues(null)
const pathGenerator = d3.arc().innerRadius(70).outerRadius(150)

const colorScale = d3.scaleSequential([7, 0], d3.interpolateCividis)

interface PiePiece {
  path: any
  currency: number
}

let id = 0

const pieData = ref<Currency[]>([
  { currency: id++, value: 600 },
  { currency: id++, value: 2000 },
  { currency: id++, value: 2600 },
  { currency: id++, value: 450 }
])

onMounted(() => {
  arcs.value = pieGenerator(pieData.value)
  piePaths.value = arcs.value.map((a) => ({
    path: pathGenerator(a),
    currency: a.data.currency
  }))
})

const animationCount: number[] = Array(50).fill(0)

function incrementElement(index: number) {
  if (!animationCount[index]++) {
    pieData.value[index].value *= 2
    animateArcs(index)
  }
}

async function addElement() {
  pieData.value.push({ currency: id++, value: getRandom() })
  const tempPieData = [...pieData.value]
  tempPieData[tempPieData.length - 1] = { ...tempPieData[tempPieData.length - 1], value: 0 }
  arcs.value = pieGenerator(tempPieData)
  piePaths.value = arcs.value.map((a) => ({
    path: pathGenerator(a),
    currency: a.data.currency
  }))
  await nextTick()
  animateArcs()
}

function animateArcs(index?: number) {
  const newArcs = pieGenerator(pieData.value)
  d3.select(pieChart.value)
    .selectAll('path')
    .attr('fill', (d, index) => colorScale(index))
    .transition()
    .ease(d3.easeLinear)
    .duration(500 / (index ? animationCount[index] : 1))
    .attrTween('d', getTweenFactory(newArcs))
    .end()
    .then(() => {
      arcs.value = newArcs
      if (typeof index === 'number' && --animationCount[index]) {
        pieData.value[index].value *= 2
        animateArcs(index)
      }
    })
    .catch(() => {
      if (typeof index === 'number') {
        animationCount[index] = 0
      }
    })
}

function getTweenFactory(newArcs: d3.PieArcDatum<Currency>[]) {
  return function arcTween<Currency>(c: Currency, index: number) {
    const i = d3.interpolate(arcs.value![index], newArcs[index])
    return (t: number) => pathGenerator(i(t))
  }
}
</script>
<style scoped lang="scss">
.chart > * {
  display: block;
}
</style>
