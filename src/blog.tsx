import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'
import { Renderer } from './renderer'
import { LanguageDetector, Translatori18n, ViewRenderer } from './middleware'
import { BlogPost, } from './global'
import slugify from '@sindresorhus/slugify'
import { getPath } from './locales'
import ISO6391 from 'iso-639-1'

type Bindings = {
    blog: KVNamespace
    BLOG_USERNAME: string
    BLOG_PASSWORD: string
}

type Options = {
    defaultOGImage: string
    blogTitle: string
    blogDescription: string
    urlPrefix: string
    publisher: string
}

const languages = ISO6391.getLanguages(ISO6391.getAllCodes())

export default function createBlogServer({
    defaultOGImage,
    blogTitle,
    blogDescription,
    urlPrefix,
    publisher,
}: Options) {
    const app = new Hono<{ Bindings: Bindings }>({ getPath })

    app.use(LanguageDetector)
    app.use(Translatori18n)
    app.use(Renderer)
    app.use(ViewRenderer)
    const author = basicAuth(
        {
            verifyUser: (username, password, c) => {
                return (
                    username === c.env.BLOG_USERNAME && password === c.env.BLOG_PASSWORD
                )
            },
        }
    )
    app.use('/blog/*', author)
    app.get('/blog/list', async (c) => {
        const value = await c.env.blog.list({
            limit: parseInt(c.req.query('limit') || '12'),
            cursor: c.req.query('cursor'),
        });

        const posts: BlogPost[] = []
        value.keys.forEach((e) => {
            const meta: BlogPost = e.metadata as BlogPost
            posts.push({
                slug: e.name,
                title: meta.title,
                desc: meta.desc,
                banner: meta.banner,
                ts: meta.ts,
            })
        })
        let cursor = ''
        if (!value.list_complete) {
            cursor = value.cursor
        }
        return c.view('bloglist', {
            meta: {
                title: blogTitle + ' - blog posts',
                description: blogTitle + ' - blog posts',
                open_graph: {
                    site_name: blogTitle,
                    title: blogTitle + ' - blog posts',
                    image: defaultOGImage,
                    url: `${urlPrefix}/blog/list`
                }
            },
            props: {
                posts: posts,
                cursor: cursor,
            }
        })
    })

    app.get('/blog/new', (c) => {
        const post = {
            slug: '',
            title: '',
            desc: '',
            banner: '',
            markdown: '',
            ts: 0
        }
        return c.view('blogupdateform', {
            meta: {
                title: blogTitle + ' - new blog post',
                description: blogTitle + ' - new blog post',
                open_graph: {
                    site_name: blogTitle,
                    title: blogTitle + ' - new blog post',
                    image: defaultOGImage,
                    url: `${urlPrefix}/blog/new`
                }
            },
            props: {
                post,
                languages
            }
        })
    })

    app.post('/blog/create', async (c) => {
        const body = await c.req.text()
        const meta = await c.req.json()
        const ts = Date.now()
        const key = 9999999999999 - ts
        let slug = ''
        if (meta.slug) {
            meta.slug = meta.slug.trim()
        }
        if (!meta.slug) {
            slug = key + '-' + slugify(meta.title.replaceAll('.', ''))
        } else {
            slug = key + '-' + meta.slug.replace(/\s+/g, '-')
        }
        let value = await c.env.blog.put(slug, body, {
            metadata: {
                title: meta.title,
                desc: meta.description,
                banner: meta.banner,
                lang: meta.lang,
                ts: ts
            }
        });
        return c.json({
            status: 0,
            data: value
        })
    })

    app.get('/blog/edit/:idx', async (c) => {
        const slug = c.req.param('idx')
        const value = await c.env.blog.get(slug);

        const post = JSON.parse(value as string)
        post.slug = slug
        post.desc = post.description
        return c.view('blogupdateform', {
            meta: {
                title: blogTitle + ' - edit blog post',
                description: blogTitle + ' - edit blog post',
                open_graph: {
                    site_name: blogTitle,
                    title: blogTitle + ' - edit blog post',
                    image: defaultOGImage,
                    url: `${urlPrefix}/blog/${slug}`
                }
            },
            props: {
                post,
                languages,
            }
        })
    })

    app.put('/blog/:idx', async (c) => {
        const body = await c.req.text()
        const meta = await c.req.json()
        const key = Date.now()
        let value = await c.env.blog.put(c.req.param('idx'), body, {
            metadata: {
                title: meta.title,
                desc: meta.description,
                banner: meta.banner,
                lang: meta.lang,
                ts: key
            }
        });
        return c.json({
            status: 0,
            data: value
        })
    })

    app.delete('/blog/:idx', async (c) => {
        await c.env.blog.delete(c.req.param('idx'));

        return c.json({
            status: 0
        });
    })

    app.get('/blogs', async (c) => {
        const value = await c.env.blog.list({
            limit: parseInt(c.req.query('limit') || '18'),
            cursor: c.req.query('cursor'),
        });

        const posts: BlogPost[] = []
        value.keys.forEach((e) => {
            const meta: BlogPost = e.metadata as BlogPost
            posts.push({
                slug: e.name,
                title: meta.title,
                desc: meta.desc,
                banner: meta.banner,
                ts: meta.ts,
            })
        })
        let cursor = ''
        if (!value.list_complete) {
            cursor = value.cursor
        }
        return c.view('blogs', {
            meta: {
                title: blogTitle + ' - ' + blogDescription,
                description: blogTitle + ' - ' + blogDescription,
                open_graph: {
                    site_name: blogTitle,
                    title: blogTitle + ' - ' + blogDescription,
                    image: defaultOGImage,
                    url: `${urlPrefix}/blogs`
                }
            },
            props: {
                posts: posts,
                cursor: cursor,
            }
        })
    })

    app.get('/article/:idx', async (c) => {
        const slug = c.req.param('idx')
        const value = await c.env.blog.getWithMetadata(slug);
        const post = JSON.parse(value.value as string)
        const postMeta = value.metadata as BlogPost

        const listValue = await c.env.blog.list({
            limit: 3,
        });

        const posts: BlogPost[] = []
        listValue.keys.forEach((e) => {
            const meta: BlogPost = e.metadata as BlogPost
            posts.push({
                slug: e.name,
                title: meta.title,
                desc: meta.desc,
                banner: meta.banner,
                ts: meta.ts,
            })
        })
        const url = `${urlPrefix}/article/${slug}`
        return c.view('post', {
            meta: {
                lang: post.lang,
                title: post.title,
                description: post.description,
                open_graph: {
                    site_name: blogTitle,
                    title: post.title,
                    image: post.banner,
                    url,
                },
                article: {
                    publisher: publisher,
                    publishedAt: (new Date(postMeta.ts)).toISOString(),
                    modifiedAt: (new Date(postMeta.ts)).toISOString(),
                }
            },
            props: {
                title: post.title,
                image: post.banner,
                tags: ['hichly', 'buildinpublic', 'indiedev', 'marketing'],
                url,
                post,
                posts,
            }
        })
    })

    return app
}
