import data from './data/buildings.json'
import { createShareRecordSvg, svgToPngBlob } from './shareRecordGraphic'
import type { ShareRecordBuilding, ShareRecordFontData } from './shareRecordGraphic'
import type { CollectionSnapshot } from './collectionState'

const buildings = data.buildings as unknown as ShareRecordBuilding[]
const fontUrls = {
  regular: new URL('../node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-400-normal.woff2', import.meta.url).href,
  medium: new URL('../node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-500-normal.woff2', import.meta.url).href,
  semibold: new URL('../node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-600-normal.woff2', import.meta.url).href,
}

let fontsPromise: Promise<ShareRecordFontData> | null = null

const loadFont = async (url: string): Promise<string> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load export font: ${response.status}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const loadFonts = (): Promise<ShareRecordFontData> => {
  fontsPromise ??= Promise.all([
    loadFont(fontUrls.regular),
    loadFont(fontUrls.medium),
    loadFont(fontUrls.semibold),
  ]).then(([regular, medium, semibold]) => ({ regular, medium, semibold }))
  return fontsPromise
}

export const SHARE_RECORD_FILENAME = 'SGM-Visited-Record.png'

export const generateShareRecordPng = async (snapshot: CollectionSnapshot): Promise<Blob> => {
  const fonts = await loadFonts()
  return svgToPngBlob(createShareRecordSvg({ buildings, snapshot, fonts }))
}

export const createShareRecordFile = (png: Blob): File =>
  new File([png], SHARE_RECORD_FILENAME, { type: 'image/png' })

export const canShareRecordFile = (file: File): boolean => {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false
  try { return navigator.canShare({ files: [file] }) }
  catch { return false }
}
