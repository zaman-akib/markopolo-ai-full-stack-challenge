import { NextRequest, NextResponse } from 'next/server'
import { CampaignService } from '@/services/campaignService'
import { prisma } from '@/lib/prisma'
import { ChatRequest } from '@/types'

const campaignService = new CampaignService()

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()

    if (!body.message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!body.connectedSources || body.connectedSources.length === 0) {
      return NextResponse.json(
        { error: 'At least one data source connection is required to generate campaigns' },
        { status: 400 }
      )
    }


    const messageId = `msg_${Date.now()}`

    await prisma.chatMessage.create({
      data: {
        id: messageId,
        content: body.message,
        role: 'user',
        timestamp: new Date()
      }
    })

    const campaign = await campaignService.generateCampaign(body)

    await campaignService.saveCampaignOutput(messageId, campaign)

    const responseContent = generateResponseMessage(campaign)

    const assistantMessageId = `msg_${Date.now()}_assistant`
    await prisma.chatMessage.create({
      data: {
        id: assistantMessageId,
        content: responseContent,
        role: 'assistant',
        timestamp: new Date(),
        campaign: campaign as any
      }
    })

    return NextResponse.json({
      messageId: assistantMessageId,
      response: responseContent,
      campaign,
      streamUrl: `/api/stream?message=${encodeURIComponent(body.message)}&sources=${body.connectedSources.join(',')}`
    })
  } catch (error) {
    console.error('Error processing chat message:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const messages = await prisma.chatMessage.findMany({
      orderBy: { timestamp: 'asc' },
      take: 50
    })

    // Format messages to include campaign data properly
    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      role: message.role,
      timestamp: message.timestamp,
      campaign: message.campaign || undefined
    }))

    return NextResponse.json({ messages: formattedMessages })
  } catch (error) {
    console.error('Error fetching chat history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    )
  }
}

function generateResponseMessage(campaign: any): string {
  return `Campaign generated successfully. The JSON configuration is displayed below.`
}