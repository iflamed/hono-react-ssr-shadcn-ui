import files from "./files"

export const languages = Object.keys(files)

export function getPath(req: Request) {
  const url = new URL(req.url)
  let pathname = url.pathname
  const segments = pathname.split('/')
  if (segments.length > 1) {
    for (let idx = 0; idx < languages.length; idx++) {
      if (segments[1] == languages[idx]) {
        pathname = pathname.slice(languages[idx].length + 1) || '/'
        break
      }
    }
  }
  return pathname
}
