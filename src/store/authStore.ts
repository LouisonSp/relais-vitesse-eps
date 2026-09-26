import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useTeacherStore } from './teacherStore'

export type UserRole = 'student' | 'teacher'

interface Student {
  id: string
  name: string
  classKey: string
  className?: string
}

interface Teacher {
  id: string
  name: string
  teacherKey: string
}

interface AuthState {
  isAuthenticated: boolean
  role: UserRole | null
  student: Student | null
  teacher: Teacher | null
  loginStudent: (name: string, classKey: string) => Promise<void>
  loginTeacher: (name: string, teacherKey: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      role: null,
      student: null,
      teacher: null,
      loginStudent: async (name: string, classKey: string) => {
        const normalizedKey = classKey.trim().toUpperCase()
        const groups = useTeacherStore.getState().classGroups ?? []
        if (groups.length > 0 && !groups.some((group) => group.classKey.toUpperCase() === normalizedKey)) {
          throw new Error('Cette clé de classe est inconnue sur cet appareil.')
        }
        const student: Student = {
          id: Date.now().toString(),
          name,
          classKey: normalizedKey,
          className: groups.find((group) => group.classKey.toUpperCase() === normalizedKey)?.name ?? `Classe ${normalizedKey}`,
        }
        set({ isAuthenticated: true, role: 'student', student, teacher: null })
      },
      loginTeacher: async (name: string, teacherKey: string) => {
        // Simulation d'une authentification - à remplacer par un appel API réel
        const teacher: Teacher = {
          id: Date.now().toString(),
          name,
          teacherKey,
        }
        set({ isAuthenticated: true, role: 'teacher', teacher, student: null })
      },
      logout: () => {
        set({ isAuthenticated: false, role: null, student: null, teacher: null })
      },
    }),
    {
      name: 'relais-vitesse-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
