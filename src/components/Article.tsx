import { BlogPost } from "@/global";
import TimeAgo from "./TimeAgo";

export default function Article({ post }: {post: BlogPost}) {
    return <article className="h-full flex flex-col bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-xl">
    <img
      src={post.banner}
      alt={post.title}
      className="w-full h-48 object-cover aspect-video"
    />
    <div className="p-4 flex-1 flex flex-col justify-between">
      <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors duration-300 line-clamp-2">
        {post.title}
      </h2>
      <p className="text-gray-600 mb-4 line-clamp-3">{post.desc}</p>
      <time className="text-sm text-gray-500"><TimeAgo ts={new Date(post.ts)} /></time>
    </div>
  </article>
}