import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import './TeacherLoginPage.css'

const TeacherLoginPage = () => {
  const [name, setName] = useState('')
  const [teacherKey, setTeacherKey] = useState('')
  const [error, setError] = useState('')
  const loginTeacher = useAuthStore((state) => state.loginTeacher)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !teacherKey.trim()) {
      setError('Veuillez remplir tous les champs')
      return
    }

    try {
      await loginTeacher(name.trim(), teacherKey.trim())
      navigate('/teacher/dashboard')
    } catch (err) {
      setError('Erreur lors de la connexion. Vérifiez votre clé d\'enseignant.')
    }
  }

  return (
    <div className="teacher-login-page">
      <div className="login-container">
        <button onClick={() => navigate('/')} className="back-to-home">
          ← Retour à l'accueil
        </button>
        
        <div className="login-header">
          <div className="teacher-icon">👨‍🏫</div>
          <h1>Espace Enseignant</h1>
          <p className="subtitle">Connectez-vous à votre espace</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Nom de l'enseignant</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Entrez votre nom"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="teacherKey">Clé d'enseignant</label>
            <input
              type="text"
              id="teacherKey"
              value={teacherKey}
              onChange={(e) => setTeacherKey(e.target.value)}
              placeholder="Entrez votre clé d'enseignant"
              required
            />
            <small className="hint">La clé vous a été fournie par l'administration</small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button">
            Se connecter
          </button>
        </form>

        <div className="demo-info">
          <p className="demo-text">💡 Mode démo : Utilisez n'importe quelle clé pour tester</p>
        </div>
      </div>
    </div>
  )
}

export default TeacherLoginPage
