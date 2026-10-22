export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 32 32'
      fill='none'
      aria-hidden='true'>
      <rect
        width='32'
        height='32'
        rx='9'
        fill='#ff824d'
      />
      <path
        d='M9 23V11h4v7l6-9h4v12h-4v-7l-6 9H9Z'
        fill='#21150f'
      />
    </svg>
  )
}
