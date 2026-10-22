interface EnvironmentVariables extends Cloudflare.Env {
  readonly PORT: string
  readonly VERCEL_URL: string
  readonly VERCEL_BRANCH_URL: string
  readonly NEXT_PUBLIC_SITE_URL: string
  readonly VERCEL_GIT_COMMIT_SHA: string
  readonly VERCEL_GIT_PREVIOUS_SHA: string
  readonly VERCEL_PROJECT_PRODUCTION_URL: string
  readonly NODE_ENV: 'development' | 'production' | 'test'
  readonly VERCEL_ENV: 'development' | 'production' | 'preview'
}

// Node.js `process.env` auto-completion
declare namespace NodeJS {
  interface ProcessEnv extends EnvironmentVariables {}
}

// Bun/vite `import.meta.env` auto-completion
interface ImportMetaEnv extends EnvironmentVariables {}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
