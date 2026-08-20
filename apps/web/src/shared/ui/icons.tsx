import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const defaults = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2,
  viewBox: '0 0 24 24',
}

export function SearchIcon(props: IconProps) {
  return <svg {...defaults} {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
}

export function HomeIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg>
}

export function QrCodeIcon(props: IconProps) {
  return <svg {...defaults} {...props}><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" /><path d="M15 15h2v2h-2zm4 0h2v2m-6 4h2m2-2h2v2" /></svg>
}

export function HeartIcon({ fill = 'none', ...props }: IconProps) {
  return <svg {...defaults} fill={fill} {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" /></svg>
}

export function UserIcon(props: IconProps) {
  return <svg {...defaults} {...props}><circle cx="12" cy="7" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>
}

export function MessageIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /><path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="2.7" /></svg>
}

export function VolumeIcon({ muted, ...props }: IconProps & { muted?: boolean }) {
  return <svg {...defaults} {...props}><path d="M11 5 6 9H2v6h4l5 4z" />{muted ? <path d="m22 9-6 6m0-6 6 6" /> : <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>}</svg>
}

export function PlayIcon(props: IconProps) {
  return <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
}

export function RotateIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
}

export function XIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>
}

export function ChevronLeftIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m15 18-6-6 6-6" /></svg>
}

export function ChevronRightIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m9 18 6-6-6-6" /></svg>
}

export function AccountCircleIcon(props: IconProps) {
  return <svg {...defaults} {...props}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="9" r="3" /><path d="M6.7 18a6 6 0 0 1 10.6 0" /></svg>
}

export function CameraIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M14.5 5 13 3h-2L9.5 5H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" /><circle cx="12" cy="12.5" r="4" /></svg>
}

export function ImageIcon(props: IconProps) {
  return <svg {...defaults} {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></svg>
}
