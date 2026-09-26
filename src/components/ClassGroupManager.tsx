import { useState } from 'react'
import { useTeacherStore } from '../store/teacherStore'
import SituationAssignment from './SituationAssignment'
import TrackConfigForm from './TrackConfigForm'
import ConfirmModal from './ConfirmModal'
import './ClassGroupManager.css'

const ClassStudents = ({ classKey }: { classKey: string }) => {
  const students = useTeacherStore((state) =>
    (state.students ?? []).filter((student) => student.classKey.toUpperCase() === classKey.toUpperCase())
  )
  const addStudent = useTeacherStore((state) => state.addStudent)
  const removeStudent = useTeacherStore((state) => state.removeStudent)
  const [name, setName] = useState('')

  const handleAdd = () => {
    if (!name.trim()) return
    addStudent(classKey, name)
    setName('')
  }

  return (
    <div className="students-section">
      <h4>Élèves ({students.length})</h4>
      <div className="student-add">
        <input
          type="text"
          value={name}
          placeholder="Nom de l'élève"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleAdd()
          }}
        />
        <button type="button" onClick={handleAdd} className="assign-button">
          Ajouter
        </button>
      </div>
      {students.length === 0 ? (
        <p className="empty-state-hint">Aucun élève dans cette classe</p>
      ) : (
        <ul className="student-list">
          {students.map((student) => (
            <li key={student.id}>
              <span>{student.name}</span>
              <button type="button" onClick={() => removeStudent(student.id)} title="Retirer">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ClassGroupManager = () => {
  const { classGroups, createClassGroup, deleteClassGroup, getTrackConfigForClass } = useTeacherStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [configuringTrackForGroup, setConfiguringTrackForGroup] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; groupId: string | null; groupName: string }>({
    isOpen: false,
    groupId: null,
    groupName: '',
  })

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      alert('Veuillez entrer un nom de groupe')
      return
    }

    const group = createClassGroup(newGroupName.trim())
    setNewGroupName('')
    setShowCreateForm(false)
    alert(`Groupe créé ! Clé de classe : ${group.classKey}\n\nCopiez cette clé et communiquez-la aux élèves.`)
  }

  const confirmDelete = () => {
    if (deleteModal.groupId) {
      deleteClassGroup(deleteModal.groupId)
      setDeleteModal({ isOpen: false, groupId: null, groupName: '' })
    }
  }

  const handleDeleteClick = (groupId: string, groupName: string) => {
    setDeleteModal({ isOpen: true, groupId, groupName })
  }

  return (
    <div className="class-group-manager">
      <div className="manager-header">
        <h2>Gestion des groupes</h2>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm)
          }}
          className="create-group-button"
        >
          {showCreateForm ? 'Annuler' : '+ Créer un groupe'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-group-form">
          <h3>Créer un nouveau groupe</h3>
          <div className="form-group">
            <label htmlFor="groupName">Nom du groupe</label>
            <input
              type="text"
              id="groupName"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Ex: 6ème A"
              required
            />
            <small className="hint">Une clé de classe unique sera générée automatiquement</small>
          </div>
          <div className="form-actions">
            <button type="button" onClick={handleCreateGroup} className="save-button">
              Créer le groupe
            </button>
          </div>
        </div>
      )}

      {classGroups.length === 0 && !showCreateForm ? (
        <div className="empty-state">
          <p>Aucun groupe créé</p>
          <p className="empty-state-hint">Créez votre premier groupe pour commencer</p>
        </div>
      ) : (
        <div className="groups-list">
          {classGroups.map((group) => (
            <div key={group.id} className="group-card">
              <div className="group-card-header">
                <div className="group-info">
                  <h3>{group.name}</h3>
                  <div className="group-key">
                    <strong>Clé:</strong>
                    <code className="key-display">{group.classKey}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(group.classKey)
                        alert('Clé copiée dans le presse-papiers !')
                      }}
                      className="copy-button"
                      title="Copier la clé"
                    >
                      📋
                    </button>
                  </div>
                  <div className="group-meta">
                    <span>Créé le {new Date(group.createdAt).toLocaleDateString('fr-FR')}</span>
                    <span>{group.studentCount ?? 0} élève{(group.studentCount ?? 0) > 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="group-actions">
                  <button
                    onClick={() =>
                      setConfiguringTrackForGroup(configuringTrackForGroup === group.id ? null : group.id)
                    }
                    className="config-track-button"
                    title={getTrackConfigForClass(group.classKey) ? 'Modifier la configuration de la piste' : 'Configurer la piste'}
                  >
                    {getTrackConfigForClass(group.classKey) ? '✏️ Modifier piste' : '🏃 Configurer piste'}
                  </button>
                  <button
                    onClick={() =>
                      setSelectedGroup(selectedGroup === group.id ? null : group.id)
                    }
                    className="assign-button"
                  >
                    {selectedGroup === group.id ? 'Fermer' : '📚 Assigner situation'}
                  </button>
                  <button
                    onClick={() => handleDeleteClick(group.id, group.name)}
                    className="delete-group-button"
                    title="Supprimer le groupe"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <ClassStudents classKey={group.classKey} />

              {configuringTrackForGroup === group.id && (
                <div className="track-config-section">
                  <TrackConfigForm
                    classKey={group.classKey}
                    onSave={() => {
                      setConfiguringTrackForGroup(null)
                      alert('Configuration de la piste enregistrée !')
                    }}
                    onCancel={() => setConfiguringTrackForGroup(null)}
                  />
                </div>
              )}

              {selectedGroup === group.id && (
                <div className="assignment-section">
                  <SituationAssignment classKey={group.classKey} groupName={group.name} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Supprimer le groupe"
        message={`Êtes-vous sûr de vouloir supprimer le groupe "${deleteModal.groupName}" ? Les assignations de situations seront également supprimées.`}
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, groupId: null, groupName: '' })}
      />
    </div>
  )
}

export default ClassGroupManager
