export const site = {
  name: 'nicexpost',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  description:
    'Good posts deserve a beautiful frame. Turn any public X post into a share-worthy image.',
  storageKey: 'post-studio-v1'
} as const
