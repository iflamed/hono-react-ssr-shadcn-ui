import { BlogPost } from "@/global"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Article from "@/components/Article"

type AppProps = {
    posts: BlogPost[],
    cursor: number,
}

export default function Blogs({ posts, cursor }: AppProps) {
    const year = (new Date()).getFullYear()
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-row justify-center items-center mb-8 gap-2">
            <h1 className="text-3xl font-bold text-center">Articles</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <a href={`/article/${post.slug}`} key={post.slug} className="group" title={post.title}>
              <Article post={post} />
            </a>
          ))}
        </div>
        {cursor > 0 && <div className="flex flex-row justify-center my-4">
            <a href={`/blogs?cursor=${cursor}`} title="next page">
                <Button>
                    <ChevronRight className="mr-2 h-4 w-4" /> Next Page
                </Button>
            </a>
        </div>}
      </div>
    )
  }