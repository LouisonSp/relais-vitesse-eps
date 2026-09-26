import { useCallback, useEffect, useRef, useState } from 'react'
import './VideoCapture.css'

interface VideoCaptureProps {
  type: 'donneur' | 'receveur' | 'transmission'
  onCapture: (videoUrl: string) => void
  onCaptureBlob?: (blob: Blob) => void
  onCancel: () => void
}

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
]

const pickMimeType = () => {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined
  }
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type))
}

const VideoCapture = ({ type, onCapture, onCaptureBlob, onCancel }: VideoCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const previewUrlRef = useRef<string | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const startCameraRef = useRef<() => Promise<void>>(async () => {})
  const aliveRef = useRef(true)
  const [recording, setRecording] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true

    const startCamera = async () => {
      stopCamera()
      try {
        let mediaStream: MediaStream
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280, max: 1280 },
              height: { ideal: 720, max: 720 },
            },
            audio: true,
          })
        } catch {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 1280, max: 1280 },
              height: { ideal: 720, max: 720 },
            },
            audio: false,
          })
        }

        if (!aliveRef.current) {
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = mediaStream
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
        setError(null)
      } catch (err) {
        if (aliveRef.current) {
          setError("Impossible d'accéder à la caméra. Vérifiez les permissions.")
        }
        console.error('Erreur caméra:', err)
      }
    }

    startCameraRef.current = startCamera
    void startCamera()

    return () => {
      aliveRef.current = false
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.stop()
      }
      stopCamera()
      revokePreview()
    }
  }, [revokePreview, stopCamera])

  const startRecording = () => {
    const stream = streamRef.current
    if (!stream) return

    try {
      const mimeType = pickMimeType()
      const options: MediaRecorderOptions = { videoBitsPerSecond: 1_500_000 }
      if (mimeType) options.mimeType = mimeType

      let mediaRecorder: MediaRecorder
      try {
        mediaRecorder = new MediaRecorder(stream, options)
      } catch {
        mediaRecorder = new MediaRecorder(stream)
      }

      chunksRef.current = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      mediaRecorder.onstop = () => {
        if (!aliveRef.current) return
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'video/webm' })
        blobRef.current = blob
        revokePreview()
        const url = URL.createObjectURL(blob)
        previewUrlRef.current = url
        setPreviewUrl(url)
        stopCamera()
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setRecording(true)
      setError(null)
    } catch (err) {
      setError("Erreur lors du démarrage de l'enregistrement")
      console.error('Erreur enregistrement:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const handleCancel = () => {
    if (recording) stopRecording()
    stopCamera()
    revokePreview()
    onCancel()
  }

  const handleSave = () => {
    const blob = blobRef.current
    if (onCaptureBlob && blob) {
      onCaptureBlob(blob)
      blobRef.current = null
      revokePreview()
      setPreviewUrl(null)
      return
    }
    const url = previewUrlRef.current
    if (!url) return
    previewUrlRef.current = null
    onCapture(url)
  }

  const handleRetry = () => {
    revokePreview()
    blobRef.current = null
    setPreviewUrl(null)
    setRecording(false)
    void startCameraRef.current()
  }

  const getTypeLabel = () => {
    switch (type) {
      case 'donneur':
        return 'Départ du donneur'
      case 'receveur':
        return 'Départ du receveur'
      case 'transmission':
        return 'Transmission'
      default:
        return 'Enregistrement vidéo'
    }
  }

  return (
    <div className="video-capture-overlay">
      <div className="video-capture-modal">
        <div className="video-capture-header">
          <h3>📹 {getTypeLabel()}</h3>
          <button onClick={handleCancel} className="close-button">
            ✕
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="video-preview-container">
          {!previewUrl ? (
            <video ref={videoRef} autoPlay muted playsInline className="video-preview" />
          ) : (
            <video src={previewUrl} controls className="video-preview" />
          )}
        </div>

        <div className="video-capture-actions">
          {!recording && !previewUrl && (
            <button onClick={startRecording} className="record-button">
              ● Enregistrer
            </button>
          )}

          {recording && (
            <button onClick={stopRecording} className="stop-button">
              ■ Arrêter
            </button>
          )}

          {previewUrl && (
            <>
              <button onClick={handleRetry} className="retry-button">
                ↻ Réessayer
              </button>
              <button onClick={handleSave} className="save-button">
                ✓ Enregistrer
              </button>
            </>
          )}

          <button onClick={handleCancel} className="cancel-button">
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

export default VideoCapture
