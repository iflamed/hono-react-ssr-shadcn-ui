import Article from "@/components/Article"
import SocialShare from "@/components/SocialShare"
import { BlogPost } from "@/global"
import { Remarkable } from 'remarkable'
const md = new Remarkable('commonmark')

export default function ShowPost({
    post, posts, tags, title, url, image
} : {
    post: BlogPost,
    posts: BlogPost[],
    tags: string[],
    title: string,
    url: string,
    image: string
}) {
    const article = `<h1>${post.title}</h1>` + md.render(post.markdown || '')
    return <div className="w-full min-h-screen p-2 bg-orange-50 flex flex-col justify-start items-center">
        <article className="w-full prose prose-zinc lg:prose-xl prose-h1:text-4xl prose-pre:whitespace-normal prose-code:whitespace-break-spaces prose-li:break-words" dangerouslySetInnerHTML={{
            __html: article,
            }}>
        </article>
        <div className="flex flex-row justify-center items-center">
            <SocialShare title={title} url={url} images={[image]} hashtags={tags} />
        </div>
        <div className="flex flex-col justify-start items-center py-8">
            <h3 className="text-2xl text-orange-500 font-bold my-4">Newest Posts</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:container">
            {posts.map((post) => (
                <a href={`/article/${post.slug}`} key={post.slug} className="group" title={post.title}>
                    <Article post={post} />
                </a>
            ))}
            </div>
        </div>
    </div>
}