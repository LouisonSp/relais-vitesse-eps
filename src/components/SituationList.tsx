import { useState } from 'react'
import { useTeacherStore } from '../store/teacherStore'
import ConfirmModal from './ConfirmModal'
import './SituationList.css'

interface SituationListProps {
  onEdit: (situationId: string) => void
}

const SituationList = ({ onEdit }: SituationListProps) => {
  const { situations, deleteSituation, assignments, classGroups } = useTeacherStore()

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; situationId: string | null }>({
    isOpen: false,
    situationId: null,
  })

  const confirmDelete = () => {
    if (deleteModal.situationId) {
      deleteSituation(deleteModal.situationId)
      setDeleteModal({ isOpen: false, situationId: null })
    }
  }

  const handleDeleteClick = (situationId: string) => {
    setDeleteModal({ isOpen: true, situationId })
  }

  const getAssignedGroups = (situationId: string) => {
    return assignments
      .filter((a) => a.situationId === situationId)
      .map((a) => {
        const group = classGroups.find((g) => g.classKey === a.classKey)
        return group?.name || a.classKey
      })
  }

  if (situations.length === 0) {
    return (
      <div className="empty-state">
        <p>Aucune situation créée</p>
        <p className="empty-state-hint">Créez votre première situation d'apprentissage</p>
      </div>
    )
  }

  return (
    <div className="situation-list">
      <div className="situations-grid">
        {situations.map((situation) => {
          const assignedGroups = getAssignedGroups(situation.id)
          return (
            <div key={situation.id} className="situation-card">
              <div className="situation-card-header">
                <h3>{situation.title}</h3>
                <div className="situation-actions">
                  <button
                    onClick={() => onEdit(situation.id)}
                    className="edit-button"
                    title="Modifier"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteClick(situation.id)}
                    className="delete-button"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="situation-card-body">
                <div className="situation-info">
                  <div className="info-item">
                    <strong>Objectif:</strong>
                    <p>{situation.objective}</p>
                  </div>
                  <div className="info-item">
                    <strong>But:</strong>
                    <p>{situation.goal}</p>
                  </div>
                  {situation.instructions.length > 0 && (
                    <div className="info-item">
                      <strong>Consignes ({situation.instructions.length}):</strong>
                      <ul>
                        {situation.instructions.slice(0, 3).map((instruction, index) => (
                          <li key={index}>{instruction}</li>
                        ))}
                        {situation.instructions.length > 3 && (
                          <li className="more-items">+ {situation.instructions.length - 3} autres...</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {assignedGroups.length > 0 && (
                  <div className="assigned-groups">
                    <strong>Assignée à:</strong>
                    <div className="groups-tags">
                      {assignedGroups.map((groupName, index) => (
                        <span key={index} className="group-tag">
                          {groupName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {assignedGroups.length === 0 && (
                  <div className="not-assigned">
                    <span className="warning-icon">⚠️</span>
                    Non assignée
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Supprimer la situation"
        message="Êtes-vous sûr de vouloir supprimer cette situation ? Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, situationId: null })}
      />
    </div>
  )
}

export default SituationList
