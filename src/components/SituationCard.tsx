import { Situation } from '../store/sessionStore'
import './SituationCard.css'

interface SituationCardProps {
  situation?: Situation
}

const SituationCard = ({ situation }: SituationCardProps) => {
  if (!situation) {
    return (
      <div className="situation-card empty">
        <div className="situation-header">
          <h3>Situation d'apprentissage</h3>
        </div>
        <div className="empty-state">
          <p>Aucune situation n'a été assignée par l'enseignant pour le moment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="situation-card">
      <div className="situation-header">
        <h3>{situation.title}</h3>
      </div>

      <div className="situation-content">
        <div className="situation-section">
          <h4 className="section-title">🎯 Objectif</h4>
          <p className="section-text">{situation.objective}</p>
        </div>

        <div className="situation-section">
          <h4 className="section-title">🎯 But</h4>
          <p className="section-text">{situation.goal}</p>
        </div>

        <div className="situation-section">
          <h4 className="section-title">📋 Consignes</h4>
          <ul className="section-list">
            {situation.instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ul>
        </div>

        {situation.material && (
          <div className="situation-section">
            <h4 className="section-title">🔧 Matériel</h4>
            <p className="section-text">{situation.material}</p>
          </div>
        )}

        {situation.installation && (
          <div className="situation-section">
            <h4 className="section-title">⚙️ Installation</h4>
            <p className="section-text">{situation.installation}</p>
          </div>
        )}

        <div className="situation-section">
          <h4 className="section-title">✅ Critères de réussite</h4>
          <ul className="section-list">
            {situation.successCriteria.map((criterion, index) => (
              <li key={index}>{criterion}</li>
            ))}
          </ul>
        </div>

        <div className="situation-section">
          <h4 className="section-title">📝 Critères de réalisation</h4>
          <ul className="section-list">
            {situation.realizationCriteria.map((criterion, index) => (
              <li key={index}>{criterion}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default SituationCard
