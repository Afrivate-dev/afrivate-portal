import { Download } from 'lucide-react'
import type { HrMetrics } from '@/context/HrContext'
import { Button } from '@/components/ui/Button'

function formatMetric(value: number | null | undefined, suffix = ''): string {
  if (value == null) return '—'
  return `${value}${suffix}`
}

export function HrKpiExport({ metrics }: { metrics: HrMetrics }) {
  const downloadCsv = () => {
    const rows: [string, string][] = [
      ['Metric', 'Value'],
      ['Headcount', String(metrics.headcount)],
      ['Engagement score', formatMetric(metrics.engagementScore)],
      ['eNPS', formatMetric(metrics.enpsScore)],
      ['L&D completion rate', formatMetric(metrics.ldCompletionRate, '%')],
      ['1:1 rate', formatMetric(metrics.oneOnOneRate, '%')],
      ['Pending leave', String(metrics.pendingLeave)],
      ['Open grievances', String(metrics.openGrievances)],
      ['Pending learning reviews', String(metrics.pendingLearningReviews)],
      ['Active surveys', String(metrics.activeSurveys)],
      ['Attrition rate (12 mo)', formatMetric(metrics.attritionRate, '%')],
      ['Avg time-to-hire (days)', formatMetric(metrics.avgTimeToHireDays)],
      ['Policy ack rate', formatMetric(metrics.policyAckRate, '%')],
      ['Survey completion rate', formatMetric(metrics.surveyCompletionRate, '%')],
    ]
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hr-kpis-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button size="sm" variant="secondary" onClick={downloadCsv}>
      <Download className="h-4 w-4" /> Export KPIs (CSV)
    </Button>
  )
}
