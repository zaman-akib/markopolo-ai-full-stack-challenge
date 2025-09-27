'use client'

import { useState, useEffect } from 'react'
import { CampaignPayload } from '@/types'

interface StreamingOutputProps {
  campaignId?: string
  isStreaming: boolean
  onStreamComplete?: (payload: CampaignPayload) => void
}

export function StreamingOutput({ campaignId, isStreaming, onStreamComplete }: StreamingOutputProps) {
  const [streamData, setStreamData] = useState<Partial<CampaignPayload> | null>(null)
  const [status, setStatus] = useState<string>('Ready to generate...')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!isStreaming || !campaignId) {
      setStreamData(null)
      setStatus('Ready to generate...')
      setIsComplete(false)
      return
    }

    const eventSource = new EventSource(`/api/stream?campaignId=${campaignId}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'start':
            setStatus(data.message)
            setStreamData({})
            break

          case 'progress':
            setStreamData(data.payload)
            setStatus('Generating campaign...')
            break

          case 'complete':
            setStreamData(data.payload)
            setStatus('Campaign generated successfully!')
            setIsComplete(true)
            if (onStreamComplete) {
              onStreamComplete(data.payload)
            }
            eventSource.close()
            break

          case 'error':
            setStatus('Error generating campaign')
            eventSource.close()
            break
        }
      } catch (error) {
        console.error('Error parsing stream data:', error)
      }
    }

    eventSource.onerror = () => {
      setStatus('Connection error')
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [campaignId, isStreaming, onStreamComplete])

  const formatJsonWithHighlight = (obj: any, depth = 0): JSX.Element[] => {
    if (!obj || typeof obj !== 'object') {
      return [<span key="value" className="text-blue-600">{JSON.stringify(obj)}</span>]
    }

    const elements: JSX.Element[] = []
    const indent = '  '.repeat(depth)

    Object.entries(obj).forEach(([key, value], index) => {
      const isLast = index === Object.keys(obj).length - 1

      elements.push(
        <div key={`${depth}-${key}`} className="font-mono text-sm">
          <span className="text-gray-500">{indent}</span>
          <span className="text-purple-600">"{key}"</span>
          <span className="text-gray-500">: </span>
          {typeof value === 'object' && value !== null ? (
            <>
              <span className="text-gray-500">{Array.isArray(value) ? '[' : '{'}</span>
              <div>
                {formatJsonWithHighlight(value, depth + 1)}
              </div>
              <span className="text-gray-500">{indent}{Array.isArray(value) ? ']' : '}'}</span>
            </>
          ) : (
            <span className="text-blue-600">
              {typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}
            </span>
          )}
          {!isLast && <span className="text-gray-500">,</span>}
        </div>
      )
    })

    return elements
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          isStreaming ? 'bg-blue-500 animate-pulse' :
          isComplete ? 'bg-green-500' : 'bg-gray-300'
        }`}></div>
        <span className="text-sm font-medium">{status}</span>
      </div>

      {streamData && (
        <div className="space-y-3">
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 font-mono text-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-400">Campaign JSON Configuration</div>
              <div className="text-xs text-gray-500">
                {isComplete ? '✅ Complete' : '⏳ Generating...'}
              </div>
            </div>
            <div className="whitespace-pre-wrap">
              <span className="text-gray-500">{'{'}</span>
              <div>
                {formatJsonWithHighlight(streamData, 1)}
              </div>
              <span className="text-gray-500">{'}'}</span>
            </div>
          </div>

          {isComplete && (
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border-l-4 border-blue-400">
              💡 <strong>Implementation Ready:</strong> This JSON payload can be copied and integrated directly with your marketing automation platform (Mailchimp, HubSpot, etc.)
            </div>
          )}
        </div>
      )}

      {!isStreaming && !streamData && (
        <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">
          Send a message to generate a campaign and see the streaming output here
        </div>
      )}
    </div>
  )
}