import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Situation, TrackConfig } from './sessionStore'

const sameClassKey = (left: string, right: string) =>
  left.trim().toUpperCase() === right.trim().toUpperCase()

export interface ClassStudent {
  id: string
  name: string
  classKey: string
}

export interface ClassGroup {
  id: string
  name: string
  classKey: string
  createdAt: string
  studentCount?: number
  trackConfig?: TrackConfig // Configuration de la piste pour cette classe
}

export interface SituationAssignment {
  id: string
  situationId: string
  classKey: string
  assignedAt: string
  expiresAt?: string
}

interface TeacherState {
  classGroups: ClassGroup[]
  students: ClassStudent[]
  situations: Situation[]
  assignments: SituationAssignment[]
  hasHydrated: boolean
  generateClassKey: () => string
  createClassGroup: (name: string) => ClassGroup
  deleteClassGroup: (groupId: string) => void
  addStudent: (classKey: string, name: string) => ClassStudent | null
  removeStudent: (studentId: string) => void
  getStudentsForClass: (classKey: string) => ClassStudent[]
  setTrackConfigForClass: (classKey: string, trackConfig: TrackConfig) => void
  getTrackConfigForClass: (classKey: string) => TrackConfig | undefined
  createSituation: (situation: Omit<Situation, 'id'>) => Situation
  updateSituation: (situationId: string, updates: Partial<Situation>) => void
  deleteSituation: (situationId: string) => void
  assignSituationToGroup: (situationId: string, classKey: string, expiresAt?: string) => void
  removeAssignment: (assignmentId: string) => void
  getSituationForClass: (classKey: string) => Situation | undefined
  getAssignmentsByClass: (classKey: string) => SituationAssignment[]
}

export const useTeacherStore = create<TeacherState>()(
  persist(
    (set, get) => ({
      classGroups: [],
      students: [],
      situations: [],
      assignments: [],
      hasHydrated: false,
      
      generateClassKey: () => {
        // Générer une clé de 6 caractères alphanumériques
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let key = ''
        for (let i = 0; i < 6; i++) {
          key += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return key
      },
      
      createClassGroup: (name: string) => {
        const state = get()
        let classKey = state.generateClassKey()
        // Vérifier que la clé n'existe pas déjà
        while (state.classGroups.some((g) => g.classKey === classKey)) {
          classKey = state.generateClassKey()
        }
        
        const group: ClassGroup = {
          id: Date.now().toString(),
          name,
          classKey,
          createdAt: new Date().toISOString(),
          studentCount: 0,
        }
        set((state) => ({
          classGroups: [...state.classGroups, group],
        }))
        return group
      },
      
      deleteClassGroup: (groupId: string) => {
        set((state) => {
          const groupToDelete = state.classGroups.find((g) => g.id === groupId)
          return {
            classGroups: state.classGroups.filter((g) => g.id !== groupId),
            students: (state.students ?? []).filter(
              (student) => !groupToDelete || student.classKey !== groupToDelete.classKey
            ),
            assignments: state.assignments.filter(
              (a) => !groupToDelete || a.classKey !== groupToDelete.classKey
            ),
          }
        })
      },

      addStudent: (classKey: string, name: string) => {
        const trimmed = name.trim()
        if (!trimmed) return null
        const student: ClassStudent = {
          id: Date.now().toString(),
          name: trimmed,
          classKey,
        }
        set((state) => ({
          students: [...(state.students ?? []), student],
          classGroups: state.classGroups.map((group) =>
            group.classKey === classKey
              ? { ...group, studentCount: (state.students ?? []).filter((item) => item.classKey === classKey).length + 1 }
              : group
          ),
        }))
        return student
      },

      removeStudent: (studentId: string) => {
        set((state) => {
          const removed = (state.students ?? []).find((student) => student.id === studentId)
          const students = (state.students ?? []).filter((student) => student.id !== studentId)
          return {
            students,
            classGroups: state.classGroups.map((group) =>
              removed && group.classKey === removed.classKey
                ? { ...group, studentCount: students.filter((item) => item.classKey === group.classKey).length }
                : group
            ),
          }
        })
      },

      getStudentsForClass: (classKey: string) => {
        return (get().students ?? []).filter((student) => sameClassKey(student.classKey, classKey))
      },
      
      setTrackConfigForClass: (classKey: string, trackConfig: TrackConfig) => {
        set((state) => ({
          classGroups: state.classGroups.map((g) =>
            g.classKey === classKey ? { ...g, trackConfig } : g
          ),
        }))
      },
      
      getTrackConfigForClass: (classKey: string) => {
        const state = get()
        const group = state.classGroups.find((g) => sameClassKey(g.classKey, classKey))
        return group?.trackConfig
      },
      
      createSituation: (situationData: Omit<Situation, 'id'>) => {
        const situation: Situation = {
          id: Date.now().toString(),
          ...situationData,
        }
        set((state) => ({
          situations: [...state.situations, situation],
        }))
        return situation
      },
      
      updateSituation: (situationId: string, updates: Partial<Situation>) => {
        set((state) => ({
          situations: state.situations.map((s) =>
            s.id === situationId ? { ...s, ...updates } : s
          ),
        }))
      },
      
      deleteSituation: (situationId: string) => {
        set((state) => ({
          situations: state.situations.filter((s) => s.id !== situationId),
          assignments: state.assignments.filter((a) => a.situationId !== situationId),
        }))
      },
      
      assignSituationToGroup: (situationId: string, classKey: string, expiresAt?: string) => {
        // Retirer l'ancienne assignation si elle existe
        const state = get()
        const existingAssignment = state.assignments.find(
          (a) => a.classKey === classKey && a.situationId === situationId
        )
        
        if (existingAssignment) {
          set({
            assignments: state.assignments.map((a) =>
              a.id === existingAssignment.id
                ? { ...a, assignedAt: new Date().toISOString(), expiresAt }
                : a
            ),
          })
        } else {
          const assignment: SituationAssignment = {
            id: Date.now().toString(),
            situationId,
            classKey,
            assignedAt: new Date().toISOString(),
            expiresAt,
          }
          set((state) => ({
            assignments: [...state.assignments, assignment],
          }))
        }
      },
      
      removeAssignment: (assignmentId: string) => {
        set((state) => ({
          assignments: state.assignments.filter((a) => a.id !== assignmentId),
        }))
      },
      
      getSituationForClass: (classKey: string) => {
        const state = get()
        const assignment = state.assignments
          .filter((a) => sameClassKey(a.classKey, classKey))
          .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0]
        
        if (!assignment) return undefined
        
        // Vérifier si l'assignation n'a pas expiré
        if (assignment.expiresAt && new Date(assignment.expiresAt) < new Date()) {
          return undefined
        }
        
        return state.situations.find((s) => s.id === assignment.situationId)
      },
      
      getAssignmentsByClass: (classKey: string) => {
        return get().assignments.filter((a) => sameClassKey(a.classKey, classKey))
      },
    }),
    {
      name: 'relais-vitesse-teacher',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        classGroups: state.classGroups,
        students: state.students,
        situations: state.situations,
        assignments: state.assignments,
      }),
      onRehydrateStorage: () => (state) => {
        // Hydratation synchrone : le flag doit être écrit sur l'état retourné.
        if (state) state.hasHydrated = true
      },
    }
  )
)
