import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react'
import '../estudiante/EstudianteModule.css'

export default function MateriaActividad({ materia, onBack }) {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Simular carga de datos
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= materia.porcentaje) {
          setLoading(false)
          clearInterval(timer)
          return materia.porcentaje
        }
        return prev + 1
      })
    }, 20)

    return () => clearInterval(timer)
  }, [materia])

  const getStatusLabel = () => {
    if (materia.porcentaje >= 80) return 'Excelente'
    if (materia.porcentaje >= 70) return 'Cuidado'
    return 'Riesgo'
  }

  const getStatusColor = () => {
    if (materia.porcentaje >= 80) return 'rgba(5, 150, 105, 0.2)'
    if (materia.porcentaje >= 70) return 'rgba(217, 119, 6, 0.2)'
    return 'rgba(220, 38, 38, 0.2)'
  }

  const getProgressColor = () => {
    if (materia.porcentaje >= 80) return '#059669'
    if (materia.porcentaje >= 70) return '#d97706'
    return '#dc2626'
  }

  const stats = [
    { label: 'Clases totales', value: materia.total, isNegative: false },
    { label: 'Clases dictadas', value: materia.presentes, isNegative: false },
    { label: 'Faltas', value: materia.ausentes, isNegative: materia.ausentes > 3 },
    { label: 'Suspendidas', value: 1, isNegative: false }
  ]

  return (
    <div className="sh-page">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '2px solid #e5e7eb',
            background: 'white',
            cursor: 'pointer',
            fontWeight: '600',
            color: '#4b5563'
          }}
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          Volver
        </button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        {/* Título de la materia */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: '800',
          color: '#1e3a8a',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: materia.color
          }} />
          {materia.materia}
        </h2>

        {/* Circular Progress */}
        <div style={{
          position: 'relative',
          width: '180px',
          height: '180px'
        }}>
          <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <circle
              cx="90"
              cy="90"
              r="70"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="12"
            />
            {/* Progress circle */}
            <circle
              cx="90"
              cy="90"
              r="70"
              fill="none"
              stroke={getProgressColor()}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 70}`}
              strokeDashoffset={`${2 * Math.PI * 70 * (1 - progress / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: '32px',
              fontWeight: '800',
              color: getProgressColor()
            }}>
              {loading ? `${progress}%` : `${materia.porcentaje}%`}
            </span>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {materia.presentes} / {materia.total} clases
            </span>
          </div>
        </div>

        {/* Status label */}
        <span style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '12px',
          fontWeight: '600',
          fontSize: '14px',
          background: getStatusColor(),
          color: '#1e3a8a'
        }}>
          {getStatusLabel()}
        </span>

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          width: '100%',
          maxWidth: '500px'
        }}>
          {stats.map((stat, index) => (
            <div key={index} style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              border: `2px solid ${stat.isNegative ? 'rgba(220, 38, 38, 0.2)' : '#e5e7eb'}`
            }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                {stat.label}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '24px', fontWeight: '800', color: stat.isNegative ? '#dc2626' : '#1e3a8a' }}>
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
