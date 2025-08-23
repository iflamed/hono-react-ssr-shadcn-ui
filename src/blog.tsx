import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'
import { Renderer } from './renderer'
import { LanguageDetector, Translatori18n, ViewRenderer } from './middleware'
import { BlogPost, } from './global'
import slugify from '@sindresorhus/slugify'
import { getPath } from './lib/utils'
import db from './db'
import { blog } from './db/schema'
import { asc, lt, eq } from 'drizzle-orm'
import env from './config/env'

type Options = {
    defaultOGImage: string
    blogTitle: string
    blogDescription: string
    urlPrefix: string
    publisher: string
}

export default function createBlogServer({
    defaultOGImage,
    blogTitle,
    blogDescription,
    urlPrefix,
    publisher,
}: Options) {
    const app = new Hono({ getPath })

    app.use(LanguageDetector)
    app.use(Translatori18n)
    app.use(Renderer)
    app.use(ViewRenderer)
    const author = basicAuth(
        {
            verifyUser: (username, password, c) => {
                return (
                    username === env.BLOG_USERNAME && password === env.BLOG_PASSWORD
                )
            },
        }
    )
    app.use('/blog/*', author)
    app.get('/blog/list', async (c) => {
        const values = await db.query.blog.findMany({
            limit: parseInt(c.req.query('limit') || '12'),
            where: lt(blog.id, parseInt(c.req.query('cursor') || '99999999')),
            orderBy: [asc(blog.id)],
        });

        const posts: BlogPost[] = []
        values.forEach((v) => {
            posts.push({
                slug: v.slug,
                title: v.title,
                desc: v.desc,
                banner: v.banner,
                ts: v.ts,
            })
        })
        let cursor = 0
        if (values.length > 0) {
            cursor = values[values.length - 1].id
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
                post: post
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
        const data: any = JSON.parse(body)
        let value = await db.insert(blog).values({
            slug,
            ts,
            title: meta.title,
            desc: meta.description,
            banner: meta.banner,
            markdown: data.markdown,
            lang: meta.lang,
        });
        return c.json({
            status: 0,
            data: value
        })
    })

    app.get('/blog/edit/:idx', async (c) => {
        const slug = c.req.param('idx')
        const post = await db.query.blog.findFirst({
            where: eq(blog.slug, slug)
        });

        if (!post) {
            return c.notFound();
        }
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
                post: post,
            }
        })
    })

    app.put('/blog/:idx', async (c) => {
        const body = await c.req.text()
        const meta = await c.req.json()
        const data: any = JSON.parse(body)
        const key = Date.now()
        let value = await db.update(blog).set({
            title: meta.title,
            markdown: data.markdown,
            desc: meta.description,
            banner: meta.banner,
            lang: meta.lang,
            ts: key
        }).where(eq(blog.slug, c.req.param('idx')));
        return c.json({
            status: 0,
            data: value
        })
    })

    app.delete('/blog/:idx', async (c) => {
        await db.delete(blog).where(eq(blog.slug, c.req.param('idx')));

        return c.json({
            status: 0
        });
    })

    app.get('/blogs', async (c) => {
        const values = await db.query.blog.findMany({
            limit: parseInt(c.req.query('limit') || '18'),
            where: lt(blog.id, parseInt(c.req.query('cursor') || '99999999')),
            orderBy: [asc(blog.id)],
        });

        const posts: BlogPost[] = []
        values.forEach((v) => {
            posts.push({
                slug: v.slug,
                title: v.title,
                desc: v.desc,
                banner: v.banner,
                ts: v.ts,
            })
        })
        let cursor = 0
        if (values.length > 0) {
            cursor = values[values.length - 1].id
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
        const post = await db.query.blog.findFirst({
            where: eq(blog.slug, slug)
        });
        if (!post) {
            return c.notFound();
        }

        const listValue = await db.query.blog.findMany({
            limit: 3,
            orderBy: [asc(blog.id)],
        });

        const posts: BlogPost[] = []
        listValue.forEach((v) => {
            posts.push({
                slug: v.slug,
                title: v.title,
                desc: v.desc,
                banner: v.banner,
                ts: v.ts,
            })
        })
        const url = `${urlPrefix}/article/${slug}`
        return c.view('post', {
            meta: {
                lang: post.lang,
                title: post.title,
                description: post.desc,
                open_graph: {
                    site_name: blogTitle,
                    title: post.title,
                    image: post.banner,
                    url,
                },
                article: {
                    publisher: publisher,
                    publishedAt: (new Date(post.ts)).toISOString(),
                    modifiedAt: (new Date(post.ts)).toISOString(),
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
