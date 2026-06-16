import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'

export interface SSERequestOptions {
  url: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: any
  onMessage?: (data: string, event?: string) => void
  onError?: (error: any) => void
  onOpen?: () => void
  onClose?: () => void
  signal?: AbortSignal
}

/**
 * SSE stream request utility based on @microsoft/fetch-event-source
 * Supports POST, custom headers, auto-reconnect, and token injection
 */
export function requestSSE(options: SSERequestOptions): AbortController {
  const {
    url,
    method = 'POST',
    headers = {},
    body,
    onMessage,
    onError,
    onOpen,
    onClose,
    signal,
  } = options

  const controller = new AbortController()
  const effectiveSignal = signal || controller.signal

  fetchEventSource(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: effectiveSignal,

    async onopen(response) {
      if (response.ok && response.headers.get('content-type')?.includes(EventStreamContentType)) {
        onOpen?.()
        return
      }
      throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`)
    },

    onmessage(msg) {
      if (msg.event === 'error') {
        onError?.(new Error(msg.data))
        return
      }
      onMessage?.(msg.data, msg.event)
    },

    onclose() {
      onClose?.()
    },

    onerror(err) {
      onError?.(err)
      // Returning nothing will trigger auto-reconnect
      // Throw to stop reconnection
      throw err
    },
  })

  return controller
}

/**
 * Create a one-shot SSE request that collects all messages
 */
export function requestSSEOnce(options: Omit<SSERequestOptions, 'onMessage'>): Promise<string> {
  return new Promise((resolve, reject) => {
    let result = ''

    const controller = requestSSE({
      ...options,
      onMessage: (data) => {
        if (data === '[DONE]') {
          controller.abort()
          resolve(result)
          return
        }
        result += data
      },
      onError: (err) => {
        reject(err)
      },
      onClose: () => {
        resolve(result)
      },
    })
  })
}
