import { memo, useCallback, useEffect, useRef, useState, type MouseEvent, type TouchEvent } from 'react'
import { TrackConfig, RunnerData, TransmissionPoint } from '../store/sessionStore'
import { RelaySimulation, TrackMark, zoneAtDistance } from '../lib/trackMath'
import './TrackCanvas.css'

function loopPoint(
  distancePx: number,
  radius: number,
  centerX: number,
  centerY: number,
  straightPx: number,
) {
  const loop = 2 * straightPx + 2 * Math.PI * radius
  let d = distancePx % loop
  if (d < 0) d += loop
  if (d < straightPx) {
    return { x: centerX - straightPx / 2 + d, y: centerY - radius }
  }
  if (d < straightPx + Math.PI * radius) {
    const theta = -Math.PI / 2 + (d - straightPx) / radius
    return {
      x: centerX + straightPx / 2 + Math.cos(theta) * radius,
      y: centerY + Math.sin(theta) * radius,
    }
  }
  if (d < 2 * straightPx + Math.PI * radius) {
    const along = d - (straightPx + Math.PI * radius)
    return { x: centerX + straightPx / 2 - along, y: centerY + radius }
  }
  const theta = Math.PI / 2 + (d - (2 * straightPx + Math.PI * radius)) / radius
  return {
    x: centerX - straightPx / 2 + Math.cos(theta) * radius,
    y: centerY + Math.sin(theta) * radius,
  }
}

function travelPx(meters: number, scale: number, lengthPx: number, reversed: boolean, wrap: boolean) {
  let px = meters * scale
  if (wrap) px = ((px % lengthPx) + lengthPx) % lengthPx
  else px = Math.max(0, Math.min(lengthPx, px))
  if (!reversed) return px
  const flipped = lengthPx - px
  return wrap ? ((flipped % lengthPx) + lengthPx) % lengthPx : flipped
}

interface TrackCanvasProps {
  trackConfig: TrackConfig
  runners: RunnerData[]
  onTransmissionPointClick?: (point: TransmissionPoint, runnerIndex: number) => void
  isSimulating?: boolean
  simulationSpeed?: number
  restrictToZones?: boolean
  onOutsideZone?: () => void
  marks?: TrackMark[]
  onMarkClick?: (id: string) => void
  relaySimulation?: RelaySimulation | null
}

const TrackCanvas = ({
  trackConfig,
  runners,
  onTransmissionPointClick,
  isSimulating = false,
  simulationSpeed = 1,
  restrictToZones = false,
  onOutsideZone,
  marks = [],
  onMarkClick,
  relaySimulation = null,
}: TrackCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const staticLayerRef = useRef<HTMLCanvasElement | null>(null)
  const drawRef = useRef<(ctx: CanvasRenderingContext2D, layer: 'static' | 'dynamic') => void>(() => {})
  const paintRef = useRef<() => void>(() => {})
  const runnersRef = useRef(runners)
  const marksRef = useRef(marks)
  const relayRef = useRef(relaySimulation)
  const simRef = useRef({ elapsed: 0, speed: 1, active: false })
  const [scale, setScale] = useState(1)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [reversed, setReversed] = useState(false)

  runnersRef.current = runners
  marksRef.current = marks
  relayRef.current = relaySimulation
  simRef.current.speed = simulationSpeed

  const straightLength = trackConfig.straightLength
  const curveRadius = trackConfig.curveRadius
  const trackWidth = trackConfig.trackWidth
  const totalWidth = trackConfig.lanes * trackConfig.trackWidth
  const trackType = trackConfig.trackType || 'oval'

  const canvasWidthNeeded = trackType === 'straight' ? straightLength : straightLength + curveRadius * 2
  const canvasHeightNeeded = trackType === 'straight' ? totalWidth : curveRadius * 2 + totalWidth * 2

  const drawTrack = useCallback(
    (ctx: CanvasRenderingContext2D, layer: 'static' | 'dynamic') => {
      if (layer === 'static') {
        ctx.clearRect(0, 0, dimensions.width, dimensions.height)
      }

      const centerX = dimensions.width / 2
      const centerY = dimensions.height / 2
      const scaledStraightLength = straightLength * scale
      const scaledTrackWidth = trackWidth * scale
      const totalScaledHeight = trackConfig.lanes * scaledTrackWidth

      const drawPill = (x: number, y: number, text: string, fill: string) => {
        ctx.save()
        ctx.font = '700 12px Arial'
        const width = ctx.measureText(text).width + 20
        const height = 22
        ctx.beginPath()
        ctx.roundRect(x - width / 2, y - height / 2, width, height, 11)
        ctx.fillStyle = fill
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, x, y + 0.5)
        ctx.restore()
      }

      const drawChevron = (from: { x: number; y: number }, to: { x: number; y: number }) => {
        const angle = Math.atan2(to.y - from.y, to.x - from.x)
        ctx.save()
        ctx.translate(from.x, from.y)
        ctx.rotate(angle)
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(-7, -4)
        ctx.lineTo(1, 0)
        ctx.lineTo(-7, 4)
        ctx.stroke()
        ctx.restore()
      }

      const drawMarker = (x: number, y: number, label: string) => {
        ctx.save()
        ctx.beginPath()
        ctx.fillStyle = '#1565c0'
        ctx.arc(x, y, 9, 0, Math.PI * 2)
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = '#fff'
        ctx.stroke()
        ctx.fillStyle = '#111'
        ctx.font = 'bold 12px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(label, x, y - 12)
        ctx.restore()
      }

      const getAnimatedRunner = () => {
        if (!simRef.current.active) return null
        const active = runners.filter((runner) => runner.time > 0 && runner.distance > 0)
        if (active.length === 0) return null
        const total = active.reduce((sum, runner) => sum + runner.time, 0)
        let elapsed = simRef.current.elapsed % total
        for (const runner of active) {
          if (elapsed <= runner.time) {
            const lane = runner.transmissionPoint?.lane ?? ((runner.runnerId - 1) % trackConfig.lanes) + 1
            return {
              runner,
              distance: runner.distance * (elapsed / runner.time),
              lane: Math.max(1, Math.min(trackConfig.lanes, lane)),
            }
          }
          elapsed -= runner.time
        }
        return null
      }

      const drawFigure = (x: number, y: number, color: string, label: string) => {
        ctx.save()
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y - 11, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = '#111'
        ctx.font = 'bold 11px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(label, x, y - 20)
        ctx.restore()
      }

      const drawRelayAndMarks = (at: (distance: number, lane: number) => { x: number; y: number }) => {
        marksRef.current.forEach((mark) => {
          const pos = at(mark.point.distance, mark.point.lane)
          ctx.beginPath()
          ctx.fillStyle = mark.id === 'draft' ? '#ff6b35' : '#212121'
          ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.fillStyle = '#111'
          ctx.font = 'bold 11px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(mark.hasVideo ? 'Vidéo' : mark.label, pos.x, pos.y - 10)
        })

        const relay = relayRef.current
        if (!simRef.current.active || !relay) return
        const elapsed = simRef.current.elapsed
        const donnerProgress = relay.donnerTime > 0 ? Math.min(1, elapsed / relay.donnerTime) : 1
        const donnerPos = at(relay.donnerDistance * donnerProgress, relay.lane)
        drawFigure(donnerPos.x, donnerPos.y, '#ff6b35', relay.donnerName || 'Donneur')

        if (elapsed < relay.receiverStartAt) return
        const local = elapsed - relay.receiverStartAt
        const exchange = Math.max(0, relay.donnerTime - relay.receiverStartAt)
        let distance = relay.transmissionDistance
        if (exchange > 0 && local <= exchange) {
          distance = relay.zoneStart + (relay.transmissionDistance - relay.zoneStart) * (local / exchange)
        } else {
          const after = Math.max(0, local - exchange)
          const remain = Math.max(0.01, relay.receiverTime - exchange)
          const progress = Math.min(1, after / remain)
          distance = relay.transmissionDistance + (relay.receiverEndDistance - relay.transmissionDistance) * progress
        }
        const receiverPos = at(distance, relay.lane)
        drawFigure(receiverPos.x, receiverPos.y, '#1565c0', relay.receiverName || 'Receveur')
      }

      if (trackType === 'straight') {
        const startX = centerX - scaledStraightLength / 2
        const startY = centerY - totalScaledHeight / 2

        const xAt = (meters: number) => startX + travelPx(meters, scale, scaledStraightLength, reversed, false)
        const span = (from: number, length: number) => {
          const left = Math.min(xAt(from), xAt(from + length))
          return { left, width: Math.abs(xAt(from + length) - xAt(from)) }
        }

        if (layer !== 'dynamic') {
          ctx.fillStyle = '#f6f3ee'
          ctx.fillRect(0, 0, dimensions.width, dimensions.height)

          ctx.save()
          ctx.shadowColor = 'rgba(33, 33, 33, 0.16)'
          ctx.shadowBlur = 18
          ctx.shadowOffsetY = 8
          const surface = ctx.createLinearGradient(startX, startY, startX, startY + totalScaledHeight)
          surface.addColorStop(0, '#e39a7c')
          surface.addColorStop(0.5, '#d4785a')
          surface.addColorStop(1, '#c46245')
          ctx.fillStyle = surface
          ctx.beginPath()
          ctx.roundRect(startX - 8, startY, scaledStraightLength + 16, totalScaledHeight, 10)
          ctx.fill()
          ctx.restore()

          ctx.strokeStyle = 'rgba(255,255,255,0.92)'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          for (let i = 0; i <= trackConfig.lanes; i++) {
            const y = startY + i * scaledTrackWidth
            ctx.moveTo(startX, y)
            ctx.lineTo(startX + scaledStraightLength, y)
          }
          ctx.stroke()

          ctx.font = '700 13px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          const numberX = reversed ? startX + scaledStraightLength + 26 : startX - 26
          for (let i = 0; i < trackConfig.lanes; i++) {
            const y = startY + (i + 0.5) * scaledTrackWidth
            ctx.beginPath()
            ctx.fillStyle = '#212121'
            ctx.arc(numberX, y, 11, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#fff'
            ctx.fillText(`${i + 1}`, numberX, y + 0.5)
          }

          const paintLine = (meters: number, color: string) => {
            const x = xAt(meters)
            ctx.strokeStyle = color
            ctx.lineWidth = 4
            ctx.beginPath()
            ctx.moveTo(x, startY)
            ctx.lineTo(x, startY + totalScaledHeight)
            ctx.stroke()
          }
          paintLine(0, '#ffffff')
          paintLine(straightLength, '#212121')
          drawPill(xAt(0), startY - 20, 'Départ', '#2e7d46')
          drawPill(xAt(straightLength), startY - 20, 'Arrivée', '#212121')

          for (const fraction of [0.28, 0.5, 0.72]) {
            const meters = straightLength * fraction
            drawChevron(
              { x: xAt(meters), y: startY + 0.5 * scaledTrackWidth },
              { x: xAt(meters + straightLength * 0.04), y: startY + 0.5 * scaledTrackWidth },
            )
          }

          trackConfig.transmissionZones.forEach((zone, index) => {
            for (let lane = 0; lane < trackConfig.lanes; lane++) {
              if (zone.lane !== undefined && zone.lane !== lane + 1) continue
              const y = startY + lane * scaledTrackWidth

              if (zone.subZones && zone.subZones.length > 0) {
                zone.subZones.forEach((sub) => {
                  const box = span(zone.start + sub.startOffset, sub.length)
                  ctx.fillStyle = sub.color
                    ? sub.color.replace(')', ', 0.35)').replace('rgb', 'rgba')
                    : 'rgba(255, 107, 53, 0.35)'
                  ctx.fillRect(box.left, y, box.width, scaledTrackWidth)
                })
              } else {
                const box = span(zone.start, zone.length)
                ctx.fillStyle = 'rgba(255, 107, 53, 0.38)'
                ctx.fillRect(box.left, y, box.width, scaledTrackWidth)
                ctx.fillStyle = '#fff'
                ctx.font = '700 12px Arial'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(`Z${index + 1}`, box.left + box.width / 2, y + scaledTrackWidth / 2)
              }
            }
          })

          trackConfig.speedPlots?.forEach((plot, index) => {
            if (plot.distance < 0 || plot.distance > straightLength) return
            const x = xAt(plot.distance)
            ctx.save()
            ctx.strokeStyle = '#1565c0'
            ctx.setLineDash([5, 4])
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(x, startY)
            ctx.lineTo(x, startY + totalScaledHeight)
            ctx.stroke()
            ctx.fillStyle = '#1565c0'
            ctx.font = 'bold 11px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
            ctx.fillText(plot.label, x, startY - 28 - (index % 3) * 13)
            ctx.restore()
          })
        }

        if (layer !== 'static') {
          runners.forEach((runner) => {
            if (!runner.transmissionPoint) return
            const laneIndex = runner.transmissionPoint.lane - 1
            const y = startY + (laneIndex + 0.5) * scaledTrackWidth
            const x = xAt(runner.transmissionPoint.distance)

            ctx.beginPath()
            ctx.fillStyle = '#fff'
            ctx.arc(x, y, 6, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = '#000'
            ctx.stroke()
            ctx.fillStyle = '#000'
            ctx.font = 'bold 12px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(`C${runner.runnerId}`, x, y - 15)
            if (runner.videos && runner.videos.length > 0) {
              ctx.fillText('📹', x + 15, y)
            }
          })

          const animated = relayRef.current && simRef.current.active ? null : getAnimatedRunner()
          if (animated) {
            const y = startY + (animated.lane - 0.5) * scaledTrackWidth
            const x = xAt(Math.max(0, Math.min(straightLength, animated.distance)))
            drawMarker(x, y, `C${animated.runner.runnerId}`)
          }
          drawRelayAndMarks((distance, lane) => ({
            x: xAt(distance),
            y: startY + (lane - 0.5) * scaledTrackWidth,
          }))
        }
      } else {
        const scaledCurveRadius = curveRadius * scale
        const innerRadius = scaledCurveRadius
        const outerRadius = scaledCurveRadius + trackConfig.lanes * scaledTrackWidth

        const traceOval = (radius: number) => {
          ctx.beginPath()
          ctx.arc(centerX + scaledStraightLength / 2, centerY, radius, -Math.PI / 2, Math.PI / 2, false)
          ctx.arc(centerX - scaledStraightLength / 2, centerY, radius, Math.PI / 2, -Math.PI / 2, false)
          ctx.closePath()
        }

        const atRadius = (meters: number, radius: number) => {
          const loop = 2 * scaledStraightLength + 2 * Math.PI * radius
          return loopPoint(
            travelPx(meters, scale, loop, reversed, true),
            radius,
            centerX,
            centerY,
            scaledStraightLength,
          )
        }

        if (layer !== 'dynamic') {
          ctx.fillStyle = '#f6f3ee'
          ctx.fillRect(0, 0, dimensions.width, dimensions.height)

          ctx.save()
          ctx.shadowColor = 'rgba(33, 33, 33, 0.18)'
          ctx.shadowBlur = 22
          ctx.shadowOffsetY = 10
          const clay = ctx.createLinearGradient(0, centerY - outerRadius, 0, centerY + outerRadius)
          clay.addColorStop(0, '#e7a188')
          clay.addColorStop(0.45, '#d4785a')
          clay.addColorStop(1, '#c15a3e')
          ctx.fillStyle = clay
          traceOval(outerRadius)
          ctx.fill()
          ctx.restore()

          const grass = ctx.createRadialGradient(centerX, centerY, innerRadius * 0.15, centerX, centerY, innerRadius)
          grass.addColorStop(0, '#5cbc78')
          grass.addColorStop(1, '#2f7d49')
          ctx.fillStyle = grass
          traceOval(innerRadius)
          ctx.fill()

          ctx.strokeStyle = 'rgba(255,255,255,0.95)'
          ctx.lineWidth = 2.5
          traceOval(outerRadius)
          ctx.stroke()
          ctx.lineWidth = 2
          traceOval(innerRadius)
          ctx.stroke()

          ctx.strokeStyle = 'rgba(255,255,255,0.8)'
          ctx.lineWidth = 1.25
          for (let i = 1; i < trackConfig.lanes; i++) {
            traceOval(innerRadius + i * scaledTrackWidth)
            ctx.stroke()
          }

          trackConfig.transmissionZones.forEach((zone, index) => {
            ctx.lineWidth = Math.max(4, scaledTrackWidth * 0.72)
            ctx.lineCap = 'butt'

            for (let lane = 0; lane < trackConfig.lanes; lane++) {
              if (zone.lane !== undefined && zone.lane !== lane + 1) continue
              const laneCenterRadius = innerRadius + (lane + 0.5) * scaledTrackWidth

              const drawSegment = (startMeters: number, lengthMeters: number, color: string) => {
                ctx.save()
                ctx.strokeStyle = color
                ctx.globalAlpha = 0.55
                ctx.beginPath()
                const steps = 16
                for (let s = 0; s <= steps; s++) {
                  const pos = atRadius(startMeters + (s * lengthMeters) / steps, laneCenterRadius)
                  if (s === 0) ctx.moveTo(pos.x, pos.y)
                  else ctx.lineTo(pos.x, pos.y)
                }
                ctx.stroke()
                ctx.restore()
              }

              if (zone.subZones && zone.subZones.length > 0) {
                zone.subZones.forEach((sub) => {
                  drawSegment(zone.start + sub.startOffset, sub.length, sub.color || '#ff6b35')
                })
              } else {
                drawSegment(zone.start, zone.length, '#ff6b35')
              }

              const midPos = atRadius(zone.start + zone.length / 2, laneCenterRadius)
              ctx.save()
              ctx.fillStyle = '#fff'
              ctx.font = '700 11px Arial'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(`Z${index + 1}`, midPos.x, midPos.y)
              ctx.restore()
            }
          })

          const plotRadius = innerRadius + 0.5 * scaledTrackWidth
          const laneLap = 2 * straightLength + 2 * Math.PI * (curveRadius + 0.5 * trackWidth)
          trackConfig.speedPlots?.forEach((plot, index) => {
            if (plot.distance < 0 || plot.distance > laneLap) return
            const pos = atRadius(plot.distance, plotRadius)
            ctx.save()
            ctx.fillStyle = '#1565c0'
            ctx.beginPath()
            ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = '#fff'
            ctx.lineWidth = 1.5
            ctx.stroke()
            ctx.fillStyle = '#1565c0'
            ctx.font = 'bold 11px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(plot.label, pos.x, pos.y - 16 - (index % 4) * 13)
            ctx.restore()
          })

          const lineTop = atRadius(0, outerRadius)
          const lineBottom = atRadius(0, innerRadius)
          ctx.beginPath()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 4
          ctx.moveTo(lineBottom.x, lineBottom.y)
          ctx.lineTo(lineTop.x, lineTop.y)
          ctx.stroke()
          ctx.beginPath()
          ctx.strokeStyle = '#212121'
          ctx.lineWidth = 1.5
          ctx.moveTo(lineBottom.x, lineBottom.y)
          ctx.lineTo(lineTop.x, lineTop.y)
          ctx.stroke()

          const labelShift = reversed ? -34 : 34
          drawPill(lineTop.x + labelShift, lineTop.y - 18, 'Départ', '#2e7d46')
          drawPill(lineTop.x - labelShift, lineTop.y - 18, 'Arrivée', '#212121')

          for (const fraction of [0.12, 0.37, 0.62, 0.86]) {
            const meters = laneLap * fraction
            drawChevron(atRadius(meters, plotRadius), atRadius(meters + 3, plotRadius))
          }
        }

        if (layer !== 'static') {
          runners.forEach((runner) => {
            if (!runner.transmissionPoint) return
            const laneCenterRadius = innerRadius + (runner.transmissionPoint.lane - 0.5) * scaledTrackWidth
            const pos = atRadius(runner.transmissionPoint.distance, laneCenterRadius)

            ctx.beginPath()
            ctx.fillStyle = '#ff6b35'
            ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
            ctx.fillStyle = '#333'
            ctx.font = 'bold 12px Arial'
            ctx.fillText(`C${runner.runnerId}`, pos.x + 10, pos.y - 10)
            if (runner.videos && runner.videos.length > 0) {
              ctx.fillText('📹', pos.x - 15, pos.y + 15)
            }
          })

          const animated = relayRef.current && simRef.current.active ? null : getAnimatedRunner()
          if (animated) {
            const laneCenterRadius = innerRadius + (animated.lane - 0.5) * scaledTrackWidth
            const pos = atRadius(animated.distance, laneCenterRadius)
            drawMarker(pos.x, pos.y, `C${animated.runner.runnerId}`)
          }
          drawRelayAndMarks((distance, lane) =>
            atRadius(distance, innerRadius + (lane - 0.5) * scaledTrackWidth)
          )
        }
      }
    },
    [trackConfig, runners, dimensions, scale, straightLength, curveRadius, trackWidth, trackType, reversed]
  )

  drawRef.current = drawTrack

  paintRef.current = () => {
    const canvas = canvasRef.current
    const buffer = staticLayerRef.current
    if (!canvas || !buffer) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(buffer, 0, 0)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawRef.current(ctx, 'dynamic')
  }

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    let frame = 0

    const update = () => {
      const containerWidth = element.clientWidth
      const containerHeight = element.clientHeight
      if (containerWidth === 0 || containerHeight === 0) return

      let newScale =
        trackType === 'straight'
          ? Math.min((containerWidth - 100) / canvasWidthNeeded, (containerHeight - 100) / canvasHeightNeeded)
          : Math.min(containerWidth / (canvasWidthNeeded + 40), containerHeight / (canvasHeightNeeded + 40))
      if (!Number.isFinite(newScale) || newScale <= 0) newScale = 1

      setDimensions((prev) =>
        prev.width === containerWidth && prev.height === containerHeight
          ? prev
          : { width: containerWidth, height: containerHeight }
      )
      setScale((prev) => (Math.abs(prev - newScale) < 0.001 ? prev : newScale))
    }

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    })
    observer.observe(element)
    update()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [trackType, canvasWidthNeeded, canvasHeightNeeded])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const nextWidth = Math.round(dimensions.width * dpr)
    const nextHeight = Math.round(dimensions.height * dpr)
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth
      canvas.height = nextHeight
    }

    let buffer = staticLayerRef.current
    if (!buffer) {
      buffer = document.createElement('canvas')
      staticLayerRef.current = buffer
    }
    buffer.width = nextWidth
    buffer.height = nextHeight
    const bufferContext = buffer.getContext('2d')
    if (!bufferContext) return
    bufferContext.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawRef.current(bufferContext, 'static')
    paintRef.current()
  }, [dimensions, scale, trackConfig, reversed])

  useEffect(() => {
    if (simRef.current.active) return
    paintRef.current()
  }, [runners, marks, relaySimulation])

  useEffect(() => {
    if (!isSimulating) {
      simRef.current.elapsed = 0
      simRef.current.active = false
      paintRef.current()
      return
    }

    const simulation = simRef.current
    const relay = relayRef.current
    const canRun = relay
      ? relay.donnerTime > 0 && relay.receiverTime > 0
      : runnersRef.current.some((runner) => runner.time > 0 && runner.distance > 0)
    if (!canRun) return

    simulation.elapsed = 0
    simulation.active = true
    let frame = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      const currentRelay = relayRef.current
      const total = currentRelay
        ? Math.max(currentRelay.donnerTime, currentRelay.receiverStartAt + currentRelay.receiverTime)
        : runnersRef.current
            .filter((runner) => runner.time > 0 && runner.distance > 0)
            .reduce((sum, runner) => sum + runner.time, 0)
      if (total > 0) {
        simulation.elapsed += dt * simulation.speed
        if (simulation.elapsed >= total) simulation.elapsed %= total
        paintRef.current()
      }
      last = now
      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      simulation.active = false
    }
  }, [isSimulating, relaySimulation])

  const getPointFromCoordinates = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return null

    const rect = canvasRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const centerX = dimensions.width / 2
    const centerY = dimensions.height / 2
    const scaledStraightLength = straightLength * scale
    const scaledTrackWidth = trackWidth * scale

    if (trackType === 'straight') {
      const totalScaledHeight = trackConfig.lanes * scaledTrackWidth
      const startX = centerX - scaledStraightLength / 2
      const startY = centerY - totalScaledHeight / 2
      const relativeY = y - startY
      if (relativeY < 0 || relativeY > totalScaledHeight) return null

      const lane = Math.floor(relativeY / scaledTrackWidth) + 1
      const visual = (x - startX) / scale
      const distance = reversed ? straightLength - visual : visual
      if (distance < 0 || distance > straightLength) return null

      return {
        x,
        y,
        distance,
        lane: Math.max(1, Math.min(trackConfig.lanes, lane)),
      }
    }

    const innerRadius = curveRadius * scale
    let best: { x: number; y: number; distance: number; lane: number } | null = null
    let bestDistance = 36
    for (let lane = 1; lane <= trackConfig.lanes; lane++) {
      const radius = innerRadius + (lane - 0.5) * scaledTrackWidth
      const loop = 2 * scaledStraightLength + 2 * Math.PI * radius
      const steps = 140
      for (let step = 0; step <= steps; step++) {
        const along = (step / steps) * loop
        const pos = loopPoint(along, radius, centerX, centerY, scaledStraightLength)
        const gap = Math.hypot(pos.x - x, pos.y - y)
        if (gap < bestDistance) {
          const visualMeters = along / scale
          const loopMeters = loop / scale
          const distance = reversed ? (loopMeters - visualMeters) % loopMeters : visualMeters
          bestDistance = gap
          best = { x: pos.x, y: pos.y, distance, lane }
        }
      }
    }
    return best
  }

  const locate = (distance: number, lane: number) => {
    const centerX = dimensions.width / 2
    const centerY = dimensions.height / 2
    const scaledStraightLength = straightLength * scale
    const scaledTrackWidth = trackWidth * scale
    if (trackType === 'straight') {
      const totalScaledHeight = trackConfig.lanes * scaledTrackWidth
      const startX = centerX - scaledStraightLength / 2
      const startY = centerY - totalScaledHeight / 2
      return {
        x: startX + travelPx(distance, scale, scaledStraightLength, reversed, false),
        y: startY + (lane - 0.5) * scaledTrackWidth,
      }
    }
    const radius = curveRadius * scale + (lane - 0.5) * scaledTrackWidth
    const loopLength = 2 * scaledStraightLength + 2 * Math.PI * radius
    return loopPoint(
      travelPx(distance, scale, loopLength, reversed, true),
      radius,
      centerX,
      centerY,
      scaledStraightLength,
    )
  }

  const assignPoint = (clientX: number, clientY: number) => {
    const point = getPointFromCoordinates(clientX, clientY)
    if (!point) return

    const hit = marks.find((mark) => {
      const pos = locate(mark.point.distance, mark.point.lane)
      return Math.hypot(pos.x - point.x, pos.y - point.y) < 18
    })
    if (hit && onMarkClick) {
      onMarkClick(hit.id)
      return
    }

    if (!onTransmissionPointClick || isSimulating) return
    if (restrictToZones && !zoneAtDistance(trackConfig, point.distance, point.lane)) {
      onOutsideZone?.()
      return
    }

    const runnerIndex = runners.findIndex((runner) => !runner.transmissionPoint)
    if (runnerIndex >= 0) onTransmissionPointClick(point, runnerIndex)
    else onTransmissionPointClick(point, runners.length > 0 ? runners.length - 1 : 0)
  }

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    assignPoint(event.clientX, event.clientY)
  }

  const handleCanvasTouch = (event: TouchEvent<HTMLCanvasElement>) => {
    if (!onTransmissionPointClick && !onMarkClick) return
    event.preventDefault()
    const touch = event.changedTouches[0]
    if (!touch) return
    assignPoint(touch.clientX, touch.clientY)
  }

  return (
    <div ref={containerRef} className="track-canvas-container">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onTouchEnd={handleCanvasTouch}
        className="track-canvas"
        style={{ cursor: onTransmissionPointClick && !isSimulating ? 'crosshair' : onMarkClick ? 'pointer' : 'default', touchAction: 'none' }}
      />
      {isSimulating && (
        <div className="simulation-overlay">
          <div className="simulation-indicator">Simulation en cours</div>
        </div>
      )}
      <button type="button" className="direction-button" onClick={() => setReversed((current) => !current)}>
        Inverser le sens
      </button>
    </div>
  )
}

export default memo(TrackCanvas)
