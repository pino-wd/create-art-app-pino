<!-- 柱状图 -->
<script setup lang="ts">
import type { EChartsOption } from '@/plugins/echarts'
import type { BarChartProps, BarDataItem } from '@/types/component/chart'
import { useChartOps } from '@/hooks/core/useChart'
import { useChartComponent } from '@/hooks/core/useChartComponent'
import { graphic } from '@/plugins/echarts'
import { getCssVar } from '@/utils/ui'

defineOptions({ name: 'ArtBarChart' })

const props = withDefaults(defineProps<BarChartProps>(), {
  // 基础配置
  height: useChartOps().chartHeight,
  loading: false,
  isEmpty: false,
  colors: () => useChartOps().colors,
  borderRadius: 4,

  // 数据配置
  data: () => [0, 0, 0, 0, 0, 0, 0],
  xAxisData: () => [],
  barWidth: '40%',
  stack: false,

  // 轴线显示配置
  showAxisLabel: true,
  showAxisLine: true,
  showSplitLine: true,

  // 交互配置
  showTooltip: true,
  showLegend: false,
  legendPosition: 'bottom',
})

// 判断是否为多数据
const isMultipleData = computed(() => {
  return (
    Array.isArray(props.data)
    && props.data.length > 0
    && typeof props.data[0] === 'object'
    && 'name' in props.data[0]
  )
})

// 使用新的图表组件抽象（需先于 createSeriesItem 等使用其解构结果的函数声明，
// no-use-before-define 对 const 解构变量按源码顺序判定）
const {
  chartRef,
  getAxisLineStyle,
  getAxisLabelStyle,
  getAxisTickStyle,
  getSplitLineStyle,
  getAnimationConfig,
  getTooltipStyle,
  getLegendStyle,
  getGridWithLegend,
} = useChartComponent({
  props,
  checkEmpty: () => {
    // 检查单数据情况
    if (Array.isArray(props.data) && typeof props.data[0] === 'number') {
      const singleData = props.data as number[]
      return !singleData.length || singleData.every(val => val === 0)
    }

    // 检查多数据情况
    if (Array.isArray(props.data) && typeof props.data[0] === 'object') {
      const multiData = props.data as BarDataItem[]
      return (
        !multiData.length
        || multiData.every(item => !item.data?.length || item.data.every(val => val === 0))
      )
    }

    return true
  },
  watchSources: [() => props.data, () => props.xAxisData, () => props.colors],
  generateOptions: (): EChartsOption => {
    const options: EChartsOption = {
      grid: getGridWithLegend(props.showLegend && isMultipleData.value, props.legendPosition, {
        top: 15,
        right: 0,
        left: 0,
      }),
      tooltip: props.showTooltip ? getTooltipStyle() : undefined,
      xAxis: {
        type: 'category',
        data: props.xAxisData,
        axisTick: getAxisTickStyle(),
        axisLine: getAxisLineStyle(props.showAxisLine),
        axisLabel: getAxisLabelStyle(props.showAxisLabel),
      },
      yAxis: {
        type: 'value',
        axisLabel: getAxisLabelStyle(props.showAxisLabel),
        axisLine: getAxisLineStyle(props.showAxisLine),
        splitLine: getSplitLineStyle(props.showSplitLine),
      },
    }

    // 添加图例配置
    if (props.showLegend && isMultipleData.value) {
      options.legend = getLegendStyle(props.legendPosition)
    }

    // 生成系列数据
    if (isMultipleData.value) {
      const multiData = props.data as BarDataItem[]
      options.series = multiData.map((item, index) => {
        const computedColor = getColor(props.colors[index], index)

        return createSeriesItem({
          name: item.name,
          data: item.data,
          color: computedColor,
          barWidth: item.barWidth,
          stack: props.stack ? item.stack || 'total' : undefined,
        })
      })
    }
    else {
      // 单数据情况
      const singleData = props.data as number[]
      const computedColor = getColor()

      options.series = [
        createSeriesItem({
          data: singleData,
          color: computedColor,
        }),
      ]
    }

    return options
  },
})

// 获取颜色配置
function getColor(customColor?: string, index?: number) {
  if (customColor)
    return customColor

  if (index !== undefined) {
    return props.colors![index % props.colors!.length]
  }

  // 默认渐变色
  return new graphic.LinearGradient(0, 0, 0, 1, [
    {
      offset: 0,
      color: getCssVar('--el-color-primary-light-4'),
    },
    {
      offset: 1,
      color: getCssVar('--el-color-primary'),
    },
  ])
}

// 创建渐变色
function createGradientColor(color: string) {
  return new graphic.LinearGradient(0, 0, 0, 1, [
    {
      offset: 0,
      color,
    },
    {
      offset: 1,
      color,
    },
  ])
}

// 获取基础样式配置
function getBaseItemStyle(color: string | InstanceType<typeof graphic.LinearGradient> | undefined) {
  return {
    borderRadius: props.borderRadius,
    color: typeof color === 'string' ? createGradientColor(color) : color,
  }
}

// 创建系列配置
function createSeriesItem(config: {
  name?: string
  data: number[]
  color?: string | InstanceType<typeof graphic.LinearGradient>
  barWidth?: string | number
  stack?: string
}) {
  const animationConfig = getAnimationConfig()

  return {
    name: config.name,
    data: config.data,
    type: 'bar' as const,
    stack: config.stack,
    itemStyle: getBaseItemStyle(config.color),
    barWidth: config.barWidth || props.barWidth,
    ...animationConfig,
  }
}

// chartRef 仅通过模板字符串 ref（ref="chartRef"）由运行时绑定，
// 脚本内不直接读取；显式 void 读取避免 noUnusedLocals 误报
void chartRef
</script>

<template>
  <div ref="chartRef" v-loading="props.loading" :style="{ height: props.height }" />
</template>
