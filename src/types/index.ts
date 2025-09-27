export interface DataSource {
  id: string
  name: 'shopify' | 'facebook_pixel' | 'google_ads'
  type: string
  connected: boolean
  config?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface CampaignOutput {
  id: string
  messageId: string
  payload: CampaignPayload
  channels: string[]
  createdAt: Date
}

export interface CampaignPayload {
  campaign: {
    objective: string
    audience: {
      source: string[]
      filters: Record<string, any>
    }
    channels: Array<{
      type: string
      message: string
      send_time?: string
      start_time?: string
      platform?: string
    }>
  }
}

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  campaign?: CampaignPayload
}

export interface ConnectionRequest {
  dataSource: 'shopify' | 'facebook_pixel' | 'google_ads'
  action: 'connect' | 'disconnect'
  config?: Record<string, any>
  testMode?: boolean
}

export interface ChatRequest {
  message: string
  connectedSources: string[]
  selectedChannels?: Channel[]
}

export type Channel = 'email' | 'sms' | 'push' | 'whatsapp' | 'social_media' | 'display_ads' | 'search_ads' | 'video_ads'

export interface ChannelInfo {
  id: Channel
  name: string
  icon: string
  description: string
  category: 'messaging' | 'advertising' | 'social'
}