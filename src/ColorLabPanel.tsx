import { useEffect, useState } from 'react'
import type { ColorSchemeTokens, ColorTokens } from './colorTokens'
import { defaultColorTokens } from './colorTokens'
import './ColorLabPanel.css'

type SchemeName = keyof ColorTokens
type GroupName = keyof ColorSchemeTokens
type ColorControl = { section: GroupName; token: string; label: string }

const controls: Record<GroupName, ColorControl[]> = {
  neutral: [
    { section: 'neutral', token: 'canvas', label: 'Canvas' },
    { section: 'neutral', token: 'surface', label: 'Surface' },
    { section: 'neutral', token: 'subtleSurface', label: 'Subtle surface' },
    { section: 'neutral', token: 'border', label: 'Border' },
  ],
  typography: [
    { section: 'typography', token: 'primary', label: 'Primary UI text' },
    { section: 'typography', token: 'secondary', label: 'Secondary UI text' },
    { section: 'typography', token: 'geographicPrimary', label: 'Geographic primary label' },
    { section: 'typography', token: 'geographicSecondary', label: 'Geographic secondary label' },
    { section: 'typography', token: 'geographicWater', label: 'Water label' },
    { section: 'typography', token: 'geographicHalo', label: 'Label halo' },
    { section: 'typography', token: 'architectureLabel', label: 'Architecture label' },
  ],
  interaction: [
    { section: 'interaction', token: 'identity', label: 'Identity / Search red' },
    { section: 'interaction', token: 'primaryAction', label: 'Accent / primary action' },
    { section: 'interaction', token: 'hover', label: 'Hover' },
    { section: 'interaction', token: 'pressed', label: 'Pressed' },
    { section: 'interaction', token: 'selectedBackground', label: 'Selected background' },
    { section: 'interaction', token: 'selectedIndicator', label: 'Selected indicator' },
    { section: 'interaction', token: 'focus', label: 'Focus' },
  ],
  architecture: [
    { section: 'architecture', token: 'cultureCivic', label: 'Culture / civic' },
    { section: 'architecture', token: 'mixedUse', label: 'Mixed use' },
    { section: 'architecture', token: 'commercial', label: 'Commercial' },
    { section: 'architecture', token: 'education', label: 'Education' },
    { section: 'architecture', token: 'hospitality', label: 'Hospitality' },
    { section: 'architecture', token: 'residential', label: 'Residential' },
    { section: 'architecture', token: 'genericFill', label: 'Generic marker fill' },
    { section: 'architecture', token: 'categoryGlyph', label: 'Category glyph' },
    { section: 'architecture', token: 'genericGlyph', label: 'Generic glyph' },
    { section: 'architecture', token: 'markerOutline', label: 'Marker outline' },
  ],
  geographic: [
    { section: 'geographic', token: 'background', label: 'Background / land' },
    { section: 'geographic', token: 'residential', label: 'Residential land' },
    { section: 'geographic', token: 'park', label: 'Park' },
    { section: 'geographic', token: 'wood', label: 'Wood' },
    { section: 'geographic', token: 'grass', label: 'Grass' },
    { section: 'geographic', token: 'water', label: 'Water' },
    { section: 'geographic', token: 'waterway', label: 'Waterway' },
    { section: 'geographic', token: 'roadMinor', label: 'Minor road' },
    { section: 'geographic', token: 'roadMajor', label: 'Major road' },
    { section: 'geographic', token: 'roadMotorway', label: 'Motorway' },
    { section: 'geographic', token: 'roadCasing', label: 'Road casing' },
    { section: 'geographic', token: 'building', label: 'Building' },
    { section: 'geographic', token: 'buildingOutline', label: 'Building outline' },
  ],
}

// Explain where each token appears. Some source layers are intentionally hidden
// in SGM; keep their tokens editable for compatible JSON import/export.
const tokenHelp: Record<string, string> = {
  'neutral.canvas': 'Main UI canvas and floating building panel.',
  'neutral.surface': 'Search bar, controls, and other white surfaces.',
  'neutral.subtleSurface': 'Subtle UI surfaces, where used.',
  'neutral.border': 'Internal dividers; outer borders are hidden in this UI study.',
  'typography.primary': 'Main UI text, including titles and search input.',
  'typography.secondary': 'Supporting UI text such as credits and metadata.',
  'typography.geographicPrimary': 'City, town, and district names on the map.',
  'typography.geographicSecondary': 'Road, railway, airport, and secondary map labels.',
  'typography.geographicWater': 'Waterbody and waterway names.',
  'typography.geographicHalo': 'Thin contrast outline behind map labels.',
  'typography.architectureLabel': 'Building names beside SGM architecture pins.',
  'interaction.identity': 'Brand button, search icon, and identity accents.',
  'interaction.primaryAction': 'Primary action background and emphasis.',
  'interaction.hover': 'Hover fill on non-search controls; search results use red text.',
  'interaction.pressed': 'Pressed state where used.',
  'interaction.selectedBackground': 'Selected UI surfaces where used.',
  'interaction.selectedIndicator': 'Selected indicators where used.',
  'interaction.focus': 'Keyboard focus ring; search bar uses identity red.',
  'geographic.background': 'Base land under all other map features.',
  'geographic.residential': 'Mapped residential land-use polygons above base land.',
  'geographic.park': 'Mapped parks and public green spaces.',
  'geographic.wood': 'Woodland and forest land-cover polygons.',
  'geographic.grass': 'Grass land-cover plus school, hospital, and sports areas.',
  'geographic.water': 'Seas, reservoirs, and mapped water polygons.',
  'geographic.waterway': 'Rivers, canals, and water polygon boundaries.',
  'geographic.roadMinor': 'Minor, service, and local road lines.',
  'geographic.roadMajor': 'Secondary and tertiary roads, plus some links.',
  'geographic.roadMotorway': 'Motorways, trunk roads, and primary routes.',
  'geographic.roadCasing': 'Not visible: road casing layers are hidden in SGM.',
  'geographic.building': 'Building footprint fill, visible from zoom 13.2.',
  'geographic.buildingOutline': 'Boundary around each building footprint.',
  'architecture.cultureCivic': 'SGM architecture pins for culture and civic buildings.',
  'architecture.mixedUse': 'SGM architecture pins for mixed-use buildings.',
  'architecture.commercial': 'SGM architecture pins for offices and commercial buildings.',
  'architecture.education': 'SGM architecture pins for educational buildings.',
  'architecture.hospitality': 'SGM architecture pins for hotels and hospitality.',
  'architecture.residential': 'SGM architecture pins for housing.',
  'architecture.genericFill': 'Fallback color when architecture has no category color.',
  'architecture.categoryGlyph': 'Symbol inside category-specific pins.',
  'architecture.genericGlyph': 'Symbol inside the generic fallback pin.',
  'architecture.markerOutline': 'Outline around architecture markers and overview dots.',
}

// Display groups reflect SGM's UI-over-Map structure. The underlying token
// keys and exported JSON schema remain unchanged.
type LayerName = 'ui' | 'map'
type ViewGroup = 'identityText' | 'surface' | 'interaction' | 'geographic' | 'architecture' | 'mapLabels'
const viewGroups: Record<ViewGroup, { label: string; layer: LayerName; entries: ColorControl[] }> = {
  identityText: {
    label: 'Identity & Text', layer: 'ui',
    entries: [controls.interaction[0], ...controls.typography.slice(0, 2)],
  },
  surface: { label: 'Surface', layer: 'ui', entries: controls.neutral },
  interaction: { label: 'Interaction', layer: 'ui', entries: controls.interaction.slice(1) },
  geographic: { label: 'Geographic', layer: 'map', entries: controls.geographic },
  architecture: { label: 'Architecture', layer: 'map', entries: controls.architecture },
  mapLabels: { label: 'Map Labels', layer: 'map', entries: controls.typography.slice(2) },
}
const groupHelp: Record<ViewGroup, string> = {
  identityText: 'UI text and brand accents.',
  surface: 'Colors for the floating interface, not the map base.',
  interaction: 'Interaction states and accents; some only appear when active.',
  geographic: 'Each color corresponds to a specific map feature layer.',
  architecture: 'Category pins for SGM buildings, not ordinary map footprints.',
  mapLabels: 'Names and text outlines for places, roads, and buildings.',
}
const layerGroups: Record<LayerName, ViewGroup[]> = {
  ui: ['identityText', 'surface', 'interaction'],
  map: ['geographic', 'architecture', 'mapLabels'],
}

// Validate an exported palette before replacing the active preview.
const parsePalette = (raw: string): ColorTokens => {
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object') throw new Error('Invalid JSON palette.')
  const record = value as Record<string, unknown>
  if (record.schemaVersion !== 1) throw new Error('Unsupported palette version (expected 1).')
  const result = {} as ColorTokens
  for (const scheme of ['day', 'night'] as const) {
    const schemeData = record[scheme]
    if (!schemeData || typeof schemeData !== 'object') throw new Error('Missing ' + scheme + ' palette.')
    const schemeRecord = schemeData as Record<string, unknown>
    const next = {} as ColorSchemeTokens
    for (const group of Object.keys(controls) as GroupName[]) {
      const groupData = schemeRecord[group]
      if (!groupData || typeof groupData !== 'object') throw new Error('Missing ' + scheme + '.' + group + '.')
      const groupRecord = groupData as Record<string, unknown>
      const validated: Record<string, string> = {}
      for (const control of controls[group]) {
        // v1 exports created before Identity was added remain importable.
        const color = group === 'interaction' && control.token === 'identity' && groupRecord[control.token] === undefined
          ? defaultColorTokens[scheme].interaction.identity
          : groupRecord[control.token]
        if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
          throw new Error('Invalid color at ' + scheme + '.' + group + '.' + control.token)
        }
        validated[control.token] = color.toUpperCase()
      }
      Object.assign(next, { [group]: validated })
    }
    result[scheme] = next
  }
  return result
}

const getValue = (tokens: ColorTokens, scheme: SchemeName, control: ColorControl) =>
  (tokens[scheme][control.section] as unknown as Record<string, string>)[control.token]

function ColorRow({ control, value, onChange }: { control: ColorControl; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  const valid = /^#[0-9A-F]{6}$/i.test(draft)

  useEffect(() => setDraft(value), [value])

  const updateDraft = (next: string) => {
    const normalized = next.toUpperCase()
    setDraft(normalized)
    if (/^#[0-9A-F]{6}$/.test(normalized)) onChange(normalized)
  }

  return (
    <div className="color-lab-row">
      <div className="color-lab-row-copy">
        <label htmlFor={`color-lab-${control.section}-${control.token}`}>{control.label}</label>
        <span className="color-lab-help">{tokenHelp[`${control.section}.${control.token}`]}</span>
      </div>
      <div className="color-lab-inputs">
        <input
          className="color-lab-picker"
          type="color"
          value={value}
          onChange={(event) => updateDraft(event.target.value)}
          aria-label={`${control.label} color picker`}
        />
        <input
          id={`color-lab-${control.section}-${control.token}`}
          className="color-lab-hex"
          type="text"
          value={draft}
          onChange={(event) => updateDraft(event.target.value)}
          onBlur={() => { if (!valid) setDraft(value) }}
          aria-invalid={!valid}
          spellCheck={false}
          maxLength={7}
        />
      </div>
    </div>
  )
}

type ColorLabPanelProps = {
  tokens: ColorTokens
  activeScheme: SchemeName
  onChange: (tokens: ColorTokens) => void
  onPreviewSchemeChange: (scheme: SchemeName) => void
}

export default function ColorLabPanel({ tokens, activeScheme, onChange, onPreviewSchemeChange }: ColorLabPanelProps) {
  const [editingScheme, setEditingScheme] = useState<SchemeName>(activeScheme)
  useEffect(() => setEditingScheme(activeScheme), [activeScheme])
  const [layer, setLayer] = useState<LayerName>('ui')
  const [group, setGroup] = useState<ViewGroup>('identityText')
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importMessage, setImportMessage] = useState('')

  const updateColor = (control: ColorControl, value: string) => {
    const section = {
      ...(tokens[editingScheme][control.section] as unknown as Record<string, string>),
      [control.token]: value,
    }
    onChange({
      ...tokens,
      [editingScheme]: { ...tokens[editingScheme], [control.section]: section },
    } as ColorTokens)
  }

  const resetGroup = () => {
    const nextScheme = structuredClone(tokens[editingScheme])
    // A display group can contain tokens from multiple source sections.
    // Only reset the visible controls, not their entire underlying sections.
    viewGroups[group].entries.forEach((control) => {
      const section = nextScheme[control.section] as unknown as Record<string, string>
      section[control.token] = getValue(defaultColorTokens, editingScheme, control)
    })
    onChange({ ...tokens, [editingScheme]: nextScheme })
  }

  const exportJson = () => {
    const data = { schemaVersion: 1, name: 'SGM Color Lab', day: tokens.day, night: tokens.night }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'sgm-color-palette.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const importJson = (raw: string) => {
    try {
      const parsed = parsePalette(raw)
      onChange(parsed)
      setImportMessage('Imported Day and Night colors.')
      setImportOpen(false)
      setImportText('')
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Could not read palette.')
    }
  }

  return (
    <aside className="color-lab-panel" aria-label="SGM Color Lab">
      <header className="color-lab-header">
        <div><span>SGM Color Study · v0.4</span><h1>Color Lab</h1></div>
        <span className="color-lab-preview-state">Preview: {activeScheme === 'day' ? 'Day' : 'Night'}</span>
      </header>

      <div className="color-lab-segmented" aria-label="Editing target">
        {(['day', 'night'] as const).map((scheme) => (
          <button key={scheme} type="button" aria-pressed={editingScheme === scheme} onClick={() => { setEditingScheme(scheme); onPreviewSchemeChange(scheme) }}>
            {scheme === 'day' ? 'Day' : 'Night'}
          </button>
        ))}
      </div>

      <div className="color-lab-layers color-lab-segmented" role="group" aria-label="Color system layer">
        {(['ui', 'map'] as const).map((name) => (
          <button key={name} type="button" aria-pressed={layer === name} onClick={() => {
            setLayer(name)
            setGroup(layerGroups[name][0])
          }}>{name === 'ui' ? 'UI' : 'Map'}</button>
        ))}
      </div>
      <nav className="color-lab-groups" aria-label={layer === 'ui' ? 'UI groups' : 'Map groups'}>
        {layerGroups[layer].map((name) => (
          <button key={name} type="button" aria-current={group === name ? 'page' : undefined} onClick={() => setGroup(name)}>
            {viewGroups[name].label}
          </button>
        ))}
      </nav>

      <section className="color-lab-controls" aria-labelledby="color-lab-group-heading">
        <div className="color-lab-section-heading">
          <h2 id="color-lab-group-heading">{viewGroups[group].label}</h2>
          {editingScheme !== activeScheme && <span>Editing off-preview</span>}
        </div>
        <p className="color-lab-group-help">{groupHelp[group]}</p>

        {layer === 'ui' && (
          <div className="color-lab-ui-example" aria-label="UI color preview">
            <div className="color-lab-ui-example-surface" style={{
              background: tokens[editingScheme].neutral.surface,
              color: tokens[editingScheme].typography.primary,
            }}>
              <div className="color-lab-ui-example-search" style={{
                borderColor: tokens[editingScheme].interaction.identity,
              }}>
                <span style={{ color: tokens[editingScheme].interaction.identity }}>⌕</span>
                <span>Focused search</span>
              </div>
              <div className="color-lab-ui-example-title">Building name</div>
              <div className="color-lab-ui-example-meta" style={{
                color: tokens[editingScheme].typography.secondary,
              }}>Architect · Completed 2020</div>
              <div className="color-lab-ui-example-divider" style={{
                background: tokens[editingScheme].neutral.border,
              }} />
              <div className="color-lab-ui-example-action">View details <span>→</span></div>
              <div className="color-lab-ui-example-hover" style={{
                background: tokens[editingScheme].interaction.hover,
              }}>Hover surface</div>
            </div>
            <p>UI example · focused search and one divider; colors update as you edit.</p>
          </div>
        )}
        <div className="color-lab-palette-preview" role="img" aria-label={viewGroups[group].label + ' palette preview'}>
          {viewGroups[group].entries.map((control) => (
            <span key={control.section + '.' + control.token} className="color-lab-palette-swatch"
              style={{ backgroundColor: getValue(tokens, editingScheme, control) }}
              title={control.label + ': ' + getValue(tokens, editingScheme, control)}
            />
          ))}
        </div>
        {viewGroups[group].entries.map((control) => (
          <ColorRow
            key={`${control.section}.${control.token}`}
            control={control}
            value={getValue(tokens, editingScheme, control)}
            onChange={(value) => updateColor(control, value)}
          />
        ))}
      </section>

      <footer className="color-lab-footer">
        <button type="button" onClick={resetGroup}>Reset group</button>
        <button type="button" onClick={() => onChange(structuredClone(defaultColorTokens))} title="Load the latest study palette. Saved edits are replaced in this browser.">Load defaults</button>
        <button type="button" onClick={() => { setImportOpen(open => !open); setImportMessage('') }}>Import JSON</button>
        <button type="button" className="color-lab-copy" onClick={exportJson}>Export JSON</button>
      </footer>
      {importOpen && (
        <section className="color-lab-import" aria-label="Import palette JSON">
          <label htmlFor="color-lab-import-text">Paste exported JSON, or choose a .json file</label>
          <textarea id="color-lab-import-text" rows={5} value={importText} onChange={event => setImportText(event.target.value)} />
          <input type="file" accept=".json,application/json" aria-label="Choose palette JSON file" onChange={async event => {
            const file = event.target.files?.[0]
            if (!file) return
            try { setImportText(await file.text()); setImportMessage('File loaded. Apply to preview.') }
            catch { setImportMessage('Could not read file.') }
          }} />
          <div className="color-lab-import-actions">
            <button type="button" onClick={() => importJson(importText)} disabled={!importText.trim()}>Apply JSON</button>
            <button type="button" onClick={() => setImportOpen(false)}>Cancel</button>
          </div>
        </section>
      )}
      <p className="color-lab-draft-notice">Colors are saved in this browser. Use Export JSON before loading defaults.</p>
      {importMessage && <p className="color-lab-import-message" role="status">{importMessage}</p>}
    </aside>
  )
}
