import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useSessionStore } from '../store/sessionStore'
import { useTeacherStore } from '../store/teacherStore'
import './DashboardPage.css'

const DashboardPage = () => {
  const student = useAuthStore((state) => state.student)
  const logout = useAuthStore((state) => state.logout)
  const sessions = useSessionStore((state) => state.sessions)
  const hasHydrated = useSessionStore((state) => state.hasHydrated)
  const setCurrentSession = useSessionStore((state) => state.setCurrentSession)
  const teacherHydrated = useTeacherStore((state) => state.hasHydrated)
  const classKey = student?.classKey
  const assignedSituation = useTeacherStore((state) =>
    classKey ? state.getSituationForClass(classKey) : undefined
  )
  const navigate = useNavigate()

  const handleCreateSession = () => {
    const trackConfig = classKey ? useTeacherStore.getState().getTrackConfigForClass(classKey) : undefined
    if (!trackConfig) {
      alert('Votre enseignant n\'a pas encore configuré la piste d\'athlétisme pour votre classe. Veuillez le contacter.')
      return
    }
    // Créer une session avec la situation assignée si elle existe
    const session = useSessionStore.getState().createSession(trackConfig, assignedSituation)
    navigate(`/session/${session.id}`)
  }

  const handleOpenSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId)
    if (session) {
      setCurrentSession(session)
      navigate(`/session/${sessionId}`)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!hasHydrated || !teacherHydrated) {
    return (
      <div className="dashboard-page">
        <p className="empty-state">Chargement des séances…</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Mon Carnet d'Entraînement</h1>
          <div className="header-actions">
            <span className="student-name">{student?.name}</span>
            <span className="class-name">{student?.className}</span>
            <button onClick={logout} className="logout-button">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {assignedSituation && (
          <div className="assigned-situation-banner">
            <div className="banner-content">
              <span className="banner-icon">📚</span>
              <div className="banner-text">
                <strong>Situation assignée par l'enseignant :</strong>
                <span>{assignedSituation.title}</span>
              </div>
            </div>
          </div>
        )}

        <div className="dashboard-actions">
          <button onClick={handleCreateSession} className="create-session-button">
            + Nouvelle séance
          </button>
        </div>

        <div className="sessions-list">
          <h2>Séances précédentes</h2>
          {sessions.length === 0 ? (
            <div className="empty-state">
              <p>Aucune séance enregistrée</p>
              <p className="empty-state-hint">Créez votre première séance pour commencer</p>
            </div>
          ) : (
            <div className="sessions-grid">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="session-card"
                  onClick={() => handleOpenSession(session.id)}
                >
                  <div className="session-card-header">
                    <h3>Séance du {formatDate(session.date)}</h3>
                    <span className="runners-count">
                      {session.runners.length} coureur{session.runners.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="session-card-body">
                    <div className="track-info">
                      <span>Piste: {session.trackConfig.lanes} couloirs</span>
                      <span>Zones: {session.trackConfig.transmissionZones.length}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default DashboardPage
