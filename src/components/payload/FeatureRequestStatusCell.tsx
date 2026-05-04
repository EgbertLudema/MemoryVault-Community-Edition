import type { DefaultCellComponentProps } from 'payload'

const statusStyles = {
  implemented: {
    label: 'Implemented',
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
    color: '#047857',
  },
  open: {
    label: 'Open',
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    color: '#0369a1',
  },
  pending: {
    label: 'For review',
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    color: '#c2410c',
  },
  rejected: {
    label: 'Declined',
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
  },
  planned: {
    label: 'Planned',
    borderColor: '#e9d5ff',
    backgroundColor: '#faf5ff',
    color: '#7e22ce',
  },
} as const

export function FeatureRequestStatusCell({ cellData }: DefaultCellComponentProps) {
  const status = typeof cellData === 'string' ? cellData : 'pending'
  const style = statusStyles[status as keyof typeof statusStyles] ?? statusStyles.pending

  return (
    <span
      style={{
        alignItems: 'center',
        backgroundColor: style.backgroundColor,
        border: `1px solid ${style.borderColor}`,
        borderRadius: '999px',
        color: style.color,
        display: 'inline-flex',
        fontSize: '12px',
        fontWeight: 700,
        justifyContent: 'center',
        lineHeight: 1,
        minWidth: '96px',
        padding: '6px 10px',
      }}
    >
      {style.label}
    </span>
  )
}
