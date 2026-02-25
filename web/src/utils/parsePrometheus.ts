/**
 * Parse Prometheus text format into structured metric data.
 * Handles: counter, gauge, histogram (bucket, sum, count).
 */

export interface ParsedMetric {
  name: string
  type: 'counter' | 'gauge' | 'histogram' | 'summary'
  labels: Record<string, string>
  value: number
  suffix?: string // _bucket, _sum, _count
}

export interface MetricSample {
  name: string
  labels: Record<string, string>
  value: number
}

const METRIC_LINE =
  /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+([\d.eE+-]+|NaN)$/

function parseLabels(labelStr: string): Record<string, string> {
  const labels: Record<string, string> = {}
  if (!labelStr?.trim()) return labels
  const pairs = labelStr.split(',')
  for (const p of pairs) {
    const m = p.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*"([^"]*)"\s*$/)
    if (m) labels[m[1]] = m[2]
  }
  return labels
}

export function parsePrometheusMetrics(raw: string): ParsedMetric[] {
  const result: ParsedMetric[] = []
  const lines = raw.split('\n')
  let currentType = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      if (trimmed.startsWith('# TYPE ')) {
        const parts = trimmed.split(/\s+/)
        if (parts[2]) currentType = parts[2]
      }
      continue
    }

    const match = trimmed.match(METRIC_LINE)
    if (!match) continue

    const [, name, labelStr, valueStr] = match
    const value = parseFloat(valueStr)
    if (isNaN(value) && valueStr !== 'NaN') continue

    let suffix: string | undefined
    let baseName = name ?? ''
    if (baseName.endsWith('_bucket')) {
      suffix = '_bucket'
      baseName = baseName.slice(0, -7)
    } else if (baseName.endsWith('_sum')) {
      suffix = '_sum'
      baseName = baseName.slice(0, -4)
    } else if (baseName.endsWith('_count')) {
      suffix = '_count'
      baseName = baseName.slice(0, -6)
    }

    let type = currentType as ParsedMetric['type']
    if (suffix && !['histogram', 'summary'].includes(type)) {
      type = 'histogram'
    }

    result.push({
      name: baseName,
      type: type as ParsedMetric['type'] || 'gauge',
      labels: parseLabels(labelStr ?? ''),
      value,
      suffix,
    })
  }

  return result
}

/** Get gauge/counter samples for a metric name */
export function getSamples(
  parsed: ParsedMetric[],
  metricName: string,
  excludeSuffix = true
): MetricSample[] {
  return parsed
    .filter(
      (m) =>
        m.name === metricName &&
        (!excludeSuffix || (!m.suffix || m.suffix === '_count'))
    )
    .map((m) => ({ name: m.name, labels: m.labels, value: m.value }))
}

/** Get histogram buckets for a metric (for charting distribution) */
export function getHistogramBuckets(
  parsed: ParsedMetric[],
  metricName: string,
  labelFilter?: Record<string, string>
): { le: number; count: number; provider?: string }[] {
  const buckets = parsed.filter(
    (m) =>
      m.name === metricName &&
      m.suffix === '_bucket' &&
      (!labelFilter ||
        Object.entries(labelFilter).every(([k, v]) => m.labels[k] === v))
  )
  const byLe = new Map<string, { le: number; count: number; provider?: string }>()
  for (const b of buckets) {
    const leStr = b.labels['le'] ?? 'Inf'
    const le = leStr === '+Inf' ? Infinity : parseFloat(leStr)
    const key = `${b.labels['provider'] ?? ''}:${le}`
    if (!byLe.has(key)) {
      byLe.set(key, {
        le: le === Infinity ? 10000 : le,
        count: b.value,
        provider: b.labels['provider'],
      })
    } else {
      const prev = byLe.get(key)!
      prev.count = b.value // Prometheus buckets are cumulative
    }
  }
  return Array.from(byLe.values()).sort((a, b) => a.le - b.le)
}

/** Get histogram mean (sum/count) for a metric by provider */
export function getHistogramMeans(
  parsed: ParsedMetric[],
  metricName: string
): { provider?: string; mean: number; count: number }[] {
  const sums = parsed.filter(
    (m) => m.name === metricName && m.suffix === '_sum'
  )
  const counts = parsed.filter(
    (m) => m.name === metricName && m.suffix === '_count'
  )
  const result: { provider?: string; mean: number; count: number }[] = []
  const seen = new Set<string>()
  for (const s of sums) {
    const key = s.labels['provider'] ?? ''
    if (seen.has(key)) continue
    seen.add(key)
    const c = counts.find(
      (x) => (x.labels['provider'] ?? '') === (s.labels['provider'] ?? '')
    )
    const count = c?.value ?? 0
    result.push({
      provider: s.labels['provider'] || undefined,
      mean: count > 0 ? s.value / count : 0,
      count,
    })
  }
  for (const c of counts) {
    const key = c.labels['provider'] ?? ''
    if (seen.has(key)) continue
    seen.add(key)
    result.push({
      provider: c.labels['provider'] || undefined,
      mean: 0,
      count: c.value,
    })
  }
  return result
}
