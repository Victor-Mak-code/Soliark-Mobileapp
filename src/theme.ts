export const colors = {
  statusBar: '#1A1A1A',
  olive: '#708238',
  oliveDark: '#5F6E30',
  oliveSoft: 'rgba(112, 130, 56, 0.14)',
  cream: '#F4F1EA',
  creamDeep: '#EBE6DC',
  drawer: '#FFFFFF',
  text: '#1C1917',
  textMuted: '#78716C',
  orange: '#E6A84D',
  terracotta: '#8B4513',
  sage: '#8FA86A',
  shareBlue: '#4A90D9',
  enterprise: '#1A56DB',
  enterpriseSoft: '#DEEAFC',
  cameraBrown: '#A35D43',
  cameraSoft: '#FEF0DB',
  premiumBorder: '#D4A05A',
  cardBorder: 'rgba(28, 25, 23, 0.08)',
  dotInactive: '#E4D9C4',
  divider: 'rgba(28, 25, 23, 0.08)',
  placeholder: '#A8A29A',
  white: '#FFFFFF',
  card: '#FFFFFF',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  success: '#166534',
  successSoft: '#F0FDF4',
  ideasBg: '#F4F2FB',
  ideasPurple: '#6A5CF0',
  ideasMuted: '#6B6780',
  ideasBorder: 'rgba(124, 111, 255, 0.18)',
  tabBar: '#FBF9F4',
  hairline: 'rgba(28, 25, 23, 0.12)',
} as const;

export const spacing = {
  screen: 16,
  card: 16,
  cardRadius: 18,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const type = {
  largeTitle: 32,
  title: 22,
  headline: 17,
  body: 16,
  callout: 15,
  caption: 13,
  mini: 11,
} as const;

export const shadows = {
  card: {
    shadowColor: '#1C1917',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  bar: {
    shadowColor: '#1C1917',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
} as const;
