import { Studio } from '#components/studio/studio.tsx'
import { examplePost } from '#lib/tweet/example.ts'

export default function Home() {
  return <Studio example={examplePost} />
}
