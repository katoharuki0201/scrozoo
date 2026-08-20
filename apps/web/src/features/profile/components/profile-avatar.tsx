export function ProfileAvatar({
  avatarUrl,
  name,
  size = 'large',
}: {
  avatarUrl: string | null
  name: string
  size?: 'large' | 'small'
}) {
  const sizeClass = size === 'large' ? 'size-34 text-3xl' : 'size-14 text-base'

  return (
    <div
      className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-orange-300 to-sky-300 font-black text-white shadow-md`}
    >
      {avatarUrl ? (
        <img alt="" className="size-full object-cover" src={avatarUrl} />
      ) : (
        <span aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  )
}
