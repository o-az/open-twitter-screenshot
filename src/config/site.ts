export const site = {
  name: 'Open Twitter Screenshot',
  url:
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_BRANCH_URL ??
    process.env.VERCEL_URL ??
    process.env.NEXT_PUBLIC_SITE_URL,
  description:
    'Good posts deserve a beautiful frame. Turn any public X post into a share-worthy image.',
  storageKey: 'post-studio-v1'
} as const
