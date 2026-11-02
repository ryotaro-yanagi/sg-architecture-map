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

const groupLabels: Record<GroupName, string> = {
  neutral: 'Neutral',
  typography: 'Typography',
  interaction: 'Interaction',
  architecture: 'Architecture',
  geographic: 'Geographic',
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
        const color = groupRecord[control.token]
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
      <label htmlFor={`color-lab-${control.section}-${control.token}`}>{control.label}</label>
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
}

export default function ColorLabPanel({ tokens, activeScheme, onChange }: ColorLabPanelProps) {
  const [editingScheme, setEditingScheme] = useState<SchemeName>('day')
  const [group, setGroup] = useState<GroupName>('neutral')
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
    const nextScheme = { ...tokens[editingScheme] }
    const touchedSections = new Set(controls[group].map((control) => control.section))
    touchedSections.forEach((section) => {
      nextScheme[section] = { ...defaultColorTokens[editingScheme][section] } as never
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
        <div><span>Developer tool</span><h1>Color Lab</h1></div>
        <span className="color-lab-preview-state">Preview: {activeScheme === 'day' ? 'Day' : 'Night'}</span>
      </header>

      <div className="color-lab-segmented" aria-label="Editing target">
        {(['day', 'night'] as const).map((scheme) => (
          <button key={scheme} type="button" aria-pressed={editingScheme === scheme} onClick={() => setEditingScheme(scheme)}>
            {scheme === 'day' ? 'Day' : 'Night'}
          </button>
        ))}
      </div>

      <nav className="color-lab-groups" aria-label="Color groups">
        {(Object.keys(groupLabels) as GroupName[]).map((name) => (
          <button key={name} type="button" aria-current={group === name ? 'page' : undefined} onClick={() => setGroup(name)}>
            {groupLabels[name]}
          </button>
        ))}
      </nav>

      <section className="color-lab-controls" aria-labelledby="color-lab-group-heading">
        <div className="color-lab-section-heading">
          <h2 id="color-lab-group-heading">{groupLabels[group]}</h2>
          {editingScheme !== activeScheme && <span>Editing off-preview</span>}
        </div>
        {controls[group].map((control) => (
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
        <button type="button" onClick={() => onChange(structuredClone(defaultColorTokens))}>Reset all</button>
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
      {importMessage && <p className="color-lab-import-message" role="status">{importMessage}</p>}
    </aside>
  )
}
