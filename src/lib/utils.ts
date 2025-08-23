import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { languages } from '../locales'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPath(req: Request) {
  const url = new URL(req.url)
  let pathname = url.pathname
  for (let idx = 0; idx < languages.length; idx++) {
    if (pathname.startsWith('/' + languages[idx] + '/')) {
      pathname = pathname.replaceAll('/' + languages[idx] + '/', '/')
      break
    }
  }
  return pathname
}
