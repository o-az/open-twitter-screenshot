/** Only Twitter's fixed HTTPS media origins may enter the image proxy. */
export function validateImageUrl(value: string): URL {
  if (
    value.length > 4096 ||
    !/^https:\/\/(?:pbs|video)\.twimg\.com\//i.test(value) ||
    /[\\\s]/.test(value)
  )
    throw new Error('Invalid image URL')
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    !['pbs.twimg.com', 'video.twimg.com'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.hash
  )
    throw new Error('Invalid image URL')
  return url
}

export function imageUrl(url: string): string {
  return `/api/img?url=${encodeURIComponent(validateImageUrl(url).href)}`
}
