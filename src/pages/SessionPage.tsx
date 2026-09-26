import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useSessionStore, RelayAttempt, Session, TransmissionPoint } from '../store/sessionStore'
import { useTeacherStore } from '../store/teacherStore'
import { simulationFromAttempt, TrackMark } from '../lib/trackMath'
import { deleteVideoBlob } from '../lib/videoDb'
import TrackCanvas from '../components/TrackCanvas'
import SituationCard from '../components/SituationCard'
import AttemptPanel from '../components/AttemptPanel'
import './SessionPage.css'

const SessionPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const student = useAuthStore((state) => state.student)
  const sessions = useSessionStore((state) => state.sessions)
  const currentSession = useSessionStore((state) => state.currentSession)
  const hasHydrated = useSessionStore((state) => state.hasHydrated)
  const setCurrentSession = useSessionStore((state) => state.setCurrentSession)
  const createSession = useSessionStore((state) => state.createSession)
  const updateSession = useSessionStore((state) => state.updateSession)
  const classKey = student?.classKey
  const classTrackConfig = useTeacherStore((state) =>
    classKey
      ? state.classGroups.find((group) => group.classKey.toUpperCase() === classKey.toUpperCase())?.trackConfig
      : undefined
  )
  const teacherHydrated = useTeacherStore((state) => state.hasHydrated)
  const assignedSituationId = useTeacherStore((state) =>
    classKey ? state.getSituationForClass(classKey)?.id : undefined
  )
  const hasTrackConfig = useTeacherStore((state) => Boolean(classKey && state.getTrackConfigForClass(classKey)))
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationSpeed, setSimulationSpeed] = useState(1)
  const [draftPoint, setDraftPoint] = useState<TransmissionPoint | null>(null)
  const [zoneHint, setZoneHint] = useState('')
  const [simulatingId, setSimulatingId] = useState<string | null>(null)
  const [videoRequestId, setVideoRequestId] = useState<string | null>(null)

  const handleTransmissionPoint = useCallback((point: TransmissionPoint) => {
    setDraftPoint(point)
    setZoneHint('')
  }, [])

  const handleOutsideZone = useCallback(() => {
    setZoneHint('Le clic doit être dans une zone de transmission.')
  }, [])

  const handleMarkClick = useCallback((id: string) => {
    if (id === 'draft') return
    setVideoRequestId(id)
  }, [])

  const clearVideoRequest = useCallback(() => setVideoRequestId(null), [])
  const attempts = currentSession?.attempts ?? []
  const relaySimulation = useMemo(() => {
    if (!currentSession || !simulatingId) return null
    const attempt = (currentSession.attempts ?? []).find((item) => item.id === simulatingId)
    return attempt ? simulationFromAttempt(currentSession.trackConfig, attempt) : null
  }, [currentSession, simulatingId])

  useEffect(() => {
    if (!hasHydrated || !teacherHydrated || !sessionId) return

    const teacher = useTeacherStore.getState()
    const sessionState = useSessionStore.getState()
    const session = sessionState.sessions.find((item) => item.id === sessionId)

    if (!session && !sessionState.currentSession) {
      const trackConfig = classKey ? teacher.getTrackConfigForClass(classKey) : undefined
      if (!trackConfig) return
      const assignedSituation = classKey ? teacher.getSituationForClass(classKey) : undefined
      createSession(trackConfig, assignedSituation)
      return
    }

    if (!session) return

    if (sessionState.currentSession?.id !== session.id) {
      setCurrentSession(session)
    }

    if (classKey) {
      const assignedSituation = teacher.getSituationForClass(classKey)
      const updates: { situation?: Session['situation']; trackConfig?: Session['trackConfig'] } = {}
      if (assignedSituation && session.situation?.id !== assignedSituation.id) {
        updates.situation = assignedSituation
      }
      if (classTrackConfig && JSON.stringify(classTrackConfig) !== JSON.stringify(session.trackConfig)) {
        updates.trackConfig = classTrackConfig
      }
      if (updates.situation || updates.trackConfig) {
        updateSession(session.id, updates)
      }
    }
  }, [
    hasHydrated,
    teacherHydrated,
    sessionId,
    sessions,
    classKey,
    classTrackConfig,
    assignedSituationId,
    hasTrackConfig,
    createSession,
    setCurrentSession,
    updateSession,
  ])

  if (!hasHydrated || !teacherHydrated) {
    return (
      <div className="session-page">
        <div className="session-header">
          <h1>Séance d'entraînement</h1>
        </div>
        <div>Chargement…</div>
      </div>
    )
  }

  if (!currentSession) {
    const knownSession = sessions.find((item) => item.id === sessionId)
    const trackConfig = !knownSession && classKey ? useTeacherStore.getState().getTrackConfigForClass(classKey) : undefined
    if (!knownSession && !trackConfig) {
      return (
        <div className="session-page">
          <div className="session-header">
            <button onClick={() => navigate('/dashboard')} className="back-button">
              ← Retour
            </button>
            <h1>Séance d'entraînement</h1>
          </div>
          <div className="no-track-config-message">
            <div className="message-content">
              <h2>⚠️ Configuration de piste requise</h2>
              <p>Votre enseignant n'a pas encore configuré la piste d'athlétisme pour votre classe.</p>
              <p>Veuillez contacter votre enseignant pour qu'il configure la piste avant de commencer une séance.</p>
            </div>
          </div>
        </div>
      )
    }
    return <div>Chargement...</div>
  }

  const marks: TrackMark[] = [
    ...attempts.map((attempt) => ({
      id: attempt.id,
      point: attempt.transmissionPoint,
      label: 'T',
      hasVideo: Boolean(attempt.videoId),
    })),
    ...(draftPoint ? [{ id: 'draft', point: draftPoint, label: 'Ici', hasVideo: false }] : []),
  ]

  const handleSaveAttempt = (attempt: RelayAttempt) => {
    useSessionStore.getState().addAttempt(currentSession.id, attempt)
    setDraftPoint(null)
    setZoneHint('')
  }

  const handleDeleteAttempt = (attemptId: string) => {
    const attempt = attempts.find((item) => item.id === attemptId)
    if (attempt?.videoId) void deleteVideoBlob(attempt.videoId)
    useSessionStore.getState().deleteAttempt(currentSession.id, attemptId)
    if (simulatingId === attemptId) {
      setIsSimulating(false)
      setSimulatingId(null)
    }
  }

  return (
    <div className="session-page">
      <header className="session-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← Retour
        </button>
        <h1>Séance d'entraînement</h1>
        <div className="session-date">
          {new Date(currentSession.date).toLocaleDateString('fr-FR')}
        </div>
      </header>

      <div className="session-content">
        <div className="session-main">
          <div className="track-section">
            <TrackCanvas
              trackConfig={currentSession.trackConfig}
              runners={[]}
              marks={marks}
              restrictToZones
              onTransmissionPointClick={handleTransmissionPoint}
              onOutsideZone={handleOutsideZone}
              onMarkClick={handleMarkClick}
              isSimulating={isSimulating}
              simulationSpeed={simulationSpeed}
              relaySimulation={relaySimulation}
            />
          </div>
        </div>

        <div className="session-sidebar">
          <SituationCard situation={currentSession.situation} />
          <AttemptPanel
            classKey={classKey}
            trackConfig={currentSession.trackConfig}
            attempts={[...attempts].reverse()}
            draftPoint={draftPoint}
            zoneHint={zoneHint}
            videoRequestId={videoRequestId}
            onVideoRequestHandled={clearVideoRequest}
            onSave={handleSaveAttempt}
            onDelete={handleDeleteAttempt}
            onSimulate={(attempt) => {
              setSimulatingId(attempt.id)
              setIsSimulating(true)
            }}
            onStopSimulation={() => {
              setIsSimulating(false)
              setSimulatingId(null)
            }}
            simulatingId={simulatingId}
            simulationSpeed={simulationSpeed}
            onSpeedChange={setSimulationSpeed}
          />
        </div>
      </div>
    </div>
  )
}

export default SessionPage
