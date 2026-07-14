interface IconProps {
  size?: number
  color?: string
}

export const BackIcon = ({ size = 20, color = '#101628' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path d="M12.5 15.8 6.7 10l5.8-5.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const SearchIcon = ({ size = 20, color = '#101628' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <circle cx="9" cy="9" r="6" stroke={color} strokeWidth="1.6" />
    <path d="m13.5 13.5 4 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

export const HeartIcon = ({ size = 20, color = '#101628' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 20.3 4.9 13a4.8 4.8 0 0 1 0-6.7 4.6 4.6 0 0 1 6.6 0l.5.6.5-.6a4.6 4.6 0 0 1 6.6 0 4.8 4.8 0 0 1 0 6.7L12 20.3Z"
      stroke={color}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
)

export const ShareIcon = ({ size = 20, color = '#101628' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3v12M8 6.5 12 3l4 3.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

export const ChevronRight = ({ size = 16, color = '#666d85' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="m6 3.5 4.5 4.5L6 12.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ChevronDown = ({ size = 16, color = '#101628' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="m3.5 6 4.5 4.5L12.5 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const InfoIcon = ({ size = 16, color = '#989fb3' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.4" stroke={color} strokeWidth="1.2" />
    <path d="M8 7.4v3.4" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="8" cy="5.2" r="0.8" fill={color} />
  </svg>
)

export const StarSolid = ({ size = 14, color = '#05af25' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path
      d="M7 .9l1.9 3.8 4.2.6-3 3 .7 4.2L7 10.5l-3.8 2 .7-4.2-3-3 4.2-.6L7 .9Z"
      fill={color}
    />
  </svg>
)
