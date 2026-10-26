export type Locale = 'en' | 'ja'

type BuildingCopy = {
  name: string
  architectCredit: string
}

export type Translation = {
  mapLabel: string
  mapControls: Record<string, string>
  resetMap: string
  languageSwitcher: string
  searchLabel: string
  searchPlaceholder: string
  closeSearch: string
  searchResults: string
  resultCount: (count: number) => string
  noResults: string
  locate: string
  locating: string
  locationUnsupported: string
  locationSuccess: string
  locationFailure: string
  currentLocation: string
  dataNote: (count: number) => string
  clearSelection: string
  viewDetails: string
  previewLabel: (name: string) => string
  detailLabel: (name: string) => string
  backToMap: string
  photoNotPublished: string
  photoOverlay: string
  photoPlaceholder: string
  design: string
  completion: string
  type: string
  address: string
  unverified: string
  verificationNote: string
  googleSearch: string
  imageSearch: string
  sources: string
  officialProject: string
  coordinateSource: string
  types: Record<string, string>
}

export const translations: Record<Locale, Translation> = {
  en: {
    mapLabel: 'Singapore architecture map',
    mapControls: {},
    resetMap: 'Return to the Singapore overview',
    languageSwitcher: 'Switch language',
    searchLabel: 'Search by building or architect',
    searchPlaceholder: 'Search buildings or architects',
    closeSearch: 'Close search',
    searchResults: 'Search results',
    resultCount: (count) => `${count} ${count === 1 ? 'building' : 'buildings'}`,
    noResults: 'No matching buildings',
    locate: 'My location',
    locating: 'Locating',
    locationUnsupported: 'Location is unavailable in this browser. You can continue using the map.',
    locationSuccess: 'Your location is now shown on the map.',
    locationFailure: 'We could not access your location. You can continue using the map without it.',
    currentLocation: 'Current location',
    dataNote: (count) => `${count} places · approximate coordinates`,
    clearSelection: 'Clear selection',
    viewDetails: 'View details',
    previewLabel: (name) => `${name} preview`,
    detailLabel: (name) => `${name} details`,
    backToMap: 'Back to map',
    photoNotPublished: 'Photo not published',
    photoOverlay: 'PHOTO · NOT ADDED',
    photoPlaceholder: 'A photo may be added after verification',
    design: 'Design',
    completion: 'Completion',
    type: 'Type',
    address: 'Address',
    unverified: 'Unverified',
    verificationNote: 'Coordinates are approximate representative points. Public access has not been verified.',
    googleSearch: 'Google Search',
    imageSearch: 'Image Search',
    sources: 'Sources',
    officialProject: 'Official source',
    coordinateSource: 'Coordinate source',
    types: {
      civic_cultural: 'Civic & cultural',
      mixed_use: 'Mixed use',
      retail: 'Retail',
      community: 'Community',
      hospitality: 'Hospitality',
      education: 'Education',
      office: 'Office',
      residential: 'Residential',
      sports: 'Sports & entertainment',
    },
  },
  ja: {
    mapLabel: 'シンガポール建築マップ',
    mapControls: {
      'AttributionControl.ToggleAttribution': '地図クレジットを開閉',
      'Map.Title': '地図',
      'NavigationControl.ZoomIn': '拡大',
      'NavigationControl.ZoomOut': '縮小',
    },
    resetMap: 'シンガポール全体へ戻る',
    languageSwitcher: '言語を切り替える',
    searchLabel: '建築名または設計者で検索',
    searchPlaceholder: '建築名・設計者を検索',
    closeSearch: '検索を閉じる',
    searchResults: '検索結果',
    resultCount: (count) => `${count}件の建築`,
    noResults: '一致する建築はありません',
    locate: '現在地',
    locating: '取得中',
    locationUnsupported: 'このブラウザでは現在地を利用できません。地図はそのまま使えます。',
    locationSuccess: '現在地を地図に表示しました。',
    locationFailure: '現在地を取得できませんでした。許可しなくても地図は使えます。',
    currentLocation: '現在地',
    dataNote: (count) => `${count}件 · 座標は暫定`,
    clearSelection: '選択を解除',
    viewDetails: '詳しく見る',
    previewLabel: (name) => `${name}のプレビュー`,
    detailLabel: (name) => `${name}の詳細`,
    backToMap: '地図へ戻る',
    photoNotPublished: '写真は未掲載',
    photoOverlay: '写真 · 未掲載',
    photoPlaceholder: '写真は検証後に掲載予定',
    design: '設計',
    completion: '竣工',
    type: '用途',
    address: '所在地',
    unverified: '未確認',
    verificationNote: '座標は代表点の暫定データです。公開アクセスの可否は未確認です。',
    googleSearch: 'Google検索',
    imageSearch: '画像検索',
    sources: '出典',
    officialProject: '公式情報',
    coordinateSource: '座標情報',
    types: {
      civic_cultural: '文化・公共',
      mixed_use: '複合用途',
      retail: '商業',
      community: 'コミュニティ',
      hospitality: '宿泊',
      education: '教育',
      office: '業務',
      residential: '住宅',
      sports: 'スポーツ・興行',
    },
  },
}

const buildingCopy: Record<Locale, Record<string, BuildingCopy>> = {
  en: {
    'dpa-esplanade': { name: 'Esplanade – Theatres on the Bay', architectCredit: 'DP Architects in collaboration with Michael Wilford & Partners, UK' },
    'dpa-suntec-city': { name: 'Suntec City', architectCredit: 'DP Architects in collaboration with Tsao & Mckwon Pte Ltd (DPA website spelling)' },
    'dpa-orchard-central': { name: 'Orchard Central', architectCredit: 'DP Architects' },
    'dpa-bugis-junction': { name: 'Bugis Junction', architectCredit: 'DP Architects' },
    'dpa-peoples-park-complex': { name: 'People’s Park Complex', architectCredit: 'Design Partnership Architects & Planners and DP Architects (in continuation of Design Partnership)' },
    'dpa-our-tampines-hub': { name: 'Our Tampines Hub', architectCredit: 'DP Architects, DP Design, DP Green' },
    'dpa-golden-mile-complex': { name: 'Golden Mile Complex', architectCredit: 'DP Architects (historic authorship and current project phase require detailed differentiation)' },
    'SGM-0098': { name: '21 Carpenter', architectCredit: 'WOHA' },
    'SGM-0102': { name: 'Oasia Hotel Downtown', architectCredit: 'WOHA' },
    'SGM-0103': { name: 'School of the Arts (SOTA)', architectCredit: 'WOHA' },
    'SGM-0107': { name: 'VivoCity', architectCredit: 'Toyo Ito & Associates' },
    'SGM-0108': { name: 'CapitaGreen', architectCredit: 'Toyo Ito & Associates' },
    'SGM-0109': { name: 'National Gallery Singapore', architectCredit: 'studioMilou Singapore · CPG Consultants' },
    'SGM-0089': { name: 'Republic Polytechnic', architectCredit: 'Maki & Associates · DP Architects' },
    'SGM-0092': { name: 'One Raffles Place Tower One', architectCredit: 'Kenzo Tange Associates' },
    'SGM-0093': { name: 'Singapore Indoor Stadium', architectCredit: 'Kenzo Tange Associates · RSP Architects' },
    'SGM-0104': { name: 'Jewel Changi Airport', architectCredit: 'Safdie Architects · RSP Architects' },
    'SGM-0090': { name: 'Wee Cho Yaw Plaza', architectCredit: 'Toyo Ito & Associates · RSP Architects' },
    'SGM-0091': { name: 'The Wave (NTU)', architectCredit: 'Toyo Ito & Associates' },
    'SGM-0095': { name: 'Kampung Admiralty', architectCredit: 'WOHA' },
    'SGM-0096': { name: 'SkyVille @ Dawson', architectCredit: 'WOHA' },
    'SGM-0097': { name: 'Enabling Village', architectCredit: 'WOHA' },
    'SGM-0126': { name: 'Mediacorp Campus', architectCredit: 'Maki & Associates · DP Architects' },
  },
  ja: {
    'dpa-esplanade': { name: 'Esplanade – Theatres on the Bay', architectCredit: 'DP Architects、Michael Wilford & Partners（英国）による協働' },
    'dpa-suntec-city': { name: 'Suntec City', architectCredit: 'DP Architects、Tsao & Mckwon Pte Ltdによる協働（DPA公式サイト表記）' },
    'dpa-orchard-central': { name: 'Orchard Central', architectCredit: 'DP Architects' },
    'dpa-bugis-junction': { name: 'Bugis Junction', architectCredit: 'DP Architects' },
    'dpa-peoples-park-complex': { name: 'People’s Park Complex', architectCredit: 'Design Partnership Architects & PlannersおよびDP Architects（Design Partnershipの継続）' },
    'dpa-our-tampines-hub': { name: 'Our Tampines Hub', architectCredit: 'DP Architects、DP Design、DP Green' },
    'dpa-golden-mile-complex': { name: 'Golden Mile Complex', architectCredit: 'DP Architects（歴史的設計者と現在のプロジェクト段階は要精査）' },
    'SGM-0098': { name: '21 Carpenter', architectCredit: 'WOHA' },
    'SGM-0102': { name: 'Oasia Hotel Downtown', architectCredit: 'WOHA' },
    'SGM-0103': { name: 'School of the Arts (SOTA)', architectCredit: 'WOHA' },
    'SGM-0107': { name: 'VivoCity', architectCredit: '伊東豊雄建築設計事務所' },
    'SGM-0108': { name: 'CapitaGreen', architectCredit: '伊東豊雄建築設計事務所' },
    'SGM-0109': { name: 'National Gallery Singapore', architectCredit: 'studioMilou Singapore · CPG Consultants' },
    'SGM-0089': { name: 'Republic Polytechnic', architectCredit: '槇総合計画事務所 · DP Architects' },
    'SGM-0092': { name: 'One Raffles Place Tower One', architectCredit: '丹下健三建築都市設計' },
    'SGM-0093': { name: 'Singapore Indoor Stadium', architectCredit: '丹下健三建築都市設計 · RSP Architects' },
    'SGM-0104': { name: 'Jewel Changi Airport', architectCredit: 'Safdie Architects · RSP Architects' },
    'SGM-0090': { name: 'Wee Cho Yaw Plaza', architectCredit: '伊東豊雄建築設計事務所 · RSP Architects' },
    'SGM-0091': { name: 'The Wave (NTU)', architectCredit: '伊東豊雄建築設計事務所' },
    'SGM-0095': { name: 'Kampung Admiralty', architectCredit: 'WOHA' },
    'SGM-0096': { name: 'SkyVille @ Dawson', architectCredit: 'WOHA' },
    'SGM-0097': { name: 'Enabling Village', architectCredit: 'WOHA' },
    'SGM-0126': { name: 'Mediacorp Campus', architectCredit: '槇総合計画事務所 · DP Architects' },
  },
}

export const getLocaleFromPath = (): Locale => /\/ja(?:\/|$)/.test(window.location.pathname) ? 'ja' : 'en'

export const getBuildingCopy = (locale: Locale, id: string, fallbackName: string): BuildingCopy =>
  buildingCopy[locale][id] ?? { name: fallbackName, architectCredit: '' }

export const localeHref = (locale: Locale, updates: Record<string, string> = {}): string => {
  const basePath = window.location.pathname
    .replace(/\/(en|ja)\/?(?:index\.html)?$/, '/')
    .replace(/\/index\.html$/, '/')
  const search = new URLSearchParams()
  Object.entries(updates).forEach(([key, value]) => {
    if (value) search.set(key, value)
  })
  const query = search.toString()
  return `${basePath}${locale}/${query ? `?${query}` : ''}${window.location.hash}`
}
