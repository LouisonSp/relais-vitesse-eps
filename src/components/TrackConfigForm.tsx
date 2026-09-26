import { useState } from 'react'
import { SpeedPlot, TrackConfig, SubZone } from '../store/sessionStore'
import { plotDistanceFromSpeed, trackLengthMeters, zoneFitsOnTrack } from '../lib/trackMath'
import { useTeacherStore } from '../store/teacherStore'
import TrackCanvas from './TrackCanvas'
import ConfirmModal from './ConfirmModal'
import './TrackConfigForm.css'

interface TrackConfigFormProps {
  classKey: string
  onSave: () => void
  onCancel: () => void
}

const TrackConfigForm = ({ classKey, onSave, onCancel }: TrackConfigFormProps) => {
  const { getTrackConfigForClass, setTrackConfigForClass } = useTeacherStore()
  const initialConfig = getTrackConfigForClass(classKey)

  const [straightLength, setStraightLength] = useState(initialConfig?.straightLength ?? 84.39)
  const [curveRadius, setCurveRadius] = useState(initialConfig?.curveRadius ?? 36.5)
  const [lanes, setLanes] = useState(initialConfig?.lanes ?? 8)
  const [trackWidth, setTrackWidth] = useState(initialConfig?.trackWidth ?? 1.22)
  const [trackType, setTrackType] = useState<'oval' | 'straight'>(initialConfig?.trackType ?? 'oval')

  const [transmissionZones, setTransmissionZones] = useState(
    initialConfig?.transmissionZones ?? [
      { start: 100, length: 20 },
      { start: 200, length: 20 },
      { start: 300, length: 20 },
    ]
  )
  const [speedPlots, setSpeedPlots] = useState<SpeedPlot[]>(initialConfig?.speedPlots ?? [])
  const [formError, setFormError] = useState('')

  // SubZone management state
  const [activeZoneIndex, setActiveZoneIndex] = useState<number | null>(null)

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    type: 'zone' | 'subzone' | null
    indices: { zoneIndex: number; subZoneIndex?: number } | null
  }>({
    isOpen: false,
    type: null,
    indices: null,
  })

  const totalDistance = trackLengthMeters({
    trackType,
    lanes,
    straightLength,
    curveRadius,
    trackWidth,
    transmissionZones,
    speedPlots,
  })

  const handleApplyPreset = (type: '400m' | '200m' | 'straight-60') => {
    if (type === '400m') {
      setTrackType('oval')
      setStraightLength(84.39)
      setCurveRadius(36.5)
      setLanes(8)
      setTransmissionZones([
        { start: 100, length: 20 },
        { start: 200, length: 20 },
        { start: 300, length: 20 },
      ])
    } else if (type === '200m') {
      setTrackType('oval')
      setStraightLength(35)
      setCurveRadius(19.09) // Pour arriver à ~200m
      setLanes(4)
      setTransmissionZones([
        { start: 50, length: 10 },
        { start: 100, length: 10 },
        { start: 150, length: 10 },
      ])
    } else if (type === 'straight-60') {
      setTrackType('straight')
      setStraightLength(60)
      setCurveRadius(0) // Irrelevant
      setLanes(6)
      setTransmissionZones([
        { start: 30, length: 20 },
      ])
    }
  }

  const handleAddZone = () => {
    setTransmissionZones([...transmissionZones, { start: 0, length: 20 }])
  }

  const handleUpdateZone = (index: number, field: 'start' | 'length' | 'lane', value: number | undefined) => {
    setTransmissionZones((current) =>
      current.map((zone, zoneIndex) => {
        if (zoneIndex !== index) return zone
        if (field === 'lane') return { ...zone, lane: value }
        if (value === undefined) return zone
        return { ...zone, [field]: value }
      })
    )
  }

  const confirmDelete = () => {
    if (!deleteModal.indices) return

    const { zoneIndex, subZoneIndex } = deleteModal.indices

    if (deleteModal.type === 'zone') {
      setTransmissionZones(transmissionZones.filter((_, i) => i !== zoneIndex))
    } else if (deleteModal.type === 'subzone' && typeof subZoneIndex === 'number') {
      const updated = [...transmissionZones]
      const zone = updated[zoneIndex]
      if (zone.subZones) {
        zone.subZones = zone.subZones.filter((_, i) => i !== subZoneIndex)
        setTransmissionZones(updated)
      }
    }
    setDeleteModal({ isOpen: false, type: null, indices: null })
  }

  const handleRemoveZoneClick = (index: number) => {
    setDeleteModal({
      isOpen: true,
      type: 'zone',
      indices: { zoneIndex: index },
    })
  }

  // --- SubZone Handlers ---
  const handleAddSubZone = (zoneIndex: number) => {
    const updated = [...transmissionZones]
    const zone = updated[zoneIndex]
    if (!zone.subZones) zone.subZones = []

    // Default new subzone: starts at 0, length 5m
    zone.subZones.push({
      startOffset: 0,
      length: 5,
      label: 'Zone',
      color: '#ff6b35'
    })
    setTransmissionZones(updated)
  }

  const handleUpdateSubZone = (zoneIndex: number, subZoneIndex: number, field: keyof SubZone, value: string | number) => {
    const updated = [...transmissionZones]
    const zone = updated[zoneIndex]
    if (zone.subZones) {
      zone.subZones[subZoneIndex] = { ...zone.subZones[subZoneIndex], [field]: value }
      setTransmissionZones(updated)
    }
  }

  const handleRemoveSubZoneClick = (zoneIndex: number, subZoneIndex: number) => {
    setDeleteModal({
      isOpen: true,
      type: 'subzone',
      indices: { zoneIndex, subZoneIndex },
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const invalidZone = transmissionZones.find((zone) => !zoneFitsOnTrack(
      { trackType, lanes, straightLength, curveRadius, trackWidth, transmissionZones },
      zone.start,
      zone.length
    ))
    if (invalidZone) {
      setFormError('Chaque zone doit commencer après le départ et finir avant l\'arrivée.')
      return
    }
    setFormError('')
    const config: TrackConfig = {
      lanes,
      straightLength,
      curveRadius,
      trackWidth,
      trackType,
      transmissionZones: transmissionZones.map((zone) => ({
        ...zone,
        start: Number(zone.start),
        length: Number(zone.length),
      })),
      speedPlots,
    }
    setTrackConfigForClass(classKey, config)
    onSave()
  }

  const addSpeedPlot = () => {
    const speedKmh = 20
    setSpeedPlots((current) => [
      ...current,
      {
        id: Date.now().toString(),
        label: `${speedKmh} km/h`,
        speedKmh,
        distance: plotDistanceFromSpeed(speedKmh),
      },
    ])
  }

  const addReferencePlots = () => {
    const speeds = [15, 18, 20, 22, 25, 28, 30]
    setSpeedPlots(
      speeds
        .map((speedKmh) => ({
          id: `plot-${speedKmh}`,
          label: `${speedKmh} km/h`,
          speedKmh,
          distance: plotDistanceFromSpeed(speedKmh),
        }))
        .filter((plot) => plot.distance <= totalDistance)
    )
  }

  // Configuration actuelle pour la prévisualisation
  const currentConfig: TrackConfig = {
    lanes,
    straightLength,
    curveRadius,
    trackWidth,
    trackType,
    transmissionZones,
    speedPlots,
  }

  return (
    <div className="track-config-form-container">
      <div className="form-header">
        <h3>Configuration de la piste</h3>
        <p className="form-subtitle">Prévisualisation en temps réel</p>
      </div>

      <div className="config-layout">
        <form onSubmit={handleSubmit} className="track-config-form">
          <h4>Configuration de la Piste</h4>

          <div className="form-group presets">
            <label>Préréglages :</label>
            <div className="preset-buttons">
              <button type="button" onClick={() => handleApplyPreset('400m')}>
                Std. 400m (Ovale)
              </button>
              <button type="button" onClick={() => handleApplyPreset('200m')}>
                Std. 200m (Ovale)
              </button>
              <button type="button" onClick={() => handleApplyPreset('straight-60')}>
                Scolaire 60m (Ligne Droite)
              </button>
            </div>
          </div>

          <div className="form-group track-type-toggle">
            <label>Type de piste :</label>
            <div className="type-toggle-buttons">
              <button
                type="button"
                className={trackType === 'oval' ? 'active' : ''}
                onClick={() => setTrackType('oval')}
              >
                Ovale
              </button>
              <button
                type="button"
                className={trackType === 'straight' ? 'active' : ''}
                onClick={() => setTrackType('straight')}
              >
                Ligne Droite
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{trackType === 'straight' ? 'Longueur totale (m)' : 'Longueur Ligne Droite (m)'}</label>
              <input
                type="number"
                id="straightLength"
                value={straightLength}
                onChange={(e) => setStraightLength(parseFloat(e.target.value) || 0)}
                step="0.01"
              />
            </div>

            {trackType === 'oval' && (
              <div className="form-group">
                <label>Rayon Virage (m)</label>
                <input
                  type="number"
                  id="curveRadius"
                  value={curveRadius}
                  onChange={(e) => setCurveRadius(parseFloat(e.target.value) || 0)}
                  step="0.01"
                />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Couloirs</label>
              <input
                type="number"
                id="lanes"
                value={lanes}
                onChange={(e) => setLanes(parseInt(e.target.value) || 1)}
                min="1"
                max="10"
              />
            </div>
            <div className="form-group">
              <label>Largeur Couloir (m)</label>
              <input
                type="number"
                id="trackWidth"
                value={trackWidth}
                onChange={(e) => setTrackWidth(parseFloat(e.target.value) || 1.22)}
                step="0.01"
              />
            </div>
          </div>

          <div className="form-section-title">
            Zones de transmission (Z1, Z2...)
            <button type="button" onClick={handleAddZone} className="add-zone-link">
              + Ajouter Zone
            </button>
          </div>

          <div className="zones-list">
            {transmissionZones.map((zone, index) => (
              <div key={index} className="zone-wrapper">
                <div className="zone-input-row compact">
                  <span className="zone-index">Z{index + 1}</span>
                  <div className="input-with-label">
                    <label>Début</label>
                    <input
                      type="number"
                      value={zone.start}
                      onChange={(e) => handleUpdateZone(index, 'start', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="input-with-label">
                    <label>Long.</label>
                    <input
                      type="number"
                      value={zone.length}
                      onChange={(e) => handleUpdateZone(index, 'length', parseFloat(e.target.value) || 20)}
                    />
                  </div>
                  <div className="input-with-label">
                    <label>Couloir</label>
                    <select
                      value={zone.lane || ''}
                      onChange={(e) => handleUpdateZone(index, 'lane', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="lane-select"
                    >
                      <option value="">Tous</option>
                      {Array.from({ length: lanes }).map((_, i) => (
                        <option key={i} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveZoneIndex(activeZoneIndex === index ? null : index)}
                    className={`subzone-toggle ${activeZoneIndex === index ? 'active' : ''}`}
                    title="Configurer sous-zones"
                  >
                    ⚙️
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveZoneClick(index)}
                    className="remove-zone-mini"
                    title="Supprimer la zone"
                  >
                    ✕
                  </button>
                </div>
                <p className={zoneFitsOnTrack(currentConfig, zone.start, zone.length) ? 'zone-meta' : 'zone-meta invalid'}>
                  Début à {zone.start} m du départ · fin à {(zone.start + zone.length).toFixed(1)} m · reste {(totalDistance - zone.start - zone.length).toFixed(1)} m jusqu'à l'arrivée
                </p>

                {/* Section Sous-zones */}
                {activeZoneIndex === index && (
                  <div className="subzones-container">
                    <div className="subzones-header">
                      <small>Sous-zones (ex: Élan, Transmission)</small>
                      <button type="button" onClick={() => handleAddSubZone(index)} className="add-subzone-btn">
                        + Sous-zone
                      </button>
                    </div>
                    {zone.subZones && zone.subZones.length > 0 ? (
                      zone.subZones.map((sz, szIndex) => (
                        <div key={szIndex} className="subzone-row">
                          <input
                            type="text"
                            placeholder="Label"
                            className="subzone-label"
                            value={sz.label || ''}
                            onChange={(e) => handleUpdateSubZone(index, szIndex, 'label', e.target.value)}
                          />
                          <input
                            type="number"
                            placeholder="Offset"
                            className="subzone-number"
                            title="Offset depuis début zone"
                            value={sz.startOffset}
                            onChange={(e) => handleUpdateSubZone(index, szIndex, 'startOffset', parseFloat(e.target.value) || 0)}
                          />
                          <input
                            type="number"
                            placeholder="Long."
                            className="subzone-number"
                            title="Longueur"
                            value={sz.length}
                            onChange={(e) => handleUpdateSubZone(index, szIndex, 'length', parseFloat(e.target.value) || 0)}
                          />
                          <input
                            type="color"
                            value={sz.color || '#ff6b35'}
                            onChange={(e) => handleUpdateSubZone(index, szIndex, 'color', e.target.value)}
                            className="subzone-color"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSubZoneClick(index, szIndex)}
                            className="remove-subzone-btn"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="no-subzones">Aucune sous-zone définie</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="form-section-title">
            Arrivées différées (12 s)
            <span className="plot-actions">
              <button type="button" onClick={addReferencePlots} className="add-zone-link">
                Plots standards
              </button>
              <button type="button" onClick={addSpeedPlot} className="add-zone-link">
                + Plot
              </button>
            </span>
          </div>
          <p className="form-subtitle">Distance du plot = vitesse × 12 s. L'élève choisit le plot atteint à chaque tentative.</p>
          {speedPlots.map((plot, index) => (
              <div key={plot.id} className="plot-row">
                <input
                  type="text"
                  value={plot.label}
                  onChange={(e) => {
                    const label = e.target.value
                    setSpeedPlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label } : item))
                  }}
                />
                <input
                  type="number"
                  min="1"
                  value={plot.speedKmh}
                  onChange={(e) => {
                    const speedKmh = parseFloat(e.target.value) || 0
                    setSpeedPlots((current) => current.map((item, itemIndex) => (
                      itemIndex === index
                        ? { ...item, speedKmh, distance: plotDistanceFromSpeed(speedKmh) }
                        : item
                    )))
                  }}
                />
                <span>{plot.distance.toFixed(1)} m</span>
                <button
                  type="button"
                  className="remove-zone-mini"
                  onClick={() => setSpeedPlots((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  ✕
                </button>
          </div>
        ))}

          {formError && <p className="form-error">{formError}</p>}

          <div className="form-actions">
            <button type="submit" className="save-button">
              Enregistrer
            </button>
            <button type="button" onClick={onCancel} className="cancel-button">
              Annuler
            </button>
          </div>
        </form>

        <div className="preview-panel">
          <div className="preview-canvas-wrapper">
            <TrackCanvas
              trackConfig={currentConfig}
              runners={[]}
              isSimulating={false}
            />
          </div>
          <div className="preview-info">
            Perimètre réel (axe du couloir 1) : <strong>{totalDistance} m</strong>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.type === 'zone' ? 'Supprimer la zone' : 'Supprimer la sous-zone'}
        message={
          deleteModal.type === 'zone'
            ? 'Êtes-vous sûr de vouloir supprimer cette zone de transmission ?'
            : 'Êtes-vous sûr de vouloir supprimer cette sous-zone ?'
        }
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, type: null, indices: null })}
      />
    </div>
  )
}

export default TrackConfigForm
