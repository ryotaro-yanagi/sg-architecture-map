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

// Historical Day is the user-authored Color Lab export; the Minimal variant only
// makes four small category adjustments. Neither preset changes the Night palette.
const historicalDay: ColorSchemeTokens = {
  neutral: { canvas: '#FAFAFA', surface: '#FFFFFF', subtleSurface: '#F2F2F2', border: '#E0E0E0' },
  typography: { primary: '#403625', secondary: '#403625', geographicPrimary: '#403625', geographicSecondary: '#8E8568', geographicWater: '#445848', geographicHalo: '#FFFFFF', architectureLabel: '#403625' },
  interaction: { primaryAction: '#403625', hover: '#F4F4F4', pressed: '#E0E0E0', selectedBackground: '#FAFAFA', selectedIndicator: '#E0E0E0', focus: '#403625' },
  architecture: { cultureCivic: '#FF3B32', mixedUse: '#9CDCFF', commercial: '#51A0D9', education: '#FFE030', hospitality: '#5973B8', residential: '#FE7A3E', genericFill: '#8BC084', categoryGlyph: '#FFFFFF', genericGlyph: '#FFFFFF', markerOutline: '#FFFFFF' },
  geographic: { background: '#F1E5C7', residential: '#F1E5C7', park: '#E5E5A3', wood: '#7E7D39', grass: '#E5E5A3', water: '#D1DACE', waterway: '#A1B8AA', roadMinor: '#DACFB3', roadMajor: '#DACFB3', roadMotorway: '#DACFB3', roadCasing: '#DACFB3', building: '#AE6670', buildingOutline: '#AE6670' },
}
const minimalDay: ColorSchemeTokens = {
  ...historicalDay,
  architecture: { ...historicalDay.architecture, mixedUse: '#8FCDF4', commercial: '#4094CE', education: '#FFD619', residential: '#F16D34' },
}

const groupLabels: Record<GroupName, string> = {
  neutral: 'Neutral',
  typography: 'Typography',
  interaction: 'Interaction',
  architecture: 'Architecture',
  geographic: 'Geographic',
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
  const [copyState, setCopyState] = useState('Copy JSON')

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

  const copyJson = async () => {
    const exportData = { schemaVersion: 1, name: 'SGM Color Lab', day: tokens.day, night: tokens.night }
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
      setCopyState('Copied')
    } catch {
      setCopyState('Copy failed')
    }
    window.setTimeout(() => setCopyState('Copy JSON'), 1800)
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

      <section className="color-lab-presets" aria-label="Day palette comparisons">
        <span>Historical Day comparison (Night unchanged)</span>
        <div className="color-lab-segmented">
          <button type="button" onClick={() => { onChange({ ...tokens, day: structuredClone(historicalDay) }); setEditingScheme('day'); setGroup('architecture') }}>Original</button>
          <button type="button" onClick={() => { onChange({ ...tokens, day: structuredClone(minimalDay) }); setEditingScheme('day'); setGroup('architecture') }}>Minimal</button>
        </div>
      </section>

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
        <button type="button" className="color-lab-copy" onClick={copyJson}>{copyState}</button>
      </footer>
    </aside>
  )
}
