import { NextRequest, NextResponse } from 'next/server'
import { StreamingService } from '@/services/streamingService'
import { CampaignService } from '@/services/campaignService'
import { prisma } from '@/lib/prisma'
import { ChatRequest } from '@/types'

const streamingService = new StreamingService()
const campaignService = new CampaignService()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  const message = searchParams.get('message') || 'Generate campaign'
  const connectedSources = searchParams.get('sources')?.split(',') || []

  if (!campaignId && !message) {
    return NextResponse.json(
      { error: 'Either campaignId or message is required' },
      { status: 400 }
    )
  }

  try {
    let campaign
    if (campaignId) {
      const campaignOutput = await prisma.campaignOutput.findFirst({
        where: { payload: { path: ['campaignId'], equals: campaignId } }
      })

      if (!campaignOutput) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }

      campaign = campaignOutput.payload
    } else {
      campaign = await campaignService.generateCampaign({
        message,
        connectedSources
      })
    }

    const stream = streamingService.createServerSentEventStream(campaign as any)

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })
  } catch (error) {
    console.error('Error creating stream:', error)
    return NextResponse.json(
      { error: 'Failed to create stream' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()

    if (!body.message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const campaign = await campaignService.generateCampaign(body)
    const stream = streamingService.createServerSentEventStream(campaign)

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch (error) {
    console.error('Error creating stream from POST:', error)
    return NextResponse.json(
      { error: 'Failed to create stream' },
      { status: 500 }
    )
  }
}