import { defaultColorTokens } from './colorTokens'
import { buildingCategoryColor, getMapCategory } from './buildingCategories'
import type { CollectionSnapshot } from './collectionState'
import coastlineData from './data/share-record-coastline-sla.json'

export const SHARE_RECORD_WIDTH = 1080
export const SHARE_RECORD_HEIGHT = 1350

export type ShareRecordBuilding = Readonly<{
  id: string
  name: string
  buildingType: string
  coordinates: readonly [number, number]
}>

export type ShareRecordFontData = Readonly<{
  regular: string
  medium: string
  semibold: string
}>

type Point = { x: number; y: number }
type MapFrame = { x: number; y: number; width: number; height: number }
type CoastlineGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }

const coastlineFeatures = coastlineData.features as Array<{
  properties: { name: string; sourceObjectId: number }
  geometry: CoastlineGeometry
}>

const bounds = {
  minLng: 103.59,
  maxLng: 104.06,
  minLat: 1.195,
  maxLat: 1.485,
}

const mapFrame = { x: 32, y: 500, width: 1016, height: 700 }

const escapeXml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const projectToFrame = ([lng, lat]: readonly [number, number], frame: MapFrame): Point => {
  const geographicWidth = bounds.maxLng - bounds.minLng
  const geographicHeight = bounds.maxLat - bounds.minLat
  const scale = Math.min(frame.width / geographicWidth, frame.height / geographicHeight)
  const projectedWidth = geographicWidth * scale
  const projectedHeight = geographicHeight * scale
  const offsetX = frame.x + (frame.width - projectedWidth) / 2
  const offsetY = frame.y + (frame.height - projectedHeight) / 2
  return {
    x: offsetX + (lng - bounds.minLng) * scale,
    y: offsetY + (bounds.maxLat - lat) * scale,
  }
}

const project = (coordinate: readonly [number, number]): Point => projectToFrame(coordinate, mapFrame)

const ringPath = (ring: number[][], frame: MapFrame = mapFrame): string => ring.map((coordinate, index) => {
  const point = projectToFrame(coordinate as [number, number], frame)
  return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`
}).join(' ') + ' Z'

const geometryPath = (geometry: CoastlineGeometry, frame: MapFrame = mapFrame): string => {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.flatMap((rings) => rings.map((ring) => ringPath(ring, frame))).join(' ')
}

const embeddedFontCss = (fonts?: ShareRecordFontData): string => fonts ? `
  @font-face { font-family: 'SGM Export Sans'; src: url(data:font/woff2;base64,${fonts.regular}) format('woff2'); font-weight: 400; }
  @font-face { font-family: 'SGM Export Sans'; src: url(data:font/woff2;base64,${fonts.medium}) format('woff2'); font-weight: 500; }
  @font-face { font-family: 'SGM Export Sans'; src: url(data:font/woff2;base64,${fonts.semibold}) format('woff2'); font-weight: 600; }
` : ''

export const getVisitedBuildings = (
  buildings: readonly ShareRecordBuilding[],
  snapshot: CollectionSnapshot,
): ShareRecordBuilding[] => buildings.filter((building) => snapshot.buildings[building.id]?.visited)

export const createShareRecordSvg = ({
  buildings,
  snapshot,
  fonts,
}: {
  buildings: readonly ShareRecordBuilding[]
  snapshot: CollectionSnapshot
  fonts?: ShareRecordFontData
}): string => {
  const visited = [...getVisitedBuildings(buildings, snapshot)]
    .sort((first, second) => first.id.localeCompare(second.id))
  const count = visited.length
  const countLabel = String(count)
  const countSize = countLabel.length > 3 ? 190 : countLabel.length > 2 ? 218 : 252
  const countLabelX = 72 + countLabel.length * countSize * .57 + 36
  const markerRadius = count <= 1 ? 15 : count <= 10 ? 11 : count <= 50 ? 8 : 5.5
  const markerStrokeWidth = count <= 1 ? 5 : count <= 10 ? 4.5 : count <= 50 ? 3.5 : 3
  const colors = defaultColorTokens.day
  const markers = visited.map((building) => {
    const point = project(building.coordinates)
    const category = getMapCategory(building.buildingType) ?? 'generic'
    const stroke = buildingCategoryColor(colors.architecture, building.buildingType)
    return `
    <circle class="marker" data-building-id="${escapeXml(building.id)}" data-category="${category}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${markerRadius}" fill="none" stroke="${stroke}" stroke-width="${markerStrokeWidth}" stroke-opacity="1"/>`
  }).join('')
  const land = coastlineFeatures.map((feature) => `
  <path class="land" data-name="${escapeXml(feature.properties.name)}" data-source-object-id="${feature.properties.sourceObjectId}" d="${geometryPath(feature.geometry)}" fill="${colors.neutral.subtleSurface}" fill-rule="evenodd" stroke="${colors.neutral.border}" stroke-width="2" stroke-linejoin="round"/>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_RECORD_WIDTH}" height="${SHARE_RECORD_HEIGHT}" viewBox="0 0 ${SHARE_RECORD_WIDTH} ${SHARE_RECORD_HEIGHT}" role="img" aria-labelledby="title description">
  <title id="title">SG Architecture Map visited record</title>
  <desc id="description">A cumulative record of ${count} visited architecture ${count === 1 ? 'place' : 'places'} in Singapore.</desc>
  <metadata>Coastline derived from Singapore Land Authority, National Map Polygon, accessed 2026-11-24 via data.gov.sg under the Singapore Open Data Licence version 1.0.</metadata>
  <style>
    ${embeddedFontCss(fonts)}
    text { font-family: 'SGM Export Sans', 'Source Sans 3', Arial, sans-serif; fill: ${colors.typography.primary}; }
    .brand { font-size: 26px; font-weight: 500; }
    .title { font-size: 48px; font-weight: 400; }
    .count { fill: ${colors.interaction.identity}; font-size: ${countSize}px; font-weight: 500; letter-spacing: -8px; font-variant-numeric: tabular-nums; }
    .label { font-size: 30px; font-weight: 400; }
    .attribution { font-size: 20px; font-weight: 400; opacity: .62; }
  </style>
  <rect width="1080" height="1350" fill="${colors.neutral.canvas}"/>
  <text x="72" y="78" class="brand">Singapore Architecture Map</text>
  <text x="72" y="158" class="title">Visited Record</text>
  <text x="72" y="430" class="count">${countLabel}</text>
  <text x="${countLabelX.toFixed(1)}" y="405" class="label">Places visited</text>
  ${land}
  ${markers}
  <text x="72" y="1302" class="attribution">National Map Polygon · SLA · accessed 24 Nov 2026 · data.gov.sg/open-data-licence</text>
</svg>`
}

export const svgToPngBlob = async (svg: string): Promise<Blob> => {
  await document.fonts.ready
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  try {
    const image = new Image()
    image.decoding = 'sync'
    image.src = url
    const decodableImage = image as HTMLImageElement & { decode?: () => Promise<void> }
    if (typeof decodableImage.decode === 'function') await decodableImage.decode()
    else await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not decode the share record SVG'))
    })
    const canvas = document.createElement('canvas')
    canvas.width = SHARE_RECORD_WIDTH
    canvas.height = SHARE_RECORD_HEIGHT
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is unavailable')
    context.drawImage(image, 0, 0, SHARE_RECORD_WIDTH, SHARE_RECORD_HEIGHT)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
