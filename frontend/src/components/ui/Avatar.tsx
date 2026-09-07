import { useState } from 'react'
import { cn, initials } from '@/lib/utils'
import type { User } from '@/types'

type Size = 'xs' | 'sm' | 'md' | 'lg'

const SIZES: Record<Size, string> = {
  xs: 'size-5 text-[9px]',
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
}

interface AvatarProps {
  user: Pick<User, 'name' | 'avatar_url'> | null | undefined
  size?: Size
  className?: string
}

export function Avatar({ user, size = 'sm', className }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const name = user?.name ?? '?'
  const showImage = user?.avatar_url && !failed

  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-graphite2 font-semibold text-txt2 ring-1 ring-line',
        SIZES[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={user.avatar_url as string}
          alt={name}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  )
}
