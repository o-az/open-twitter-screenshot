import { Studio } from "@/components/studio/studio";
import { examplePost } from "@/lib/tweet/example";

export default function Home() {
  return <Studio example={examplePost} />;
}
