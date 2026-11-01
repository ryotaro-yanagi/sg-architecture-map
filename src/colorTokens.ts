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

// Production palette: Historical Day + Historical After Dark N3.
// Color Lab starts from these shared defaults; preview edits do not modify source.
export const defaultColorTokens: ColorTokens = {
  day: {
    neutral: {
      canvas: '#FAFAFA',
      surface: '#FFFFFF',
      subtleSurface: '#F2F2F2',
      border: '#E0E0E0'
    },
    typography: {
      primary: '#403625',
      secondary: '#403625',
      geographicPrimary: '#403625',
      geographicSecondary: '#8E8568',
      geographicWater: '#445848',
      geographicHalo: '#FFFFFF',
      architectureLabel: '#403625'
    },
    interaction: {
      primaryAction: '#403625',
      hover: '#F4F4F4',
      pressed: '#E0E0E0',
      selectedBackground: '#FAFAFA',
      selectedIndicator: '#E0E0E0',
      focus: '#403625'
    },
    architecture: {
      cultureCivic: '#FF3B32',
      mixedUse: '#9CDCFF',
      commercial: '#51A0D9',
      education: '#FFE030',
      hospitality: '#5973B8',
      residential: '#FE7A3E',
      genericFill: '#8BC084',
      categoryGlyph: '#FFFFFF',
      genericGlyph: '#FFFFFF',
      markerOutline: '#FFFFFF'
    },
    geographic: {
      background: '#F1E5C7',
      residential: '#F1E5C7',
      park: '#E5E5A3',
      wood: '#7E7D39',
      grass: '#E5E5A3',
      water: '#D1DACE',
      waterway: '#A1B8AA',
      roadMinor: '#DACFB3',
      roadMajor: '#DACFB3',
      roadMotorway: '#DACFB3',
      roadCasing: '#DACFB3',
      building: '#AE6670',
      buildingOutline: '#AE6670'
    }
  },
  night: {
    neutral: {
      canvas: '#1B211F',
      surface: '#28302D',
      subtleSurface: '#333C38',
      border: '#48534D'
    },
    typography: {
      primary: '#F2F4F0',
      secondary: '#B3BDB7',
      geographicPrimary: '#E6DECD',
      geographicSecondary: '#C5B9A0',
      geographicWater: '#C2DBD2',
      geographicHalo: '#25271F',
      architectureLabel: '#F2F4F0'
    },
    interaction: {
      primaryAction: '#EDF1EA',
      hover: '#35403A',
      pressed: '#45534A',
      selectedBackground: '#1B211F',
      selectedIndicator: '#48534D',
      focus: '#8FBCFF'
    },
    architecture: {
      cultureCivic: '#FF3B32',
      mixedUse: '#9CDCFF',
      commercial: '#51A0D9',
      education: '#FFE030',
      hospitality: '#5973B8',
      residential: '#FE7A3E',
      genericFill: '#35946B',
      categoryGlyph: '#FFFFFF',
      genericGlyph: '#000000',
      markerOutline: '#000000'
    },
    geographic: {
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
    }
  }
}

export const cloneColorTokens = (tokens: ColorTokens = defaultColorTokens): ColorTokens =>
  structuredClone(tokens)

export const colorTokenCssVariables = (tokens: ColorSchemeTokens): Record<`--${string}`, string> => ({
  '--paper': tokens.neutral.canvas,
  '--paper-strong': tokens.neutral.surface,
  '--system-soft': tokens.neutral.subtleSurface,
  '--line': tokens.neutral.border,
  '--ink': tokens.typography.primary,
  '--muted': tokens.typography.secondary,
  '--accent': tokens.interaction.primaryAction,
  '--interaction-hover': tokens.interaction.hover,
  '--interaction-pressed': tokens.interaction.pressed,
  '--interaction-selected-background': tokens.interaction.selectedBackground,
  '--interaction-selected-indicator': tokens.interaction.selectedIndicator,
  '--focus-ring': tokens.interaction.focus,
})
