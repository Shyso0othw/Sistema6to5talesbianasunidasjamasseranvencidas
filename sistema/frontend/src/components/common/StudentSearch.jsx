import { useState } from 'react';
import { Search, X, Users, Filter, Info } from 'lucide-react';

const StudentSearch = ({ title, icon: Icon }) => {
  const [filters, setFilters] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    curso: '',
    division: ''
  });
  const [hasSearched, setHasSearched] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    if (name === 'curso') {
      newFilters.division = '';
    }
    setFilters(newFilters);
  };

  const handleSearch = () => {
    setHasSearched(true);
  };

  const handleClear = () => {
    setFilters({ nombre: '', apellido: '', dni: '', curso: '', division: '' });
    setHasSearched(false);
  };

  const getDivisionOptions = () => {
    if (!filters.curso) {
      return [];
    }
    const cursoNum = parseInt(filters.curso);
    if (cursoNum >= 4) {
      return ['1', '2', '3', '4', '5', '6'];
    }
    return ['A', 'B', 'C', 'D'];
  };

  const isSearchable = title.toLowerCase().includes("estudiantes") ||
                        title.toLowerCase().includes("alumnos") ||
                        title.toLowerCase().includes("cursos") ||
                        title.toLowerCase().includes("docentes") ||
                        title.toLowerCase().includes("preceptores") ||
                        title.toLowerCase().includes("personal") ||
                        title.toLowerCase().includes("familia") ||
                        title.toLowerCase().includes("lectores") ||
                        title.toLowerCase().includes("biblioteca");

  if (!isSearchable) {
    return (
      <div className="sh-card" style={{ padding: "40px", textAlign: "center" }}>
        <h2 className="sh-card-title" style={{ justifyContent: "center", fontSize: "24px" }}>
          {Icon && <Icon size={24} />} {title}
        </h2>
        <p style={{ color: "var(--text-muted)", marginTop: "10px" }}>Esta sección está en desarrollo.</p>
      </div>
    );
  }

  const divisionOptions = getDivisionOptions();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="sh-filters-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          {Icon ? <Icon size={20} style={{ color: 'var(--accent-blue)' }} /> : <Users size={20} style={{ color: 'var(--accent-blue)' }} />}
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy)' }}>{title}</h3>
        </div>
        
        <div className="sh-filters-grid">
          {/* Búsqueda por Nombre */}
          <div className="sh-filter-group">
            <label className="sh-filter-label">Nombre</label>
            <div className="sh-input-group">
              <Search size={18} className="sh-input-icon" />
              <input
                type="text"
                name="nombre"
                value={filters.nombre}
                onChange={handleChange}
                placeholder="Ingrese el nombre..."
                className="sh-input sh-input-with-icon"
              />
            </div>
          </div>

          {/* Búsqueda por Apellido */}
          <div className="sh-filter-group">
            <label className="sh-filter-label">Apellido</label>
            <div className="sh-input-group">
              <Search size={18} className="sh-input-icon" />
              <input
                type="text"
                name="apellido"
                value={filters.apellido}
                onChange={handleChange}
                placeholder="Ingrese el apellido..."
                className="sh-input sh-input-with-icon"
              />
            </div>
          </div>

          {/* Búsqueda por DNI */}
          <div className="sh-filter-group">
            <label className="sh-filter-label">DNI</label>
            <div className="sh-input-group">
              <Search size={18} className="sh-input-icon" />
              <input
                type="text"
                name="dni"
                value={filters.dni}
                onChange={handleChange}
                placeholder="Ingrese el DNI..."
                className="sh-input sh-input-with-icon"
              />
            </div>
          </div>

          {/* Filtro: Curso */}
          <div className="sh-filter-group">
            <label className="sh-filter-label">Curso</label>
            <select name="curso" value={filters.curso} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              <option value="1">1° Año</option>
              <option value="2">2° Año</option>
              <option value="3">3° Año</option>
              <option value="4">4° Año</option>
              <option value="5">5° Año</option>
              <option value="6">6° Año</option>
              <option value="7">7° Año</option>
            </select>
          </div>

          {/* Filtro: División */}
          <div className="sh-filter-group">
            <label className="sh-filter-label">División</label>
            <select name="division" value={filters.division} onChange={handleChange} className="sh-select" disabled={!filters.curso}>
              <option value="">Todas</option>
              {divisionOptions.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="sh-filters-actions">
          <button className="sh-btn-ghost" onClick={handleClear}>
            <X size={16} /> Limpiar filtros
          </button>
          <button className="sh-btn-primary" onClick={handleSearch}>
            <Search size={16} /> Buscar
          </button>
        </div>
      </div>

      {/* Área de Resultados (Estado inicial) */}
      {!hasSearched ? (
        <div className="sh-card" style={{ padding: '60px 20px', textAlign: 'center', borderStyle: 'dashed', background: 'transparent' }}>
          <div style={{ background: 'var(--gray-100)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--text-muted)' }}>
            <Filter size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--navy)', marginBottom: '8px' }}>Ingresá los filtros de búsqueda</h3>
          <p style={{ color: 'var(--text-soft)', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
            Utilizá los campos superiores para filtrar la información y luego presioná el botón "Buscar".
          </p>
        </div>
      ) : (
        <div className="sh-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ background: '#ecfdf5', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#059669' }}>
            <Info size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--navy)', marginBottom: '8px' }}>No se encontraron resultados</h3>
          <p style={{ color: 'var(--text-soft)', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
            No hay registros que coincidan con los filtros aplicados. Intentá con otros criterios.
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentSearch;
