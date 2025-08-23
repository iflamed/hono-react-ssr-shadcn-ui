"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertCircle, Eye } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BlogPost, Language } from '@/global'
import axios from 'axios'

export default function BlogUpdateForm({ post, languages }: { post: BlogPost, languages: Language[] }) {
    const [lang, setLang] = useState(post.lang || 'en')
    const [title, setTitle] = useState(post.title)
    const [excerpt, setExcerpt] = useState(post.desc)
    const [markdown, setMarkdown] = useState(post.markdown)
    const [imageUrl, setImageUrl] = useState(post.banner)
    const [slug, setSlug] = useState(post.slug || '')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
  
    useEffect(() => {
      // Update state if post prop changes
      setLang(post.lang || 'en')
      setTitle(post.title)
      setExcerpt(post.desc)
      setMarkdown(post.markdown)
      setImageUrl(post.banner)
      setSlug(post.slug || '')
    }, [post])
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setIsLoading(true)
  
      if (!title || !excerpt || !markdown || !imageUrl || !lang) {
        setError("All fields are required")
        setIsLoading(false)
        return
      }
  
      try {
        if (post.slug) {
            await axios.put(`/blog/${post.slug}`, {
                description: excerpt,
                banner: imageUrl,
                markdown: markdown,
                lang,
                title,
            })
        } else {
            await axios.post(`/blog/create`, {
                description: excerpt,
                banner: imageUrl,
                markdown: markdown,
                lang,
                title,
                slug,
            })
        }
  
        // Redirect to blog list page after successful update
        document.location.href = '/blog/list'
      } catch (err) {
        setError("Failed to update blog post. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    const deletePost = async () => {
        if (window.confirm("Do you really want to delete this post?")) {
            axios.delete(`/blog/${post.slug}`).then(() => {
                document.location.href = '/blog/list'
            })
        }          
    }
  
    return (
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg">
        <div className="flex flex-row gap-2 justify-start items-center">
            <h1 className="text-2xl font-bold">
                {post.slug ? 'Update Blog Post': 'New Blog Post'}
            </h1>
            {post.slug && <a href={`/article/${post.slug}`} title='preview blog' target='_blank'>
                <Button type="button">
                    <Eye className='w-4 h-4' />
                </Button>
            </a>}
        </div>
  
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
  
        <div className="space-y-2">
          <Label htmlFor="title">Language</Label>
          <Select value={lang} onValueChange={(v) => setLang(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Languages</SelectLabel>
                {languages.map((lang) => (<SelectItem value={lang.code} key={lang.code}>{lang.name}({lang.nativeName})</SelectItem>))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter blog title"
          />
        </div>
  
        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Enter blog excerpt"
            rows={4}
          />
        </div>
  
        <div className="space-y-2">
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Enter banner URL"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Markdown Content</Label>
          <Textarea
            id="excerpt"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Enter blog content with markdown format"
            rows={12}
          />
        </div>
        {!post.slug && <div className="space-y-2">
          <Label htmlFor="slug">URL Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Enter the url slug with out space"
          />
        </div>}
  
        <div className="flex flex-row justify-start items-center gap-2">
            <Button type="submit" className="w-48" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Save Blog Post'}
            </Button>
            {post.slug && <Button type="button" className="w-48" variant="destructive" onClick={deletePost}>
                Delete
            </Button>}
        </div>
      </form>
    )
  }