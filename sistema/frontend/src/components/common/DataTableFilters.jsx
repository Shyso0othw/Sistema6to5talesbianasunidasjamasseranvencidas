import { filterRows } from '../../utils/tableFilters'
import { useState } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import '../../shared.css';

export function DataTableFilters({
  data = [],
  filters = [],
  onFilterChange,
  className = ''
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [openMenus, setOpenMenus] = useState({});
  const notify = (values, search) => onFilterChange?.({...values, search}, filterRows(data, filters, values, search));
  const changeSearch = value => { setSearchTerm(value); notify(activeFilters, value); };

  const handleFilterChange = (key, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value
    }));
    notify({ ...activeFilters, [key]: value }, searchTerm);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActiveFilters({});
    notify({}, '');
  };

  const hasActiveFilters = searchTerm || Object.values(activeFilters).some(v => v && (Array.isArray(v) ? v.length > 0 : true));

  return (
    <div className={`sh-filters-container ${className}`}>
      <div className="sh-filters-grid">
        <div className="sh-filter-group" style={{ gridColumn: '1 / -1' }}>
          <label className="sh-filter-label">Buscar</label>
          <div className="sh-input-group">
            <Search size={18} className="sh-input-icon" />
            <input
              className="sh-input sh-input-with-icon"
              placeholder="Buscar en todos los campos..."
              value={searchTerm}
              onChange={e => changeSearch(e.target.value)}
            />
            {searchTerm && (
              <button type="button" className="sh-input-clear" onClick={() => changeSearch('')} aria-label="Limpiar búsqueda">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {showAdvanced && filters.map((filter) => (
          <div key={filter.key} className="sh-filter-group">
            <label className="sh-filter-label">{filter.label}</label>
            {filter.type === 'select' && (
              <select
                className="sh-select"
                value={activeFilters[filter.key] || ''}
                onChange={e => handleFilterChange(filter.key, e.target.value)}
              >
                <option value="">Todos</option>
                {filter.options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            {filter.type === 'multiSelect' && (
              <div className="sh-multi-select">
                <button
                  type="button"
                  className="sh-custom-select-input"
                  onClick={() => setOpenMenus(prev => ({ ...prev, [filter.key]: !prev[filter.key] }))}
                >
                  {activeFilters[filter.key] && activeFilters[filter.key].length > 0
                    ? `${activeFilters[filter.key].length} seleccionados`
                    : filter.placeholder || 'Seleccionar...'}
                  <ChevronDown className="sh-custom-select-arrow" style={{ transform: openMenus[filter.key] ? 'rotate(180deg)' : 'none' }} />
                </button>
                {openMenus[filter.key] && (
                  <div className="sh-multi-select-dropdown">
                    {filter.options.map(opt => (
                      <label key={opt.value} className="sh-multi-select-option">
                        <input
                          type="checkbox"
                          checked={activeFilters[filter.key]?.includes(opt.value) || false}
                          onChange={e => {
                            const current = activeFilters[filter.key] || [];
                            if (e.target.checked) {
                              handleFilterChange(filter.key, [...current, opt.value]);
                            } else {
                              handleFilterChange(filter.key, current.filter(v => v !== opt.value));
                            }
                          }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            {filter.type === 'date' && <input aria-label={filter.label} type="date" className="sh-input" value={activeFilters[filter.key] || ''} onChange={e => handleFilterChange(filter.key, e.target.value)} />}
            {filter.type === 'range' && <div style={{display:'flex',gap:8}}>{['min','max'].map(bound => <input key={bound} aria-label={`${filter.label} ${bound}`} type="number" className="sh-input" value={activeFilters[filter.key]?.[bound] ?? ''} onChange={e => handleFilterChange(filter.key, {...activeFilters[filter.key], [bound]:e.target.value})} />)}</div>}
            {filter.type === 'dateRange' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="date"
                  className="sh-input"
                  value={activeFilters[filter.key]?.from || ''}
                  onChange={e => handleFilterChange(filter.key, { ...activeFilters[filter.key], from: e.target.value })}
                  placeholder="Desde"
                />
                <input
                  type="date"
                  className="sh-input"
                  value={activeFilters[filter.key]?.to || ''}
                  onChange={e => handleFilterChange(filter.key, { ...activeFilters[filter.key], to: e.target.value })}
                  placeholder="Hasta"
                />
              </div>
            )}
          </div>
        ))}

      </div>

      <div className="sh-filters-actions">
        {hasActiveFilters && (
          <button type="button" className="sh-btn-secondary" onClick={clearFilters}>
            <X size={14} /> Limpiar filtros
          </button>
        )}
        <button
          type="button"
          className="sh-btn-ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter size={14} /> {showAdvanced ? 'Ocultar' : 'Mostrar'} filtros avanzados
        </button>
      </div>
    </div>
  );
}

export default DataTableFilters;
