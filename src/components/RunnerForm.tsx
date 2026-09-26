import { useState, useEffect } from 'react'
import { TrackConfig, RunnerData, TransmissionPoint, VideoData } from '../store/sessionStore'
import VideoCapture from './VideoCapture'
import './RunnerForm.css'

interface RunnerFormProps {
  runner: RunnerData
  runnerIndex: number
  onSave: (runner: RunnerData) => void
  onCancel: () => void
  trackConfig?: TrackConfig
  onTransmissionPointSelect?: (point: TransmissionPoint) => void
}

const RunnerForm = ({ runner, runnerIndex, onSave, onCancel }: RunnerFormProps) => {
  const [name, setName] = useState(runner.name || '')
  const [distance, setDistance] = useState(runner.distance || 0)
  const [time, setTime] = useState(runner.time || 0)
  const [donnerTime, setDonnerTime] = useState(runner.donnerTime || 0)
  const [receiverTime, setReceiverTime] = useState(runner.receiverTime || 0)
  const [transmissionZoneTime, setTransmissionZoneTime] = useState(runner.transmissionZoneTime || 0)
  const [averageSpeed, setAverageSpeed] = useState(runner.averageSpeed || 0)
  const [transmissionPoint, setTransmissionPoint] = useState<TransmissionPoint | undefined>(
    runner.transmissionPoint
  )
  
  // Synchroniser transmissionPoint avec runner si mis à jour depuis l'extérieur
  useEffect(() => {
    if (runner.transmissionPoint) {
      setTransmissionPoint(runner.transmissionPoint)
    }
  }, [runner.transmissionPoint])
  const [videos, setVideos] = useState<VideoData[]>(runner.videos || [])
  const [showVideoCapture, setShowVideoCapture] = useState<string | null>(null)

  useEffect(() => {
    // Calculer automatiquement la vitesse moyenne si distance et temps sont fournis
    if (distance > 0 && time > 0) {
      const speed = distance / time
      setAverageSpeed(speed)
    }
  }, [distance, time])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const runnerData: RunnerData = {
      runnerId: runner.runnerId,
      name: name.trim() || `Coureur ${runner.runnerId}`,
      distance,
      time,
      donnerTime: donnerTime > 0 ? donnerTime : undefined,
      receiverTime: receiverTime > 0 ? receiverTime : undefined,
      transmissionZoneTime: transmissionZoneTime > 0 ? transmissionZoneTime : undefined,
      averageSpeed: averageSpeed > 0 ? averageSpeed : undefined,
      transmissionPoint,
      videos: videos.length > 0 ? videos : undefined,
    }

    onSave(runnerData)
  }

  const handleVideoCapture = (type: 'donneur' | 'receveur' | 'transmission', videoUrl: string) => {
    const videoData: VideoData = {
      id: Date.now().toString(),
      type,
      url: videoUrl,
      timestamp: Date.now(),
      transmissionPoint: type === 'transmission' ? transmissionPoint : undefined,
    }
    setVideos([...videos, videoData])
    setShowVideoCapture(null)
  }

  const removeVideo = (videoId: string) => {
    setVideos((current) => {
      const video = current.find((item) => item.id === videoId)
      if (video?.url.startsWith('blob:')) URL.revokeObjectURL(video.url)
      return current.filter((item) => item.id !== videoId)
    })
  }

  return (
    <div className="runner-form-container">
      <form onSubmit={handleSubmit} className="runner-form">
        <div className="form-header">
          <h3>Données du Coureur {runner.runnerId}</h3>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor={`name-${runnerIndex}`}>Nom du coureur</label>
            <input
              type="text"
              id={`name-${runnerIndex}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Coureur ${runner.runnerId}`}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor={`distance-${runnerIndex}`}>Distance parcourue (mètres)</label>
            <input
              type="number"
              id={`distance-${runnerIndex}`}
              value={distance || ''}
              onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor={`time-${runnerIndex}`}>Temps total (secondes)</label>
            <input
              type="number"
              id={`time-${runnerIndex}`}
              value={time || ''}
              onChange={(e) => setTime(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor={`donner-time-${runnerIndex}`}>Temps du donneur (secondes)</label>
            <input
              type="number"
              id={`donner-time-${runnerIndex}`}
              value={donnerTime || ''}
              onChange={(e) => setDonnerTime(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label htmlFor={`receiver-time-${runnerIndex}`}>Temps du receveur (secondes)</label>
            <input
              type="number"
              id={`receiver-time-${runnerIndex}`}
              value={receiverTime || ''}
              onChange={(e) => setReceiverTime(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor={`zone-time-${runnerIndex}`}>
              Temps dans la zone de transmission (secondes)
            </label>
            <input
              type="number"
              id={`zone-time-${runnerIndex}`}
              value={transmissionZoneTime || ''}
              onChange={(e) => setTransmissionZoneTime(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label htmlFor={`speed-${runnerIndex}`}>Vitesse moyenne du témoin (m/s)</label>
            <input
              type="number"
              id={`speed-${runnerIndex}`}
              value={averageSpeed.toFixed(2) || ''}
              onChange={(e) => setAverageSpeed(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              readOnly
              className="readonly-input"
            />
            <small className="hint">Calculé automatiquement</small>
          </div>
        </div>

        <div className="video-section">
          <h4>Vidéos</h4>
          <div className="video-buttons">
            <button
              type="button"
              onClick={() => setShowVideoCapture('donneur')}
              className="video-button"
            >
              📹 Enregistrer départ donneur
            </button>
            <button
              type="button"
              onClick={() => setShowVideoCapture('receveur')}
              className="video-button"
            >
              📹 Enregistrer départ receveur
            </button>
            <button
              type="button"
              onClick={() => setShowVideoCapture('transmission')}
              className="video-button"
            >
              📹 Enregistrer transmission
            </button>
          </div>

          {videos.length > 0 && (
            <div className="videos-list">
              {videos.map((video) => (
                <div key={video.id} className="video-item">
                  <video src={video.url} controls className="video-preview" />
                  <div className="video-info">
                    <span className="video-type">{video.type}</span>
                    <button
                      type="button"
                      onClick={() => removeVideo(video.id)}
                      className="remove-video-button"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-button">
            Annuler
          </button>
          <button type="submit" className="save-button">
            Enregistrer
          </button>
        </div>
      </form>

      {showVideoCapture && (
        <VideoCapture
          type={showVideoCapture as 'donneur' | 'receveur' | 'transmission'}
          onCapture={(url) => handleVideoCapture(showVideoCapture as any, url)}
          onCancel={() => setShowVideoCapture(null)}
        />
      )}
    </div>
  )
}

export default RunnerForm
