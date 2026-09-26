import { useState } from 'react'
import { useTeacherStore } from '../store/teacherStore'
import ConfirmModal from './ConfirmModal'
import './SituationAssignment.css'

interface SituationAssignmentProps {
  classKey: string
  groupName: string
}

const SituationAssignment = ({ classKey, groupName }: SituationAssignmentProps) => {
  const { situations, assignments, assignSituationToGroup, removeAssignment } = useTeacherStore()
  const [selectedSituationId, setSelectedSituationId] = useState<string>('')
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; assignmentId: string | null }>({
    isOpen: false,
    assignmentId: null,
  })

  const currentAssignments = assignments.filter((a) => a.classKey === classKey)

  const handleAssign = () => {
    if (!selectedSituationId) {
      alert('Veuillez sélectionner une situation')
      return
    }

    assignSituationToGroup(selectedSituationId, classKey)
    setSelectedSituationId('')
    alert('Situation assignée avec succès !')
  }

  const confirmRemove = () => {
    if (deleteModal.assignmentId) {
      removeAssignment(deleteModal.assignmentId)
      setDeleteModal({ isOpen: false, assignmentId: null })
    }
  }

  const handleRemoveClick = (assignmentId: string) => {
    setDeleteModal({ isOpen: true, assignmentId })
  }

  const getCurrentSituation = () => {
    const assignment = currentAssignments
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0]
    if (!assignment) return null
    return situations.find((s) => s.id === assignment.situationId)
  }

  const currentSituation = getCurrentSituation()

  return (
    <div className="situation-assignment">
      <h3>Assignation de situation pour {groupName}</h3>

      {currentSituation && (
        <div className="current-situation">
          <h4>Situation actuellement assignée :</h4>
          <div className="current-situation-card">
            <div className="situation-title">{currentSituation.title}</div>
            <div className="situation-details">
              <p>
                <strong>Objectif:</strong> {currentSituation.objective}
              </p>
            </div>
            <div className="assignment-date">
              Assignée le {new Date(currentAssignments[0].assignedAt).toLocaleDateString('fr-FR')}
            </div>
            <button
              onClick={() => handleRemoveClick(currentAssignments[0].id)}
              className="remove-assignment-button"
            >
              Retirer cette situation
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Retirer la situation"
        message="Êtes-vous sûr de vouloir retirer cette situation du groupe ?"
        confirmLabel="Retirer"
        onConfirm={confirmRemove}
        onCancel={() => setDeleteModal({ isOpen: false, assignmentId: null })}
      />

      <div className="assign-form">
        <h4>{currentSituation ? 'Remplacer par une autre situation' : 'Assigner une situation'}</h4>

        {situations.length === 0 ? (
          <div className="no-situations">
            <p>Aucune situation créée.</p>
            <p>Créez d'abord une situation avant de l'assigner.</p>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="situation-select">Sélectionner une situation</label>
              <select
                id="situation-select"
                value={selectedSituationId}
                onChange={(e) => setSelectedSituationId(e.target.value)}
                className="situation-select"
              >
                <option value="">-- Choisir une situation --</option>
                {situations.map((situation) => (
                  <option key={situation.id} value={situation.id}>
                    {situation.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedSituationId && (
              <div className="selected-situation-preview">
                {(() => {
                  const preview = situations.find((s) => s.id === selectedSituationId)
                  if (!preview) return null
                  return (
                    <div className="preview-card">
                      <div className="preview-title">{preview.title}</div>
                      <div className="preview-content">
                        <p>
                          <strong>Objectif:</strong> {preview.objective}
                        </p>
                        <p>
                          <strong>But:</strong> {preview.goal}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            <button
              onClick={handleAssign}
              disabled={!selectedSituationId}
              className="assign-button"
            >
              {currentSituation ? 'Remplacer la situation' : 'Assigner cette situation'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default SituationAssignment
