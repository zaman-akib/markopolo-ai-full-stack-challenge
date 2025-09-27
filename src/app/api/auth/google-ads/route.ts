import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { RealDataSourceService } from '@/services/realDataSourceService'

const realDataService = new RealDataSourceService()

export async function POST(request: NextRequest) {
  try {
    const { clientId, clientSecret, refreshToken, customerId, action } = await request.json()

    if (action === 'connect') {
      if (!clientId || !clientSecret || !refreshToken || !customerId) {
        return NextResponse.json(
          { error: 'Client ID, client secret, refresh token, and customer ID are required' },
          { status: 400 }
        )
      }

      // Test the connection
      try {
        const testData = await realDataService.fetchGoogleAdsData({
          clientId,
          clientSecret,
          refreshToken,
          customerId
        })

        // Save the connection
        await prisma.dataSource.upsert({
          where: { name: 'google_ads' },
          update: {
            connected: true,
            config: {
              clientId,
              clientSecret,
              refreshToken,
              customerId,
              lastSync: new Date().toISOString(),
              testData: JSON.stringify(testData)
            },
            updatedAt: new Date()
          },
          create: {
            name: 'google_ads',
            type: 'advertising',
            connected: true,
            config: {
              clientId,
              clientSecret,
              refreshToken,
              customerId,
              lastSync: new Date().toISOString(),
              testData: JSON.stringify(testData)
            }
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Google Ads connected successfully',
          data: {
            campaigns: testData.campaigns,
            impressions: testData.impressions,
            clicks: testData.clicks,
            spend: testData.spend
          }
        })

      } catch (error) {
        console.error('Google Ads connection test failed:', error)
        return NextResponse.json(
          { error: 'Failed to connect to Google Ads. Please check your credentials.' },
          { status: 401 }
        )
      }
    } else if (action === 'disconnect') {
      await prisma.dataSource.update({
        where: { name: 'google_ads' },
        data: {
          connected: false,
          config: null,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Google Ads disconnected successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Google Ads auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const dataSource = await prisma.dataSource.findFirst({
      where: { name: 'google_ads' }
    })

    if (!dataSource || !dataSource.connected || !dataSource.config) {
      return NextResponse.json({
        connected: false,
        data: null
      })
    }

    // Fetch fresh data
    const config = dataSource.config as any
    const data = await realDataService.fetchGoogleAdsData({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
      customerId: config.customerId
    })

    return NextResponse.json({
      connected: true,
      data,
      lastSync: config.lastSync
    })

  } catch (error) {
    console.error('Error fetching Google Ads data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Google Ads data' },
      { status: 500 }
    )
  }
}