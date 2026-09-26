import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import './LoginPage.css'

const LoginPage = () => {
  const [name, setName] = useState('')
  const [classKey, setClassKey] = useState('')
  const [error, setError] = useState('')
  const loginStudent = useAuthStore((state) => state.loginStudent)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !classKey.trim()) {
      setError('Veuillez remplir tous les champs')
      return
    }

    try {
      await loginStudent(name.trim(), classKey.trim())
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la connexion. Vérifiez votre clé de classe.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <button onClick={() => navigate('/')} className="back-to-home">
          ← Retour à l'accueil
        </button>
        
        <div className="login-header">
          <div className="student-icon">👨‍🎓</div>
          <h1>Relais Vitesse</h1>
          <p className="subtitle">Carnet d'entraînement</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Nom de l'élève</label>
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
            <label htmlFor="classKey">Clé de classe</label>
            <input
              type="text"
              id="classKey"
              value={classKey}
              onChange={(e) => setClassKey(e.target.value)}
              placeholder="Entrez la clé fournie par l'enseignant"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button">
            Rejoindre la classe
          </button>
        </form>

        <div className="demo-info">
          <p className="demo-text">💡 Mode démo : Utilisez n'importe quelle clé pour tester</p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
