import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import './HomePage.css'

const HomePage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuthStore()

  useEffect(() => {
    // Rediriger si déjà connecté
    if (isAuthenticated) {
      if (role === 'student') {
        navigate('/dashboard', { replace: true })
      } else if (role === 'teacher') {
        navigate('/teacher/dashboard', { replace: true })
      }
    }
  }, [isAuthenticated, role, navigate])

  return (
    <div className="home-page">
      <div className="home-container">
        <div className="home-header">
          <h1>🏃 Relais Vitesse</h1>
          <p className="subtitle">Application EPS</p>
        </div>

        <div className="role-selection">
          <div className="role-card student-card" onClick={() => navigate('/login/student')}>
            <div className="role-icon">👨‍🎓</div>
            <h2>Élève</h2>
            <p>Accédez à votre carnet d'entraînement</p>
            <ul className="role-features">
              <li>✓ Créer vos séances d'entraînement</li>
              <li>✓ Enregistrer vos performances</li>
              <li>✓ Visualiser votre progression</li>
              <li>✓ Consulter les situations d'apprentissage</li>
            </ul>
            <button className="role-button">Se connecter</button>
          </div>

          <div className="role-card teacher-card" onClick={() => navigate('/teacher/dashboard')}>
            <div className="role-icon">👨‍🏫</div>
            <h2>Enseignant</h2>
            <p>Gérez vos classes et situations</p>
            <ul className="role-features">
              <li>✓ Créer des situations d'apprentissage</li>
              <li>✓ Configurer les pistes pour chaque classe</li>
              <li>✓ Générer des clés pour les élèves</li>
              <li>✓ Assigner aux groupes d'élèves</li>
            </ul>
            <button className="role-button">Accéder</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
