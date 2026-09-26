import { useState } from 'react'
import { TrackConfig, RunnerData } from '../store/sessionStore'
import './SimulationControls.css'

interface SimulationControlsProps {
  runners: RunnerData[]
  trackConfig: TrackConfig
  onStart: () => void
  onStop: () => void
  onSpeedChange?: (speed: number) => void
}

const SimulationControls = ({ runners, onStart, onStop, onSpeedChange }: SimulationControlsProps) => {
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1)

  const handleStart = () => {
    if (runners.length < 2) {
      alert('Au moins 2 coureurs sont nécessaires pour la simulation')
      return
    }

    setIsRunning(true)
    onStart()
    // Ici, on lancerait l'animation
    // Pour l'instant, c'est une simulation basique
  }

  const handleStop = () => {
    setIsRunning(false)
    onStop()
  }

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed)
    onSpeedChange?.(newSpeed)
  }

  return (
    <div className="simulation-controls">
      <div className="simulation-header">
        <h3>🎬 Simulation du relais</h3>
      </div>

      <div className="simulation-info">
        <p className="info-text">
          {runners.length} coureur{runners.length > 1 ? 's' : ''} configuré{runners.length > 1 ? 's' : ''}
        </p>
        {runners.length < 2 && (
          <p className="warning-text">Ajoutez au moins 2 coureurs pour lancer la simulation</p>
        )}
      </div>

      <div className="speed-control">
        <label htmlFor="speed">Vitesse de simulation:</label>
        <div className="speed-selector">
          <button
            className={speed === 0.5 ? 'speed-button active' : 'speed-button'}
            onClick={() => handleSpeedChange(0.5)}
          >
            0.5x
          </button>
          <button
            className={speed === 1 ? 'speed-button active' : 'speed-button'}
            onClick={() => handleSpeedChange(1)}
          >
            1x
          </button>
          <button
            className={speed === 2 ? 'speed-button active' : 'speed-button'}
            onClick={() => handleSpeedChange(2)}
          >
            2x
          </button>
        </div>
      </div>

      <div className="simulation-actions">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={runners.length < 2}
            className="start-button"
          >
            ▶️ Lancer la simulation
          </button>
        ) : (
          <button onClick={handleStop} className="stop-button">
            ⏸️ Arrêter
          </button>
        )}
      </div>

      {isRunning && (
        <div className="simulation-status">
          <div className="status-indicator">⚡ Simulation en cours...</div>
          <p className="status-text">
            La simulation affiche l'animation du relais sur le schéma de la piste.
          </p>
        </div>
      )}
    </div>
  )
}

export default SimulationControls
