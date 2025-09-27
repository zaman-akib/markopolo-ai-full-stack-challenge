import { prisma } from '@/lib/prisma'
import { CampaignPayload, Channel, ChatRequest } from '@/types'
import { DataSourceService } from './dataSourceService'

export class CampaignService {
  private dataSourceService: DataSourceService

  constructor() {
    this.dataSourceService = new DataSourceService()
  }

  async generateCampaign(request: ChatRequest): Promise<CampaignPayload> {
    const connectedData = await this.gatherDataFromSources(request.connectedSources)
    const objective = this.determineObjective(request.message)
    const audience = this.analyzeAudience(connectedData, request.message)

    // If no channels selected, use all available channels
    const channelsToUse = request.selectedChannels && request.selectedChannels.length > 0
      ? request.selectedChannels
      : ['email', 'sms', 'whatsapp', 'display_ads'] as Channel[]

    const channels = this.generateChannels(request.message, audience, connectedData, channelsToUse)

    return {
      campaign: {
        objective,
        audience: {
          source: request.connectedSources.map(source => {
            const sourceNames: Record<string, string> = {
              'shopify': 'Shopify',
              'facebook_pixel': 'Facebook Pixel',
              'google_ads': 'Google Ads Tag'
            }
            return sourceNames[source] || source
          }),
          filters: this.generateFilters(request.message, connectedData)
        },
        channels
      }
    }
  }

  async saveCampaignOutput(messageId: string, payload: CampaignPayload): Promise<void> {
    await prisma.campaignOutput.create({
      data: {
        messageId,
        payload: payload as any,
        channels: payload.campaign.channels.map(ch => ch.type)
      }
    })
  }

  private determineObjective(message: string): string {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('abandon') || lowerMessage.includes('cart')) {
      return 'Retarget abandoned carts'
    } else if (lowerMessage.includes('holiday') || lowerMessage.includes('seasonal')) {
      return 'Holiday seasonal campaign'
    } else if (lowerMessage.includes('vip') || lowerMessage.includes('exclusive')) {
      return 'VIP customer engagement'
    } else if (lowerMessage.includes('new') || lowerMessage.includes('launch')) {
      return 'New product launch'
    } else if (lowerMessage.includes('sale') || lowerMessage.includes('discount')) {
      return 'Promotional sale campaign'
    } else if (lowerMessage.includes('back') && lowerMessage.includes('school')) {
      return 'Back-to-school campaign'
    } else {
      return 'Customer engagement and retention'
    }
  }

  private generateFilters(message: string, connectedData: Record<string, any>): Record<string, any> {
    const filters: Record<string, any> = {}
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('abandon') || lowerMessage.includes('cart')) {
      filters.cart_status = 'abandoned'
      filters.last_activity = 'within_7_days'
    } else if (lowerMessage.includes('vip') || lowerMessage.includes('high value')) {
      filters.customer_tier = 'vip'
      filters.lifetime_value = 'above_500'
    } else if (lowerMessage.includes('new')) {
      filters.customer_type = 'new'
      filters.registration_date = 'within_30_days'
    } else {
      filters.engagement_level = 'active'
      filters.last_purchase = 'within_90_days'
    }

    return filters
  }

  private generateChannels(message: string, audience: any, connectedData: Record<string, any>, selectedChannels: Channel[]): Array<{
    type: string
    message: string
    send_time?: string
    start_time?: string
    platform?: string
  }> {
    const channels: Array<{
      type: string
      message: string
      send_time?: string
      start_time?: string
      platform?: string
    }> = []
    const now = new Date()
    const lowerMessage = message.toLowerCase()

    // Determine message content based on objective
    let emailMessage = 'We have something special waiting for you!'
    let smsMessage = 'Don\'t miss out - check your email for details!'
    let whatsappMessage = 'Need help with your order? Chat with us now!'
    let adsMessage = 'Come back and discover what\'s new!'

    if (lowerMessage.includes('abandon') || lowerMessage.includes('cart')) {
      emailMessage = 'You left something behind! Complete your purchase now and get 10% off.'
      smsMessage = 'Still thinking it over? Your cart is waiting. Tap to finish checkout.'
      whatsappMessage = 'Need help with your order? Chat with us now!'
      adsMessage = 'Your cart is still here. Come back and save 10%.'
    } else if (lowerMessage.includes('holiday')) {
      emailMessage = 'Our holiday collection is here! Shop now for the best selection.'
      smsMessage = 'Holiday deals are live! Shop now before they\'re gone.'
      whatsappMessage = 'Get holiday gift recommendations from our experts!'
      adsMessage = 'Holiday savings start now - discover our festive collection.'
    } else if (lowerMessage.includes('vip')) {
      emailMessage = 'Exclusive VIP offer just for you - early access to our latest collection.'
      smsMessage = 'VIP exclusive: Get early access + free shipping on your next order.'
      whatsappMessage = 'Your VIP benefits are ready - chat with us for personalized service!'
      adsMessage = 'VIP members get exclusive access - join the club today.'
    }

    // Map the channel types to their display names and generate messages
    const channelMapping: Record<string, { type: string; platform?: string }> = {
      email: { type: 'Email' },
      sms: { type: 'SMS' },
      whatsapp: { type: 'WhatsApp' },
      display_ads: { type: 'Display Ads', platform: 'Google' }
    }

    // Only generate channels that are selected
    selectedChannels.forEach(channelId => {
      const channelInfo = channelMapping[channelId]
      if (!channelInfo) return

      let channelMessage = ''
      let sendTime = new Date(now)

      // Set appropriate message and timing based on channel type
      switch (channelId) {
        case 'email':
          channelMessage = emailMessage
          sendTime.setHours(18, 0, 0, 0)
          if (sendTime <= now) {
            sendTime.setDate(sendTime.getDate() + 1)
          }
          channels.push({
            type: channelInfo.type,
            message: channelMessage,
            send_time: sendTime.toISOString()
          })
          break

        case 'sms':
          channelMessage = smsMessage
          sendTime.setHours(18, 30, 0, 0)
          if (sendTime <= now) {
            sendTime.setDate(sendTime.getDate() + 1)
          }
          channels.push({
            type: channelInfo.type,
            message: channelMessage,
            send_time: sendTime.toISOString()
          })
          break

        case 'whatsapp':
          channelMessage = whatsappMessage
          sendTime.setHours(19, 30, 0, 0)
          if (sendTime <= now) {
            sendTime.setDate(sendTime.getDate() + 1)
          }
          channels.push({
            type: channelInfo.type,
            message: channelMessage,
            send_time: sendTime.toISOString()
          })
          break

        case 'display_ads':
          channelMessage = adsMessage
          sendTime.setDate(sendTime.getDate() + 1)
          sendTime.setHours(0, 0, 0, 0)
          channels.push({
            type: channelInfo.type,
            platform: channelInfo.platform,
            message: channelMessage,
            start_time: sendTime.toISOString()
          })
          break
      }
    })

    return channels
  }

  private async gatherDataFromSources(sources: string[]): Promise<Record<string, any>> {
    const data: Record<string, any> = {}

    for (const source of sources) {
      try {
        data[source] = await this.dataSourceService.fetchMockData(source)
      } catch (error) {
        console.error(`Failed to fetch data from ${source}:`, error)
        data[source] = null
      }
    }

    return data
  }

  private analyzeAudience(data: Record<string, any>, userMessage: string): any {
    // This method is kept for compatibility but simplified since we use the new structure
    return {
      segment: this.determineSegment(userMessage, []),
      size: 5000,
      characteristics: ['general_users']
    }
  }


  private determineSegment(message: string, characteristics: string[]): string {
    const lowerMessage = message.toLowerCase()
    if (lowerMessage.includes('holiday') || lowerMessage.includes('seasonal')) {
      return 'holiday_shoppers'
    }
    if (lowerMessage.includes('vip') || lowerMessage.includes('premium')) {
      return 'vip_customers'
    }
    if (lowerMessage.includes('new') || lowerMessage.includes('launch')) {
      return 'early_adopters'
    }
    return 'general_audience'
  }
}