import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface SubZone {
  startOffset: number // offset en mètres depuis le début de la zone principale
  length: number // longueur du sous-segment
  color?: string // couleur spécifique (hex ou nom)
  label?: string // nom du sous-segment (ex: "Elan", "Trans.")
}

export interface SpeedPlot {
  id: string
  label: string
  speedKmh: number
  distance: number
}

export interface TrackConfig {
  trackType?: 'oval' | 'straight' // 'oval' by default if undefined
  lanes: number
  straightLength: number // en mètres
  curveRadius: number // en mètres (ignored if trackType === 'straight')
  trackWidth: number // largeur d'un couloir en mètres
  transmissionZones: {
    start: number // distance depuis le départ en mètres
    length: number // longueur de la zone en mètres
    lane?: number // couloir spécifique (optionnel)
    subZones?: SubZone[] // Sous-division de la zone
  }[]
  speedPlots?: SpeedPlot[]
}

export interface TransmissionPoint {
  x: number
  y: number
  distance: number // distance depuis le départ en mètres
  lane: number
}

export interface VideoData {
  id: string
  type: 'donneur' | 'receveur' | 'transmission'
  url: string
  timestamp: number
  transmissionPoint?: TransmissionPoint
}

export interface RunnerData {
  runnerId: number
  name: string
  distance: number // distance parcourue en mètres
  time: number // temps total en secondes
  donnerTime?: number // temps du donneur en secondes
  receiverTime?: number // temps du receveur en secondes
  transmissionZoneTime?: number // temps dans la zone de transmission en secondes
  averageSpeed?: number // vitesse moyenne du témoin en m/s
  transmissionPoint?: TransmissionPoint
  videos?: VideoData[]
}

export interface RelayAttempt {
  id: string
  createdAt: string
  donnerName: string
  receiverName: string
  donnerTime: number
  receiverTime: number
  exchangeTime: number
  relayTime: number
  transmissionPoint: TransmissionPoint
  donnerDistance: number
  receiverDistance: number
  arrivalDistance: number
  donnerSpeed: number
  receiverSpeed: number
  batonSpeed: number
  speedPlotId?: string
  speedPlotLabel?: string
  reachedSpeedKmh?: number
  videoId?: string
}

export interface Session {
  id: string
  date: string
  trackConfig: TrackConfig
  runners: RunnerData[]
  attempts?: RelayAttempt[]
  situation?: Situation
}

export interface Situation {
  id: string
  title: string
  objective: string
  goal: string
  instructions: string[]
  material?: string
  installation?: string
  successCriteria: string[]
  realizationCriteria: string[]
}

interface SessionState {
  sessions: Session[]
  currentSession: Session | null
  hasHydrated: boolean
  createSession: (trackConfig: TrackConfig, situation?: Situation) => Session
  updateSession: (sessionId: string, updates: Partial<Session>) => void
  addRunner: (sessionId: string, runner: RunnerData) => void
  updateRunner: (sessionId: string, runnerId: number, updates: Partial<RunnerData>) => void
  addAttempt: (sessionId: string, attempt: RelayAttempt) => void
  deleteAttempt: (sessionId: string, attemptId: string) => void
  setCurrentSession: (session: Session | null) => void
  setSituation: (sessionId: string, situation: Situation) => void
}

function withoutVideos(session: Session): Session {
  return {
    ...session,
    runners: session.runners.map((runner) => {
      const copy = { ...runner }
      delete copy.videos
      return copy
    }),
  }
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
  sessions: [],
  currentSession: null,
  hasHydrated: false,
  createSession: (trackConfig: TrackConfig, situation?: Situation) => {
    const session: Session = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      trackConfig,
      runners: [],
      attempts: [],
      situation,
    }
    set((state) => ({
      sessions: [...state.sessions, session],
      currentSession: session,
    }))
    return session
  },
  updateSession: (sessionId: string, updates: Partial<Session>) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
      currentSession:
        state.currentSession?.id === sessionId
          ? { ...state.currentSession, ...updates }
          : state.currentSession,
    }))
  },
  addRunner: (sessionId: string, runner: RunnerData) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, runners: [...s.runners, runner] }
          : s
      ),
      currentSession:
        state.currentSession?.id === sessionId
          ? { ...state.currentSession, runners: [...state.currentSession.runners, runner] }
          : state.currentSession,
    }))
  },
  updateRunner: (sessionId: string, runnerId: number, updates: Partial<RunnerData>) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, runners: s.runners.map((r) => (r.runnerId === runnerId ? { ...r, ...updates } : r)) }
          : s
      ),
      currentSession:
        state.currentSession?.id === sessionId
          ? {
            ...state.currentSession,
            runners: state.currentSession.runners.map((r) =>
              r.runnerId === runnerId ? { ...r, ...updates } : r
            ),
          }
          : state.currentSession,
    }))
  },
  addAttempt: (sessionId: string, attempt: RelayAttempt) => {
    const withAttempt = (session: Session) =>
      session.id === sessionId
        ? { ...session, attempts: [...(session.attempts ?? []), attempt] }
        : session
    set((state) => ({
      sessions: state.sessions.map(withAttempt),
      currentSession: state.currentSession ? withAttempt(state.currentSession) : null,
    }))
  },
  deleteAttempt: (sessionId: string, attemptId: string) => {
    const withoutAttempt = (session: Session) =>
      session.id === sessionId
        ? { ...session, attempts: (session.attempts ?? []).filter((attempt) => attempt.id !== attemptId) }
        : session
    set((state) => ({
      sessions: state.sessions.map(withoutAttempt),
      currentSession: state.currentSession ? withoutAttempt(state.currentSession) : null,
    }))
  },
  setCurrentSession: (session: Session | null) => {
    set({ currentSession: session })
  },
  setSituation: (sessionId: string, situation: Situation) => {
    get().updateSession(sessionId, { situation })
  },
    }),
    {
      name: 'relais-vitesse-sessions',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions.map(withoutVideos),
      }),
      onRehydrateStorage: () => (state) => {
        // Hydratation synchrone : le flag doit être écrit sur l'état retourné.
        if (state) state.hasHydrated = true
      },
    }
  )
)
