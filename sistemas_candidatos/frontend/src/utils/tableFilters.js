const text = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function filterRows(data, definitions, values = {}, search = '') {
  return data.filter(row => {
    if (search && !Object.values(row).some(value => text(value).includes(text(search)))) return false
    return definitions.every(({key, type}) => {
      const selected = values[key]
      if (selected == null || selected === '' || (Array.isArray(selected) && !selected.length)) return true
      const value = row[key]
      if (type === 'dateRange') {
        const day = String(value ?? '').slice(0, 10)
        return (!selected.from || day >= selected.from) && (!selected.to || day <= selected.to)
      }
      if (type === 'range') return (selected.min === '' || selected.min == null || Number(value) >= Number(selected.min)) && (selected.max === '' || selected.max == null || Number(value) <= Number(selected.max))
      if (Array.isArray(selected)) return selected.some(item => text(item) === text(value))
      if (type === 'date') return String(value ?? '').slice(0, 10) === selected
      return text(value) === text(selected)
    })
  })
}
