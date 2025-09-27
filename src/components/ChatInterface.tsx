'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ChatMessage, DataSource, CampaignPayload, Channel } from '@/types'

interface ChatInterfaceProps {
  dataSources: DataSource[]
  onDataSourceConnect: (name: string, action: 'connect' | 'disconnect') => void
  selectedChannels: Channel[]
}

interface StreamingMessage extends ChatMessage {
  isStreaming?: boolean
  campaign?: CampaignPayload
}

const dataSourceInfo = {
  shopify: { title: 'Shopify', icon: '🛍️', color: 'bg-green-900/30 text-green-400 border-green-500/30' },
  facebook_pixel: { title: 'Facebook Pixel', icon: '📊', color: 'bg-blue-900/30 text-blue-400 border-blue-500/30' },
  google_ads: { title: 'Google Ads', icon: '🎯', color: 'bg-purple-900/30 text-purple-400 border-purple-500/30' }
}

export function ChatInterface({ dataSources, onDataSourceConnect, selectedChannels }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<StreamingMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingCampaign, setStreamingCampaign] = useState<Partial<CampaignPayload> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const connectedSources = dataSources.filter(ds => ds.connected)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingCampaign])

  useEffect(() => {
    fetchChatHistory()
  }, [])

  const fetchChatHistory = async () => {
    try {
      const response = await fetch('/api/chat')
      const data = await response.json()
      if (data.messages) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error fetching chat history:', error)
    }
  }

  const handleDataSourceToggle = async (name: string) => {
    const source = dataSources.find(ds => ds.name === name)
    if (source) {
      await onDataSourceConnect(name, source.connected ? 'disconnect' : 'connect')
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    // Check if at least one data source is connected
    if (connectedSources.length === 0) {
      const userMessage: StreamingMessage = {
        id: `temp_${Date.now()}`,
        content: inputValue,
        role: 'user',
        timestamp: new Date()
      }

      const errorMessage: StreamingMessage = {
        id: `error_${Date.now()}`,
        content: `⚠️ **Connection Required**

To generate targeted campaigns, please connect at least one data source from the sidebar:

🛍️ **Shopify** - E-commerce customer data
📊 **Facebook Pixel** - Website analytics & audience insights
🎯 **Google Ads** - Campaign performance data

💡 **Tip:** Simply click on any data source toggle in the left sidebar to connect and unlock personalized campaign generation!`,
        role: 'assistant',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, userMessage, errorMessage])
      setInputValue('')
      return
    }

    const userMessage: StreamingMessage = {
      id: `temp_${Date.now()}`,
      content: inputValue,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Add streaming message
    const streamingMessageId = `streaming_${Date.now()}`
    const streamingMessage: StreamingMessage = {
      id: streamingMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true
    }

    setMessages(prev => [...prev, streamingMessage])

    try {
      const connectedSourceNames = connectedSources.map(ds => ds.name)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputValue,
          connectedSources: connectedSourceNames,
          selectedChannels: selectedChannels
        })
      })

      const data = await response.json()

      if (response.ok && data.campaign) {
        // Start streaming immediately
        startStreamingByUrl(data.streamUrl, streamingMessageId, data.response, data.campaign)
      } else {
        throw new Error(data.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => prev.filter(m => m.id !== streamingMessageId))

      const errorMessage: StreamingMessage = {
        id: `error_${Date.now()}`,
        content: 'Sorry, there was an error processing your message. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const startStreamingByUrl = (streamUrl: string, messageId: string, finalResponse: string, finalCampaign: CampaignPayload) => {
    const eventSource = new EventSource(streamUrl)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'progress':
            setStreamingCampaign(data.payload)
            break
          case 'complete':
            setStreamingCampaign(data.payload)

            // Update the message with final content and campaign
            setTimeout(() => {
              setMessages(prev => prev.map(msg =>
                msg.id === messageId
                  ? { ...msg, content: finalResponse, isStreaming: false, campaign: finalCampaign }
                  : msg
              ))
              setStreamingCampaign(null)
            }, 500)

            eventSource.close()
            break
          case 'error':
            eventSource.close()
            break
        }
      } catch (error) {
        console.error('Error parsing stream data:', error)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatJsonForCopy = (obj: any) => {
    return JSON.stringify(obj, null, 2)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="flex flex-col h-full bg-[#0f1419] border-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {messages.length === 0 && (
          <div className="max-w-3xl mx-auto text-center py-20">
            <div className="mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">O</span>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Welcome to OmniPulse</h2>
              <p className="text-gray-400 text-lg">AI-powered campaign generator with real-time data integration</p>
            </div>

            <div className="space-y-3 text-left max-w-md mx-auto">
              <div className="text-sm text-gray-400 mb-4">Try asking:</div>
              {[
                "Create a holiday campaign for our customers",
                "Generate a VIP exclusive promotion",
                "Design a back-to-school campaign"
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => setInputValue(example)}
                  className="w-full text-left p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-all text-gray-300 hover:text-white text-sm"
                >
                  "{example}"
                </button>
              ))}
            </div>

            {connectedSources.length === 0 && (
              <div className="mt-8 p-4 bg-amber-900/20 border border-amber-700/30 rounded-lg max-w-md mx-auto">
                <div className="text-amber-400 text-sm">
                  ⚡ Enable data sources in the sidebar to unlock personalized campaigns
                </div>
              </div>
            )}
          </div>
        )}

          {messages.map((message) => (
            <div key={message.id} className="max-w-4xl mx-auto space-y-4">
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center">
                  {message.role === 'user' ? (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">U</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">O</span>
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-white">
                    {message.isStreaming ? (
                      <div className="flex items-center gap-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-gray-400">Generating your campaign...</span>
                      </div>
                    ) : (
                      <div className="prose prose-invert max-w-none">
                        <div className="whitespace-pre-wrap text-gray-200 leading-relaxed">{message.content}</div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-2">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Streaming JSON Display */}
              {(message.isStreaming && streamingCampaign) && (
                <div className="ml-0">
                  <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs max-h-80 overflow-auto border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400">Campaign JSON (Live Generation)</span>
                      <span className="text-yellow-400 animate-pulse">⏳ Generating...</span>
                    </div>
                    <pre className="whitespace-pre-wrap">{formatJsonForCopy(streamingCampaign)}</pre>
                  </div>
                </div>
              )}

              {/* Final JSON Display */}
              {(message.campaign && !message.isStreaming) && (
                <div className="max-w-4xl mx-auto mt-4">
                  <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">📄</span>
                        <span className="text-gray-300 font-medium">Campaign JSON Configuration</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(formatJsonForCopy(message.campaign))}
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-600 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy JSON
                      </button>
                    </div>
                    <div className="bg-black rounded-lg p-4 max-h-96 overflow-auto">
                      <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">{formatJsonForCopy(message.campaign)}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input - Perplexity Style */}
        <div className="p-6 border-t border-gray-700/50 bg-[#0f1419]">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me to create a marketing campaign..."
                disabled={isLoading}
                className="w-full pl-4 pr-12 py-4 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder:text-gray-400 focus:border-blue-500/50 focus:bg-gray-800/70 transition-all text-base resize-none"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 p-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-all"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            </div>

          </div>
        </div>
      </div>
  )
}