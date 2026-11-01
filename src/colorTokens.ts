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

// These are the deployed SGM values. Color Lab edits always start from this
// immutable baseline and never write changes back into the repository.
export const defaultColorTokens: ColorTokens = {
  day: {
    neutral: {
      canvas: '#FAFAFA',
      surface: '#FFFFFF',
      subtleSurface: '#F2F2F2',
      border: '#E0E0E0',
    },
    typography: {
      primary: '#212121',
      secondary: '#505050',
      geographicPrimary: '#414744',
      geographicSecondary: '#6B726E',
      geographicWater: '#3F7885',
      geographicHalo: '#FFFFFF',
      architectureLabel: '#242424',
    },
    interaction: {
      primaryAction: '#262626',
      hover: '#F4F4F4',
      pressed: '#E0E0E0',
      selectedBackground: '#FAFAFA',
      selectedIndicator: '#E0E0E0',
      focus: '#0F62FE',
    },
    architecture: {
      cultureCivic: '#A987FF',
      mixedUse: '#FF8D4F',
      commercial: '#46A5FF',
      education: '#FFC341',
      hospitality: '#FD6360',
      residential: '#5DD089',
      genericFill: '#35946B',
      categoryGlyph: '#FFFFFF',
      genericGlyph: '#FFFFFF',
      markerOutline: '#FFFFFF',
    },
    geographic: {
      background: '#FBF8F3',
      residential: '#EAE0D0',
      park: '#E1EBB0',
      wood: '#D3E4D5',
      grass: '#E6EEE6',
      water: '#B0D0D6',
      waterway: '#83B8C4',
      roadMinor: '#E7E5E0',
      roadMajor: '#DADCD9',
      roadMotorway: '#C8D0D2',
      roadCasing: '#CBD0CD',
      building: '#DED3BE',
      // The deployed map currently renders the outline with the building fill.
      buildingOutline: '#DED3BE',
    },
  },
  night: {
    neutral: {
      canvas: '#1B211F',
      surface: '#28302D',
      subtleSurface: '#333C38',
      border: '#48534D',
    },
    typography: {
      primary: '#F2F4F0',
      secondary: '#B3BDB7',
      geographicPrimary: '#D4DDD6',
      geographicSecondary: '#A6B3AA',
      geographicWater: '#85B6C7',
      geographicHalo: '#202824',
      architectureLabel: '#F2F4F0',
    },
    interaction: {
      primaryAction: '#EDF1EA',
      hover: '#35403A',
      pressed: '#45534A',
      selectedBackground: '#1B211F',
      selectedIndicator: '#48534D',
      focus: '#8FBCFF',
    },
    architecture: {
      cultureCivic: '#A987FF',
      mixedUse: '#FF8D4F',
      commercial: '#46A5FF',
      education: '#FFC341',
      hospitality: '#FD6360',
      residential: '#5DD089',
      genericFill: '#35946B',
      categoryGlyph: '#000000',
      genericGlyph: '#000000',
      markerOutline: '#000000',
    },
    geographic: {
      background: '#202824',
      residential: '#202824',
      park: '#3E5645',
      wood: '#293D32',
      grass: '#2B3930',
      water: '#365562',
      waterway: '#477687',
      roadMinor: '#46554D',
      roadMajor: '#586A5F',
      roadMotorway: '#6C7C72',
      roadCasing: '#202824',
      building: '#4D5951',
      buildingOutline: '#4D5951',
    },
  },
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
