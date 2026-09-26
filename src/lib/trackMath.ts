import { RelayAttempt, SpeedPlot, TrackConfig, TransmissionPoint } from '../store/sessionStore'

export const REFERENCE_RUN_SECONDS = 12

export interface TrackMark {
  id: string
  point: TransmissionPoint
  label: string
  hasVideo?: boolean
}

export interface RelaySimulation {
  donnerName: string
  receiverName: string
  lane: number
  donnerDistance: number
  donnerTime: number
  receiverStartAt: number
  zoneStart: number
  transmissionDistance: number
  receiverEndDistance: number
  receiverTime: number
}

export function trackLengthMeters(config: TrackConfig, lane = 1): number {
  if ((config.trackType || 'oval') === 'straight') return config.straightLength
  const radius = config.curveRadius + (lane - 0.5) * config.trackWidth
  return 2 * config.straightLength + 2 * Math.PI * radius
}

export function plotDistanceFromSpeed(speedKmh: number, seconds = REFERENCE_RUN_SECONDS): number {
  return Math.round((speedKmh / 3.6) * seconds * 100) / 100
}

export function zoneAtDistance(config: TrackConfig, distance: number, lane: number) {
  return config.transmissionZones.find((zone) => {
    if (zone.lane !== undefined && zone.lane !== lane) return false
    const end = zone.start + zone.length
    return distance >= zone.start - 0.15 && distance <= end + 0.15
  })
}

export function zoneFitsOnTrack(config: TrackConfig, start: number, length: number): boolean {
  const total = trackLengthMeters(config)
  return start >= 0 && length > 0 && start + length <= total + 0.05
}

export interface RelayClock {
  donnerTime: number
  receiverTime: number
  exchangeTime: number
}

export interface RelayMeasures {
  donnerDistance: number
  receiverDistance: number
  arrivalDistance: number
  relayTime: number
  donnerSpeed: number
  receiverSpeed: number
  batonSpeed: number
  zoneStart: number
}

export function measureRelay(
  config: TrackConfig,
  point: TransmissionPoint,
  clock: RelayClock,
  plot?: SpeedPlot
): RelayMeasures {
  const total = trackLengthMeters(config, point.lane)
  const arrivalDistance = plot?.distance ?? total
  const donnerDistance = Math.max(0, point.distance)
  const receiverDistance = Math.max(0, arrivalDistance - donnerDistance)
  const relayTime = Math.max(0, clock.donnerTime + clock.receiverTime - clock.exchangeTime)
  const zone = zoneAtDistance(config, point.distance, point.lane)
  return {
    donnerDistance,
    receiverDistance,
    arrivalDistance,
    relayTime,
    donnerSpeed: clock.donnerTime > 0 ? donnerDistance / clock.donnerTime : 0,
    receiverSpeed: clock.receiverTime > 0 ? receiverDistance / clock.receiverTime : 0,
    batonSpeed: relayTime > 0 ? arrivalDistance / relayTime : 0,
    zoneStart: zone?.start ?? Math.max(0, donnerDistance - 10),
  }
}

export function toKmh(metersPerSecond: number): number {
  return metersPerSecond * 3.6
}

export function simulationFromAttempt(config: TrackConfig, attempt: RelayAttempt): RelaySimulation {
  const zone = zoneAtDistance(config, attempt.transmissionPoint.distance, attempt.transmissionPoint.lane)
  return {
    donnerName: attempt.donnerName,
    receiverName: attempt.receiverName,
    lane: attempt.transmissionPoint.lane,
    donnerDistance: attempt.donnerDistance,
    donnerTime: attempt.donnerTime,
    receiverStartAt: Math.max(0, attempt.donnerTime - attempt.exchangeTime),
    zoneStart: zone?.start ?? Math.max(0, attempt.transmissionPoint.distance - 5),
    transmissionDistance: attempt.transmissionPoint.distance,
    receiverEndDistance: attempt.arrivalDistance,
    receiverTime: attempt.receiverTime,
  }
}
