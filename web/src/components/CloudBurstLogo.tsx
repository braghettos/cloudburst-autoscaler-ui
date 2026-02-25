interface CloudBurstLogoProps {
  className?: string
  size?: number
}

/**
 * CloudBurst logo - matches landing page branding.
 */
export function CloudBurstLogo({ className = '', size = 32 }: CloudBurstLogoProps) {
  return (
    <img
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      aria-hidden
    />
  )
}
