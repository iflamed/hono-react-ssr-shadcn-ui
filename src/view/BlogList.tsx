import { BlogPost } from "@/global"
import { ChevronRight, FilePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Article from "@/components/Article"

type AppProps = {
    posts: BlogPost[],
    cursor: string
}

export default function BlogList({ posts, cursor }: AppProps) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-row justify-center items-center mb-8 gap-2">
            <h1 className="text-3xl font-bold text-center">Posts</h1>
            <a href="/blog/new" title="create a new post">
                <Button variant="outline" size="icon">
                    <FilePlus className="h-4 w-4" />
                </Button>
            </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <a href={`/blog/edit/${post.slug}`} key={post.slug} className="group" title={post.title}>
              <Article post={post} />
            </a>
          ))}
        </div>
        {cursor && <div className="flex flex-row justify-center my-4">
            <a href={`/blog/list?cursor=${cursor}`} title="next page">
                <Button>
                    <ChevronRight className="mr-2 h-4 w-4" /> Next Page
                </Button>
            </a>
        </div>}
      </div>
    )
  }