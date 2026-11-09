import { ClipboardList, QrCode } from 'lucide-react'

export type SurveyModuleTab = 'submissions' | 'sources'

const tabs: Array<{ icon: typeof QrCode; label: string; value: SurveyModuleTab }> = [
  { icon: ClipboardList, label: 'Lượt gửi khảo sát', value: 'submissions' },
  { icon: QrCode, label: 'Nguồn mời', value: 'sources' },
]

export function SurveyModuleTabs({ active, onChange }: { active: SurveyModuleTab; onChange: (tab: SurveyModuleTab) => void }) {
  return (
    <nav aria-label="Mục trong khảo sát" className="survey-module-tabs">
      {tabs.map(({ icon: Icon, label, value }) => (
        <button
          aria-current={active === value ? 'page' : undefined}
          className={`survey-module-tab${active === value ? ' is-active' : ''}`}
          key={value}
          onClick={() => onChange(value)}
          type="button"
        >
          <Icon aria-hidden="true" size={16} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
