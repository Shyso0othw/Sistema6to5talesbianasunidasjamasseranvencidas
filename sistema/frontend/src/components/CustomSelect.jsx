import { ChevronDown } from 'lucide-react'

export default function CustomSelect({ options, value, onChange, placeholder, icon: Icon }) {
  return (
    <div className="sh-custom-select">
      {Icon && <Icon size={16} className="sh-custom-select-icon" />}
      <select value={value} onChange={onChange} className="sh-custom-select-input">
        <option value="">{placeholder || 'Seleccionar...'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="sh-custom-select-arrow" />
    </div>
  )
}
