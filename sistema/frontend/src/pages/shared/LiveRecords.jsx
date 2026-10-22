import { useEffect, useState } from 'react'
import { apiFetch } from '../../api/http'

export default function LiveRecords({ title, endpoint, columns, selectRows }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    let active = true
    apiFetch(endpoint).then(async response => {
      if (!response.ok) throw new Error(`No se pudo cargar ${title.toLowerCase()}.`)
      const data = await response.json()
      if (active) setResult(selectRows ? selectRows(data) : data)
    }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [endpoint, selectRows, title])
  const rows = (result || []).filter(row => columns.some(c => String(row[c.key] ?? '').toLocaleLowerCase().includes(search.toLocaleLowerCase())))
  return <section className="sh-page"><h2>{title}</h2>
    <input className="sh-input" aria-label={`Buscar en ${title}`} placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} />
    {error && <p role="alert">{error}</p>}
    {!result && !error && <p>Cargando registros…</p>}
    {result && <><p>{rows.length} registros</p><div style={{ overflowX: 'auto' }}><table className="sh-table"><thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={row.id ?? i}>{columns.map(c => <td key={c.key}>{String(row[c.key] ?? '—')}</td>)}</tr>)}</tbody></table></div>
      {!rows.length && <p>No hay registros que coincidan.</p>}</>}
  </section>
}
