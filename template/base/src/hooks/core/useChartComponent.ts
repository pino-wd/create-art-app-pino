/**
 * useChartComponent - 高级图表组件抽象
 *
 * 在 useChart 之上封装的组件级图表 Hook：接管 props 空数据判定、
 * 数据监听、主题联动与可见性事件，图表组件只需提供配置生成函数。
 *
 * 从 useChart.ts 拆出（单文件 650 行熔断）：
 * - UseChartComponentOptions 配置接口；
 * - useChartComponent 组件抽象实现。
 *
 * 使用示例见 useChart.ts 模块文档。
 *
 * @module useChartComponent
 * @author Art Design Pro Team
 */
import type { EChartsOption } from '@/plugins/echarts'
import type { BaseChartProps, UseChartOptions } from '@/types/component/chart'
import { useChart } from './useChart'

// 高级图表组件抽象
interface UseChartComponentOptions<T extends BaseChartProps> {
  /** Props响应式对象 */
  props: T
  /** 图表配置生成函数 */
  generateOptions: () => EChartsOption
  /** 空数据检查函数 */
  checkEmpty?: () => boolean
  /** 自定义监听的响应式数据 */
  watchSources?: (() => any)[]
  /** 自定义可视事件处理 */
  onVisible?: () => void
  /** useChart选项 */
  chartOptions?: UseChartOptions
}

export function useChartComponent<T extends BaseChartProps>(options: UseChartComponentOptions<T>) {
  const {
    props,
    generateOptions,
    checkEmpty,
    watchSources = [],
    onVisible,
    chartOptions = {},
  } = options

  const chart = useChart(chartOptions)
  const { chartRef, initChart, isDark, emptyStateManager } = chart

  // 检查是否为空数据
  const isEmpty = computed(() => {
    if (props.isEmpty)
      return true
    if (checkEmpty)
      return checkEmpty()
    return false
  })

  // 更新图表
  const updateChart = () => {
    nextTick(() => {
      if (isEmpty.value) {
        // 处理空数据情况 - 显示自定义空状态div
        if (chart.getChartInstance()) {
          chart.getChartInstance()?.clear()
        }
        emptyStateManager.create()
      }
      else {
        // 有数据时移除空状态div并初始化图表
        emptyStateManager.remove()
        initChart(generateOptions())
      }
    })
  }

  // 处理图表进入可视区域时的逻辑
  const handleChartVisible = () => {
    if (onVisible) {
      onVisible()
    }
    else {
      updateChart()
    }
  }

  // 存储监听器停止函数
  const stopHandles: (() => void)[] = []

  // 设置数据监听
  const setupWatchers = () => {
    // 监听自定义数据源
    if (watchSources.length > 0) {
      const stopHandle = watch(watchSources, updateChart, { deep: true })
      stopHandles.push(stopHandle)
    }

    // 监听主题变化
    const themeStopHandle = watch(isDark, () => {
      emptyStateManager.updateStyle()
      updateChart()
    })
    stopHandles.push(themeStopHandle)
  }

  // 清理所有监听器
  const cleanupWatchers = () => {
    stopHandles.forEach(stop => stop())
    stopHandles.length = 0
  }

  // 设置生命周期
  const setupLifecycle = () => {
    onMounted(() => {
      updateChart()

      // 监听图表可见事件
      if (chartRef.value) {
        chartRef.value.addEventListener('chartVisible', handleChartVisible)
      }
    })

    onBeforeUnmount(() => {
      // 清理事件监听器
      if (chartRef.value) {
        chartRef.value.removeEventListener('chartVisible', handleChartVisible)
      }
      // 清理所有监听器
      cleanupWatchers()
      // 清理空状态div
      emptyStateManager.remove()
    })
  }

  // 初始化
  setupWatchers()
  setupLifecycle()

  return {
    ...chart,
    isEmpty,
    updateChart,
    handleChartVisible,
  }
}
