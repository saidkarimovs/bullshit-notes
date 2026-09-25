# Component exports

Implemented exports and their props in this frontend slice:

| Import | Export | Props |
| --- | --- | --- |
| @/components/ui/button | Button | ButtonProps: native button props; variant primary, secondary, ghost, danger; size sm or md |
| @/components/ui/input | Input | Native input props; forwards HTMLInputElement ref |
| @/components/ui/textarea | Textarea | Native textarea props |
| @/components/ui/select | Select | Native select props |
| @/components/ui/badge | Badge | Native span props |
| @/components/ui/skeleton | Skeleton | Native div props |
| @/components/ui/separator | Separator | Native hr props |
| @/components/shared/severity-badge | SeverityBadge | severity: Severity; score?: number; size?: sm or md |
| @/components/shared/status-chip | StatusChip | status: ReportStatus |
| @/components/shared/page-header | PageHeader | title: string; description?: string; actions?: ReactNode |
| @/components/shared/empty-state | EmptyState | icon: Lucide component; title: string; description?: string; action?: ReactNode |
| @/components/shared/copy-button | CopyButton | value: string; label?: string |
| @/components/shared/relative-time | RelativeTime | date: string or Date |
| @/components/shared/data-table | DataTable | columns: Column<T>[]; data: T[]; isLoading?: boolean; onRowClick?: function; sort?: TableSort; onSortChange?: function; pagination?: TablePagination; emptyTitle?: string |
| @/components/editor/markdown-editor | MarkdownEditor | value: string; onChange: function; onSave?: function; noteId?: string; placeholder?: string; extensions?: CodeMirror Extension[] |
| @/components/editor/markdown-preview | MarkdownPreview | source: string; onLinkClick?: function |
| @/components/editor/split-pane | SplitPane | value: string; onChange: function; onSave?: function; noteId?: string |
| @/components/charts/severity-donut | SeverityDonut | data: SeverityCount[] |
| @/components/charts/findings-area | FindingsArea | data: FindingsPoint[]; bucket?: string |
| @/components/charts/status-funnel | StatusFunnel | data: FunnelPoint[] |
| @/components/charts/earnings-line | EarningsLine | data: EarningsPoint[] |
| @/components/charts/activity-heatmap | ActivityHeatmap | data: HeatmapPoint[] |

The specification calls for additional Radix primitives and shared components such as FilterBar, Dialog, TagInput, and ConfirmDialog. They are not implemented in this slice. Do not treat this list as the final component contract.
