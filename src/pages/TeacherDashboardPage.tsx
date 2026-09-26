import { lazy, Suspense, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useTeacherStore } from '../store/teacherStore'
import SituationList from '../components/SituationList'
import './TeacherDashboardPage.css'

const SituationForm = lazy(() => import('../components/SituationForm'))
const ClassGroupManager = lazy(() => import('../components/ClassGroupManager'))

const TeacherDashboardPage = () => {
  const { teacher, logout } = useAuthStore()
  const { classGroups, situations, hasHydrated } = useTeacherStore()
  const [activeTab, setActiveTab] = useState<'situations' | 'groups' | 'create'>('situations')
  const [editingSituationId, setEditingSituationId] = useState<string | null>(null)

  return (
    <div className="teacher-dashboard-page">
      <header className="teacher-header">
        <div className="header-content">
          <h1>👨‍🏫 Espace Enseignant</h1>
          <div className="header-actions">
            <span className="teacher-name">{teacher?.name}</span>
            <button onClick={logout} className="logout-button">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="teacher-main">
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'situations' ? 'active' : ''}`}
            onClick={() => setActiveTab('situations')}
          >
            📚 Mes Situations ({situations.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            👥 Groupes ({classGroups.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('create')
              setEditingSituationId(null)
            }}
          >
            ➕ Créer une situation
          </button>
        </div>

        <div className="tab-content">
          {!hasHydrated ? (
            <p>Chargement…</p>
          ) : (
            <Suspense fallback={<p>Chargement…</p>}>
              {activeTab === 'situations' && (
                <SituationList
                  onEdit={(situationId) => {
                    setEditingSituationId(situationId)
                    setActiveTab('create')
                  }}
                />
              )}

              {activeTab === 'groups' && <ClassGroupManager />}

              {activeTab === 'create' && (
                <SituationForm
                  situationId={editingSituationId}
                  onSave={() => {
                    setEditingSituationId(null)
                    setActiveTab('situations')
                  }}
                  onCancel={() => {
                    setEditingSituationId(null)
                    setActiveTab('situations')
                  }}
                />
              )}
            </Suspense>
          )}
        </div>
      </main>
    </div>
  )
}

export default TeacherDashboardPage
