import files from "./files"

export const languages = Object.keys(files)

export function getPath(req: Request) {
  const url = new URL(req.url)
  let pathname = url.pathname
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0) {
    for (let idx = 0; idx < languages.length; idx++) {
      if (segments[0] == languages[idx]) {
        segments.shift()
        pathname = '/' + segments.join('/')
        break
      }
    }
  }
  return pathname
}
