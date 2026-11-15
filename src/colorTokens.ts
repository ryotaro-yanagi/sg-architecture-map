export type NeutralColorTokens = {
  canvas: string
  surface: string
  subtleSurface: string
  border: string
}

export type TypographyColorTokens = {
  primary: string
  secondary: string
  geographicPrimary: string
  geographicSecondary: string
  geographicWater: string
  geographicHalo: string
  architectureLabel: string
}

export type InteractionColorTokens = {
  identity: string
  primaryAction: string
  hover: string
  pressed: string
  selectedBackground: string
  selectedIndicator: string
  focus: string
}

export type ArchitectureColorTokens = {
  cultureCivic: string
  mixedUse: string
  commercial: string
  education: string
  hospitality: string
  residential: string
  genericFill: string
  categoryGlyph: string
  genericGlyph: string
  markerOutline: string
}

export type GeographicColorTokens = {
  background: string
  residential: string
  park: string
  wood: string
  grass: string
  water: string
  waterway: string
  roadMinor: string
  roadMajor: string
  roadMotorway: string
  roadCasing: string
  building: string
  buildingOutline: string
}

export type ColorSchemeTokens = {
  neutral: NeutralColorTokens
  typography: TypographyColorTokens
  interaction: InteractionColorTokens
  architecture: ArchitectureColorTokens
  geographic: GeographicColorTokens
}

export type ColorTokens = {
  day: ColorSchemeTokens
  night: ColorSchemeTokens
}

export type CoreUiColors = {
  background: string
  foreground: string
  accent: string
}

// The only independent production UI colors. All UI aliases and states below
// are derived from these values; map and architecture colors stay independent.
export const coreUiColorDefaults: Record<keyof ColorTokens, CoreUiColors> = {
  day: { background: '#FAFAFA', foreground: '#0A0A0A', accent: '#FF463A' },
  night: { background: '#1B211F', foreground: '#F2F4F0', accent: '#FF463A' },
}

const parseHex = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
]

const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0')

// Equivalent to placing foreground over background at the given opacity.
export const blendHex = (foreground: string, background: string, opacity: number): string => {
  const foregroundRgb = parseHex(foreground)
  const backgroundRgb = parseHex(background)
  return `#${foregroundRgb.map((channel, index) => (
    toHex(channel * opacity + backgroundRgb[index] * (1 - opacity))
  )).join('')}`.toUpperCase()
}

const relativeLuminance = (hex: string): number => {
  const channels = parseHex(hex).map(channel => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

export const contrastRatio = (first: string, second: string): number => {
  const firstLuminance = relativeLuminance(first)
  const secondLuminance = relativeLuminance(second)
  return (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
}

export const coreUiColorsFromTokens = (tokens: ColorSchemeTokens): CoreUiColors => ({
  background: tokens.neutral.canvas,
  foreground: tokens.typography.primary,
  accent: tokens.interaction.identity,
})

export const deriveUiColorScheme = (tokens: ColorSchemeTokens): ColorSchemeTokens => {
  const { background, foreground, accent } = coreUiColorsFromTokens(tokens)
  return {
    ...tokens,
    neutral: {
      canvas: background,
      surface: background,
      subtleSurface: blendHex(foreground, background, 0.06),
      border: blendHex(foreground, background, 0.20),
    },
    typography: {
      ...tokens.typography,
      primary: foreground,
      secondary: blendHex(foreground, background, 0.68),
    },
    interaction: {
      identity: accent,
      primaryAction: accent,
      hover: blendHex(foreground, background, 0.07),
      pressed: blendHex(foreground, background, 0.12),
      selectedBackground: blendHex(accent, background, 0.12),
      selectedIndicator: accent,
      focus: accent,
    },
  }
}

export const deriveUiColorTokens = (tokens: ColorTokens): ColorTokens => ({
  day: deriveUiColorScheme(tokens.day),
  night: deriveUiColorScheme(tokens.night),
})

const createColorScheme = (
  core: CoreUiColors,
  mapTypography: Omit<TypographyColorTokens, 'primary' | 'secondary'>,
  architecture: ArchitectureColorTokens,
  geographic: GeographicColorTokens,
): ColorSchemeTokens => deriveUiColorScheme({
  neutral: {
    canvas: core.background,
    surface: core.background,
    subtleSurface: core.background,
    border: core.foreground,
  },
  typography: {
    primary: core.foreground,
    secondary: core.foreground,
    ...mapTypography,
  },
  interaction: {
    identity: core.accent,
    primaryAction: core.accent,
    hover: core.background,
    pressed: core.background,
    selectedBackground: core.background,
    selectedIndicator: core.accent,
    focus: core.accent,
  },
  architecture,
  geographic,
})

// Color Lab starts from these shared defaults; preview edits do not modify source.
export const defaultColorTokens: ColorTokens = {
  day: createColorScheme(
    coreUiColorDefaults.day,
    {
      geographicPrimary: '#515552',
      geographicSecondary: '#515552',
      geographicWater: '#85C8E1',
      geographicHalo: '#EAEAEA',
      architectureLabel: '#515552'
    },
    {
      cultureCivic: '#FF3B32',
      mixedUse: '#A5E3E8',
      commercial: '#51A0D9',
      education: '#FFE030',
      hospitality: '#9550A8',
      residential: '#F59A36',
      genericFill: '#52AE54',
      categoryGlyph: '#FFFFFF',
      genericGlyph: '#000000',
      markerOutline: '#FAFAFA'
    },
    {
      background: '#EAEAEA',
      residential: '#EAEAEA',
      park: '#E1E5C8',
      wood: '#B7CD7C',
      grass: '#E1E5C8',
      water: '#DFE3E2',
      waterway: '#85C8E1',
      roadMinor: '#E3C59D',
      roadMajor: '#E3C59D',
      roadMotorway: '#E3C59D',
      roadCasing: '#E3C59D',
      building: '#989795',
      buildingOutline: '#989795'
    },
  ),
  night: createColorScheme(
    coreUiColorDefaults.night,
    {
      geographicPrimary: '#E6DECD',
      geographicSecondary: '#C5B9A0',
      geographicWater: '#C2DBD2',
      geographicHalo: '#25271F',
      architectureLabel: '#F2F4F0'
    },
    {
      cultureCivic: '#FF3B32',
      mixedUse: '#A5E3E8',
      commercial: '#51A0D9',
      education: '#FFE030',
      hospitality: '#9550A8',
      residential: '#F59A36',
      genericFill: '#35946B',
      categoryGlyph: '#FFFFFF',
      genericGlyph: '#000000',
      markerOutline: '#000000'
    },
    {
      background: '#25271F',
      residential: '#292B22',
      park: '#3B4630',
      wood: '#525333',
      grass: '#3B4630',
      water: '#344D4A',
      waterway: '#54746C',
      roadMinor: '#35382D',
      roadMajor: '#45483B',
      roadMotorway: '#515346',
      roadCasing: '#25271F',
      building: '#71505A',
      buildingOutline: '#71505A'
    },
  ),
}

export const cloneColorTokens = (tokens: ColorTokens = defaultColorTokens): ColorTokens =>
  structuredClone(tokens)

// Preserve the Color Lab v1 envelope and every legacy token key. Older v1
// exports that predate interaction.identity continue to use the default accent.
export const parseColorPaletteV1 = (raw: string): ColorTokens => {
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object') throw new Error('Invalid JSON palette.')
  const record = value as Record<string, unknown>
  if (record.schemaVersion !== 1) throw new Error('Unsupported palette version (expected 1).')
  const result = {} as ColorTokens

  for (const scheme of ['day', 'night'] as const) {
    const schemeData = record[scheme]
    if (!schemeData || typeof schemeData !== 'object') throw new Error(`Missing ${scheme} palette.`)
    const schemeRecord = schemeData as Record<string, unknown>
    const next = {} as ColorSchemeTokens

    for (const group of Object.keys(defaultColorTokens[scheme]) as (keyof ColorSchemeTokens)[]) {
      const groupData = schemeRecord[group]
      if (!groupData || typeof groupData !== 'object') throw new Error(`Missing ${scheme}.${group}.`)
      const groupRecord = groupData as Record<string, unknown>
      const validated: Record<string, string> = {}

      for (const token of Object.keys(defaultColorTokens[scheme][group])) {
        const color = group === 'interaction' && token === 'identity' && groupRecord[token] === undefined
          ? defaultColorTokens[scheme].interaction.identity
          : groupRecord[token]
        if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) {
          throw new Error(`Invalid color at ${scheme}.${group}.${token}`)
        }
        validated[token] = color.toUpperCase()
      }
      Object.assign(next, { [group]: validated })
    }
    result[scheme] = next
  }

  return deriveUiColorTokens(result)
}

// Developer Color Lab draft. Keep independent from production appearance preferences.
const draftStorageKey = 'sgm-color-lab-draft-v1'
export const readColorLabDraft = (): ColorTokens => {
  try {
    const raw = window.localStorage.getItem(draftStorageKey)
    if (!raw) return cloneColorTokens()
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return cloneColorTokens()
    const candidate = parsed as Record<string, unknown>
    for (const scheme of ['day', 'night'] as const) {
      const schemeData = candidate[scheme] as Record<string, unknown> | undefined
      if (!schemeData || typeof schemeData !== 'object') return cloneColorTokens()
      for (const group of Object.keys(defaultColorTokens[scheme]) as (keyof ColorSchemeTokens)[]) {
        const groupData = schemeData[group] as Record<string, unknown> | undefined
        if (!groupData || typeof groupData !== 'object') return cloneColorTokens()
        for (const token of Object.keys(defaultColorTokens[scheme][group])) {
          const color = groupData[token]
          if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) return cloneColorTokens()
        }
      }
    }
    return deriveUiColorTokens(candidate as unknown as ColorTokens)
  } catch { return cloneColorTokens() }
}
export const saveColorLabDraft = (tokens: ColorTokens): void => {
  try { window.localStorage.setItem(draftStorageKey, JSON.stringify(deriveUiColorTokens(tokens))) }
  catch { /* Storage may be unavailable in private browsing. Export JSON remains available. */ }
}

export const colorTokenCssVariables = (tokens: ColorSchemeTokens): Record<`--${string}`, string> => {
  const derived = deriveUiColorScheme(tokens)
  const { background, foreground, accent } = coreUiColorsFromTokens(derived)
  const onAccent = contrastRatio(foreground, accent) >= contrastRatio(background, accent)
    ? foreground
    : background
  return {
    '--ui-background': background,
    '--ui-foreground': foreground,
    '--ui-accent': accent,
    '--on-accent': onAccent,
    '--accent-hover': blendHex(onAccent, accent, 0.10),
    '--accent-pressed': blendHex(onAccent, accent, 0.18),
    '--paper': background,
    '--paper-strong': derived.neutral.surface,
    '--system-soft': derived.neutral.subtleSurface,
    '--line': derived.neutral.border,
    '--ink': foreground,
    '--muted': derived.typography.secondary,
    '--accent': accent,
    '--identity': accent,
    '--interaction-hover': derived.interaction.hover,
    '--interaction-pressed': derived.interaction.pressed,
    '--interaction-selected-background': derived.interaction.selectedBackground,
    '--interaction-selected-indicator': derived.interaction.selectedIndicator,
    '--focus-ring': accent,
  }
}
