import { useState, useEffect } from 'react'
import { useTeacherStore } from '../store/teacherStore'
import { Situation } from '../store/sessionStore'
import './SituationForm.css'

interface SituationFormProps {
  situationId?: string | null
  onSave: () => void
  onCancel: () => void
}

const SituationForm = ({ situationId, onSave, onCancel }: SituationFormProps) => {
  const { situations, createSituation, updateSituation } = useTeacherStore()
  const editingSituation = situationId ? situations.find((s) => s.id === situationId) : null

  const [title, setTitle] = useState(editingSituation?.title || '')
  const [objective, setObjective] = useState(editingSituation?.objective || '')
  const [goal, setGoal] = useState(editingSituation?.goal || '')
  const [instructions, setInstructions] = useState<string[]>(editingSituation?.instructions || [''])
  const [material, setMaterial] = useState(editingSituation?.material || '')
  const [installation, setInstallation] = useState(editingSituation?.installation || '')
  const [successCriteria, setSuccessCriteria] = useState<string[]>(
    editingSituation?.successCriteria || ['']
  )
  const [realizationCriteria, setRealizationCriteria] = useState<string[]>(
    editingSituation?.realizationCriteria || ['']
  )

  useEffect(() => {
    if (editingSituation) {
      setTitle(editingSituation.title)
      setObjective(editingSituation.objective)
      setGoal(editingSituation.goal)
      setInstructions(editingSituation.instructions.length > 0 ? editingSituation.instructions : [''])
      setMaterial(editingSituation.material || '')
      setInstallation(editingSituation.installation || '')
      setSuccessCriteria(editingSituation.successCriteria.length > 0 ? editingSituation.successCriteria : [''])
      setRealizationCriteria(
        editingSituation.realizationCriteria.length > 0 ? editingSituation.realizationCriteria : ['']
      )
    }
  }, [editingSituation])

  const handleAddItem = (list: string[], setList: (items: string[]) => void) => {
    setList([...list, ''])
  }

  const handleUpdateItem = (
    index: number,
    value: string,
    list: string[],
    setList: (items: string[]) => void
  ) => {
    const newList = [...list]
    newList[index] = value
    setList(newList)
  }

  const handleRemoveItem = (index: number, list: string[], setList: (items: string[]) => void) => {
    if (list.length > 1) {
      setList(list.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !objective.trim() || !goal.trim()) {
      alert('Veuillez remplir au moins le titre, l\'objectif et le but')
      return
    }

    const situationData: Omit<Situation, 'id'> = {
      title: title.trim(),
      objective: objective.trim(),
      goal: goal.trim(),
      instructions: instructions.filter((i) => i.trim() !== ''),
      material: material.trim() || undefined,
      installation: installation.trim() || undefined,
      successCriteria: successCriteria.filter((c) => c.trim() !== ''),
      realizationCriteria: realizationCriteria.filter((c) => c.trim() !== ''),
    }

    if (editingSituation) {
      updateSituation(editingSituation.id, situationData)
    } else {
      createSituation(situationData)
    }

    onSave()
  }

  return (
    <div className="situation-form-container">
      <div className="form-header">
        <h2>{editingSituation ? 'Modifier la situation' : 'Créer une nouvelle situation'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="situation-form">
        <div className="form-group">
          <label htmlFor="title">Titre de la situation *</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Relais vitesse 4x100m"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="objective">Objectif *</label>
          <textarea
            id="objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Objectif pédagogique de la situation"
            rows={3}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="goal">But *</label>
          <textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="But de la séance"
            rows={3}
            required
          />
        </div>

        <div className="form-group">
          <label>Consignes</label>
          {instructions.map((instruction, index) => (
            <div key={index} className="list-item">
              <input
                type="text"
                value={instruction}
                onChange={(e) => handleUpdateItem(index, e.target.value, instructions, setInstructions)}
                placeholder={`Consigne ${index + 1}`}
              />
              {instructions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index, instructions, setInstructions)}
                  className="remove-button"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleAddItem(instructions, setInstructions)}
            className="add-button"
          >
            + Ajouter une consigne
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="material">Matériel</label>
          <textarea
            id="material"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder="Matériel nécessaire (optionnel)"
            rows={2}
          />
        </div>

        <div className="form-group">
          <label htmlFor="installation">Installation</label>
          <textarea
            id="installation"
            value={installation}
            onChange={(e) => setInstallation(e.target.value)}
            placeholder="Comment installer le matériel (optionnel)"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Critères de réussite</label>
          {successCriteria.map((criterion, index) => (
            <div key={index} className="list-item">
              <input
                type="text"
                value={criterion}
                onChange={(e) =>
                  handleUpdateItem(index, e.target.value, successCriteria, setSuccessCriteria)
                }
                placeholder={`Critère ${index + 1}`}
              />
              {successCriteria.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index, successCriteria, setSuccessCriteria)}
                  className="remove-button"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleAddItem(successCriteria, setSuccessCriteria)}
            className="add-button"
          >
            + Ajouter un critère
          </button>
        </div>

        <div className="form-group">
          <label>Critères de réalisation</label>
          {realizationCriteria.map((criterion, index) => (
            <div key={index} className="list-item">
              <input
                type="text"
                value={criterion}
                onChange={(e) =>
                  handleUpdateItem(index, e.target.value, realizationCriteria, setRealizationCriteria)
                }
                placeholder={`Critère ${index + 1}`}
              />
              {realizationCriteria.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index, realizationCriteria, setRealizationCriteria)}
                  className="remove-button"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleAddItem(realizationCriteria, setRealizationCriteria)}
            className="add-button"
          >
            + Ajouter un critère
          </button>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-button">
            Annuler
          </button>
          <button type="submit" className="save-button">
            {editingSituation ? 'Enregistrer les modifications' : 'Créer la situation'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SituationForm
