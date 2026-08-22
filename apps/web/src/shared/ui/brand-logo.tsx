import type { ImgHTMLAttributes } from 'react'

type BrandLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> & {
  alt?: string
}

export function BrandLogo({ alt = 'Scrozoo', ...props }: BrandLogoProps) {
  return <img alt={alt} src="/logo.svg" {...props} />
}
