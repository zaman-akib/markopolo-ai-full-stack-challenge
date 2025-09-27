import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { RealDataSourceService } from '@/services/realDataSourceService'

const realDataService = new RealDataSourceService()

export async function POST(request: NextRequest) {
  try {
    const { accessToken, pixelId, action } = await request.json()

    if (action === 'connect') {
      if (!accessToken || !pixelId) {
        return NextResponse.json(
          { error: 'Access token and pixel ID are required' },
          { status: 400 }
        )
      }

      // Test the connection
      try {
        const testData = await realDataService.fetchFacebookPixelData({
          accessToken,
          pixelId
        })

        // Save the connection
        await prisma.dataSource.upsert({
          where: { name: 'facebook_pixel' },
          update: {
            connected: true,
            config: {
              accessToken,
              pixelId,
              lastSync: new Date().toISOString(),
              testData: JSON.stringify(testData)
            },
            updatedAt: new Date()
          },
          create: {
            name: 'facebook_pixel',
            type: 'analytics',
            connected: true,
            config: {
              accessToken,
              pixelId,
              lastSync: new Date().toISOString(),
              testData: JSON.stringify(testData)
            }
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Facebook Pixel connected successfully',
          data: {
            pixelId: testData.pixelId,
            pageViews: testData.pageViews,
            conversions: testData.conversions,
            conversionRate: testData.conversionRate
          }
        })

      } catch (error) {
        console.error('Facebook Pixel connection test failed:', error)
        return NextResponse.json(
          { error: 'Failed to connect to Facebook Pixel. Please check your credentials.' },
          { status: 401 }
        )
      }
    } else if (action === 'disconnect') {
      await prisma.dataSource.update({
        where: { name: 'facebook_pixel' },
        data: {
          connected: false,
          config: null,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Facebook Pixel disconnected successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Facebook Pixel auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const dataSource = await prisma.dataSource.findFirst({
      where: { name: 'facebook_pixel' }
    })

    if (!dataSource || !dataSource.connected || !dataSource.config) {
      return NextResponse.json({
        connected: false,
        data: null
      })
    }

    // Fetch fresh data
    const config = dataSource.config as any
    const data = await realDataService.fetchFacebookPixelData({
      accessToken: config.accessToken,
      pixelId: config.pixelId
    })

    return NextResponse.json({
      connected: true,
      data,
      lastSync: config.lastSync
    })

  } catch (error) {
    console.error('Error fetching Facebook Pixel data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Facebook Pixel data' },
      { status: 500 }
    )
  }
}