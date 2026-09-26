import { useEffect, useRef, useState } from 'react'
import { RelayAttempt, TrackConfig, TransmissionPoint } from '../store/sessionStore'
import { useTeacherStore } from '../store/teacherStore'
import { measureRelay, toKmh, trackLengthMeters } from '../lib/trackMath'
import { deleteVideoBlob, loadVideoBlob, saveVideoBlob } from '../lib/videoDb'
import VideoCapture from './VideoCapture'
import './AttemptPanel.css'

type Phase = 'idle' | 'donner' | 'both' | 'receiver' | 'done'

interface AttemptPanelProps {
  classKey?: string
  trackConfig: TrackConfig
  attempts: RelayAttempt[]
  draftPoint: TransmissionPoint | null
  zoneHint: string
  videoRequestId: string | null
  onVideoRequestHandled: () => void
  onSave: (attempt: RelayAttempt) => void
  onDelete: (attemptId: string) => void
  onSimulate: (attempt: RelayAttempt) => void
  onStopSimulation: () => void
  simulatingId: string | null
  simulationSpeed: number
  onSpeedChange: (speed: number) => void
}

const formatSeconds = (value: number) => `${value.toFixed(2)} s`
const formatMeters = (value: number) => `${value.toFixed(1)} m`
const formatSpeed = (metersPerSecond: number) => `${toKmh(metersPerSecond).toFixed(1)} km/h`

const AttemptPanel = ({
  classKey,
  trackConfig,
  attempts,
  draftPoint,
  zoneHint,
  videoRequestId,
  onVideoRequestHandled,
  onSave,
  onDelete,
  onSimulate,
  onStopSimulation,
  simulatingId,
  simulationSpeed,
  onSpeedChange,
}: AttemptPanelProps) => {
  const students = useTeacherStore((state) =>
    classKey ? (state.students ?? []).filter((student) => student.classKey.toUpperCase() === classKey.toUpperCase()) : []
  )
  const [donnerName, setDonnerName] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [clock, setClock] = useState({ donner: 0, receiver: 0 })
  const [plotId, setPlotId] = useState('')
  const [videoId, setVideoId] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const marks = useRef({ start: 0, receiver: 0, transmission: 0, finish: 0 })
  const attemptsRef = useRef(attempts)
  const onVideoRequestHandledRef = useRef(onVideoRequestHandled)
  const videoToken = useRef(0)
  attemptsRef.current = attempts
  onVideoRequestHandledRef.current = onVideoRequestHandled

  useEffect(() => {
    if (phase === 'idle' || phase === 'done') return
    let frame = 0
    const tick = () => {
      const now = performance.now()
      const donner =
        phase === 'donner' || phase === 'both' ? (now - marks.current.start) / 1000 : (marks.current.transmission - marks.current.start) / 1000
      const receiver =
        phase === 'both' || phase === 'receiver'
          ? (now - marks.current.receiver) / 1000
          : 0
      setClock({ donner, receiver })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase])

  useEffect(() => {
    if (!videoRequestId) return
    const token = videoToken.current + 1
    videoToken.current = token
    const attempt = attemptsRef.current.find((item) => item.id === videoRequestId)
    onVideoRequestHandledRef.current()
    if (!attempt?.videoId) return
    void loadVideoBlob(attempt.videoId).then((blob) => {
      if (!blob || videoToken.current !== token) return
      const url = URL.createObjectURL(blob)
      setPlaybackUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return url
      })
    })
  }, [videoRequestId])

  const reset = (options?: { keepVideo?: boolean }) => {
    setPhase('idle')
    setClock({ donner: 0, receiver: 0 })
    setPlotId('')
    if (!options?.keepVideo && videoId) void deleteVideoBlob(videoId)
    setVideoId(null)
    marks.current = { start: 0, receiver: 0, transmission: 0, finish: 0 }
  }

  const startDonner = () => {
    marks.current.start = performance.now()
    setPhase('donner')
  }

  const startReceiver = () => {
    marks.current.receiver = performance.now()
    setPhase('both')
  }

  const markTransmission = () => {
    marks.current.transmission = performance.now()
    setClock((current) => ({
      donner: (marks.current.transmission - marks.current.start) / 1000,
      receiver: current.receiver,
    }))
    setPhase('receiver')
  }

  const markArrival = () => {
    marks.current.finish = performance.now()
    setClock({
      donner: (marks.current.transmission - marks.current.start) / 1000,
      receiver: (marks.current.finish - marks.current.receiver) / 1000,
    })
    setPhase('done')
  }

  const selectedPlot = trackConfig.speedPlots?.find((plot) => plot.id === plotId)
  const exchangeTime =
    phase === 'receiver' || phase === 'done'
      ? Math.max(0, (marks.current.transmission - marks.current.receiver) / 1000)
      : 0
  const preview = draftPoint
    ? measureRelay(
        trackConfig,
        draftPoint,
        { donnerTime: clock.donner, receiverTime: clock.receiver, exchangeTime },
        selectedPlot
      )
    : null

  const canSave = phase === 'done' && donnerName.trim() && receiverName.trim() && draftPoint && preview

  const handleSave = () => {
    if (!canSave || !draftPoint || !preview) return
    const attempt: RelayAttempt = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      donnerName: donnerName.trim(),
      receiverName: receiverName.trim(),
      donnerTime: clock.donner,
      receiverTime: clock.receiver,
      exchangeTime,
      relayTime: preview.relayTime,
      transmissionPoint: draftPoint,
      donnerDistance: preview.donnerDistance,
      receiverDistance: preview.receiverDistance,
      arrivalDistance: preview.arrivalDistance,
      donnerSpeed: preview.donnerSpeed,
      receiverSpeed: preview.receiverSpeed,
      batonSpeed: preview.batonSpeed,
      speedPlotId: selectedPlot?.id,
      speedPlotLabel: selectedPlot?.label,
      reachedSpeedKmh: selectedPlot?.speedKmh,
      videoId: videoId ?? undefined,
    }
    onSave(attempt)
    reset({ keepVideo: true })
  }

  const handleCapture = async (blob: Blob) => {
    const id = `video-${Date.now()}`
    if (videoId) await deleteVideoBlob(videoId)
    await saveVideoBlob(id, blob)
    setVideoId(id)
    setShowCamera(false)
  }

  const openVideo = async (id: string) => {
    const blob = await loadVideoBlob(id)
    if (!blob) return
    if (playbackUrl) URL.revokeObjectURL(playbackUrl)
    setPlaybackUrl(URL.createObjectURL(blob))
  }

  const closeVideo = () => {
    if (playbackUrl) URL.revokeObjectURL(playbackUrl)
    setPlaybackUrl(null)
  }

  const finishLabel = selectedPlot
    ? `${selectedPlot.label} (${formatMeters(selectedPlot.distance)})`
    : `arrivée de la piste (${formatMeters(trackLengthMeters(trackConfig))})`

  return (
    <div className="attempt-panel">
      <h3>Tentative</h3>
      <p className="attempt-help">
        Départ du donneur, départ du receveur, transmission, puis arrivée. Le clic sur la piste doit être dans la zone de transmission.
      </p>

      <div className="name-row">
        <label>
          Donneur
          <input list="class-students" value={donnerName} onChange={(event) => setDonnerName(event.target.value)} placeholder="Nom" />
        </label>
        <label>
          Receveur
          <input list="class-students" value={receiverName} onChange={(event) => setReceiverName(event.target.value)} placeholder="Nom" />
        </label>
        <datalist id="class-students">
          {students.map((student) => (
            <option key={student.id} value={student.name} />
          ))}
        </datalist>
      </div>

      <div className="chrono-readout">
        <div>
          <span>Donneur</span>
          <strong>{formatSeconds(clock.donner)}</strong>
        </div>
        <div>
          <span>Receveur</span>
          <strong>{formatSeconds(clock.receiver)}</strong>
        </div>
      </div>

      <div className="chrono-buttons">
        <button type="button" onClick={startDonner} disabled={phase !== 'idle'}>Départ</button>
        <button type="button" onClick={startReceiver} disabled={phase !== 'donner'}>Départ receveur</button>
        <button type="button" onClick={markTransmission} disabled={phase !== 'both'}>Transmission</button>
        <button type="button" onClick={markArrival} disabled={phase !== 'receiver'}>Arrivée</button>
      </div>

      <p className={zoneHint ? 'zone-hint warning' : 'zone-hint'}>
        {zoneHint || (draftPoint
          ? `Transmission à ${formatMeters(draftPoint.distance)} du départ, couloir ${draftPoint.lane}.`
          : 'Après la transmission, cliquez dans la zone éclairée.')}
      </p>

      {(trackConfig.speedPlots?.length ?? 0) > 0 && (
        <label className="plot-select">
          Plot atteint en {12} s
          <select value={plotId} onChange={(event) => setPlotId(event.target.value)}>
            <option value="">Arrivée de la piste</option>
            {trackConfig.speedPlots?.map((plot) => (
              <option key={plot.id} value={plot.id}>
                {plot.label} — {plot.speedKmh} km/h — {formatMeters(plot.distance)}
              </option>
            ))}
          </select>
        </label>
      )}

      {preview && (
        <div className="attempt-preview">
          <p>Donneur : {formatMeters(preview.donnerDistance)} en {formatSeconds(clock.donner)} ({formatSpeed(preview.donnerSpeed)})</p>
          <p>Receveur : {formatMeters(preview.receiverDistance)} jusqu'à {finishLabel}, en {formatSeconds(clock.receiver)} ({formatSpeed(preview.receiverSpeed)})</p>
          {selectedPlot && draftPoint && draftPoint.distance > selectedPlot.distance && (
            <p className="zone-hint warning">Le plot choisi est avant le clic. La distance du receveur est nulle : placez la zone avant ce plot, ou choisissez un plot plus loin.</p>
          )}
          <p>Temps du témoin, départ → arrivée : {formatSeconds(preview.relayTime)} ({formatSpeed(preview.batonSpeed)})</p>
          <p>Échange : {formatSeconds(exchangeTime)}</p>
        </div>
      )}

      <div className="attempt-actions">
        <button type="button" onClick={() => setShowCamera(true)} disabled={!draftPoint}>
          {videoId ? 'Refilmer la transmission' : 'Filmer la transmission'}
        </button>
        <button type="button" onClick={handleSave} disabled={!canSave} className="save-attempt">
          Enregistrer la tentative
        </button>
        <button type="button" onClick={() => reset()}>Recommencer</button>
      </div>
      {videoId && <p className="video-ready">Vidéo prête, elle sera liée à ce clic.</p>}

      <div className="attempt-list">
        <h3>Tentatives ({attempts.length})</h3>
        {attempts.length === 0 && <p className="empty-attempts">Aucune tentative enregistrée.</p>}
        {attempts.map((attempt, index) => (
          <article key={attempt.id} className="attempt-card">
            <header>
              <strong>Tentative {attempts.length - index}</strong>
              <span>{attempt.donnerName} → {attempt.receiverName}</span>
            </header>
            <p>Donneur {formatSeconds(attempt.donnerTime)} · {formatMeters(attempt.donnerDistance)} · {formatSpeed(attempt.donnerSpeed)}</p>
            <p>Receveur {formatSeconds(attempt.receiverTime)} · {formatMeters(attempt.receiverDistance)} · {formatSpeed(attempt.receiverSpeed)}</p>
            <p>Témoin {formatSeconds(attempt.relayTime)} · échange {formatSeconds(attempt.exchangeTime)}</p>
            {attempt.speedPlotLabel && (
              <p>Plot {attempt.speedPlotLabel}{attempt.reachedSpeedKmh ? ` · ${attempt.reachedSpeedKmh} km/h` : ''}</p>
            )}
            <div className="attempt-card-actions">
              {simulatingId === attempt.id ? (
                <button type="button" onClick={onStopSimulation}>Arrêter</button>
              ) : (
                <button type="button" onClick={() => onSimulate(attempt)}>Reconstituer</button>
              )}
              {attempt.videoId && (
                <button type="button" onClick={() => void openVideo(attempt.videoId!)}>Revoir la vidéo</button>
              )}
              <button type="button" onClick={() => onDelete(attempt.id)}>Supprimer</button>
            </div>
            {simulatingId === attempt.id && (
              <div className="speed-row">
                {[0.5, 1, 2].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    className={simulationSpeed === speed ? 'active' : ''}
                    onClick={() => onSpeedChange(speed)}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {showCamera && (
        <VideoCapture
          type="transmission"
          onCapture={() => setShowCamera(false)}
          onCaptureBlob={(blob) => void handleCapture(blob)}
          onCancel={() => setShowCamera(false)}
        />
      )}

      {playbackUrl && (
        <div className="video-modal">
          <div className="video-modal-card">
            <video src={playbackUrl} controls autoPlay playsInline />
            <button type="button" onClick={closeVideo}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AttemptPanel
