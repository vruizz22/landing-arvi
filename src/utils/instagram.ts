const INSTAGRAM_API_VERSION = 'v25.0'
const INSTAGRAM_DEFAULT_LIMIT = 6

type InstagramMediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | string

interface InstagramMediaApiItem {
  id: string
  caption?: string
  media_type: InstagramMediaType
  media_url?: string
  permalink: string
  thumbnail_url?: string
  timestamp: string
}

interface InstagramMediaApiResponse {
  data?: InstagramMediaApiItem[]
  error?: {
    message?: string
    type?: string
    code?: number
    fbtrace_id?: string
  }
}

export interface InstagramPost {
  id: string
  caption: string
  mediaType: InstagramMediaType
  mediaUrl: string
  permalink: string
  timestamp: string
  altText: string
}

export type InstagramAccount = 'arvi' | 'happy'

interface GetInstagramFeedOptions {
  limit?: number
  /** Cuenta a consultar: 'arvi' (@arvi.cl, por defecto) o 'happy' (@arvihappy) */
  account?: InstagramAccount
  /** Cuántas publicaciones pedir a la API antes de filtrar */
  fetchLimit?: number
}

const getCredentials = (account: InstagramAccount) =>
  account === 'happy'
    ? {
        userId: import.meta.env.INSTAGRAM_HAPPY_USER_ID,
        accessToken: import.meta.env.INSTAGRAM_HAPPY_ACCESS_TOKEN,
      }
    : {
        userId: import.meta.env.INSTAGRAM_USER_ID,
        accessToken: import.meta.env.INSTAGRAM_ACCESS_TOKEN,
      }

const isAllowedMediaType = (mediaType: InstagramMediaType): boolean => {
  return mediaType === 'IMAGE' || mediaType === 'CAROUSEL_ALBUM' || mediaType === 'VIDEO'
}

const getMediaUrl = (item: InstagramMediaApiItem): string | null => {
  if (item.media_type === 'VIDEO') {
    return item.thumbnail_url ?? item.media_url ?? null
  }

  return item.media_url ?? null
}

const createAltText = (caption: string, timestamp: string): string => {
  if (caption.trim().length > 0) {
    return caption.trim().slice(0, 120)
  }

  const formattedDate = new Date(timestamp).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `Publicación de Instagram de ARVI del ${formattedDate}`
}

export const getInstagramFeed = async (
  options: GetInstagramFeedOptions = {},
): Promise<InstagramPost[]> => {
  const limit = options.limit ?? INSTAGRAM_DEFAULT_LIMIT
  const account = options.account ?? 'arvi'
  const { userId, accessToken } = getCredentials(account)

  if (!userId || !accessToken) {
    console.warn(
      `[instagram:${account}] Faltan credenciales (USER_ID / ACCESS_TOKEN). Se renderiza feed vacío.`,
    )
    return []
  }

  const params = new URLSearchParams({
    fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp',
    limit: String(options.fetchLimit ?? limit),
    access_token: accessToken,
  })

  const endpoint = `https://graph.instagram.com/${INSTAGRAM_API_VERSION}/${userId}/media?${params.toString()}`

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status} ${response.statusText} - ${errorText}`)
    }

    const payload = (await response.json()) as InstagramMediaApiResponse

    if (payload.error) {
      throw new Error(payload.error.message ?? 'Error desconocido de Instagram Graph API')
    }

    const posts = (payload.data ?? [])
      .filter((item) => isAllowedMediaType(item.media_type))
      .map((item) => {
        const mediaUrl = getMediaUrl(item)

        if (!mediaUrl) {
          return null
        }

        const caption = item.caption ?? ''

        return {
          id: item.id,
          caption,
          mediaType: item.media_type,
          mediaUrl,
          permalink: item.permalink,
          timestamp: item.timestamp,
          altText: createAltText(caption, item.timestamp),
        } satisfies InstagramPost
      })
      .filter((post): post is InstagramPost => post !== null)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return posts
  } catch (error) {
    console.error(`[instagram:${account}] Error obteniendo feed:`, error)
    return []
  }
}
