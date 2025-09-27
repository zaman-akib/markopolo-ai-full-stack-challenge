import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { RealDataSourceService } from '@/services/realDataSourceService'

const realDataService = new RealDataSourceService()

export async function POST(request: NextRequest) {
  try {
    const { shopDomain, accessToken, action } = await request.json()

    if (action === 'connect') {
      if (!shopDomain || !accessToken) {
        return NextResponse.json(
          { error: 'Shop domain and access token are required' },
          { status: 400 }
        )
      }

      // Test the connection
      try {
        const testData = await realDataService.fetchShopifyData({
          shopDomain,
          accessToken
        })

        // Save the connection
        await prisma.dataSource.upsert({
          where: { name: 'shopify' },
          update: {
            connected: true,
            config: {
              shopDomain,
              accessToken,
              lastSync: new Date().toISOString(),
              testData: JSON.stringify(testData)
            },
            updatedAt: new Date()
          },
          create: {
            name: 'shopify',
            type: 'ecommerce',
            connected: true,
            config: {
              shopDomain,
              accessToken,
              lastSync: new Date().toISOString(),
              testData: JSON.stringify(testData)
            }
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Shopify connected successfully',
          data: {
            customers: testData.customers,
            orders: testData.orders,
            revenue: testData.revenue
          }
        })

      } catch (error) {
        console.error('Shopify connection test failed:', error)
        return NextResponse.json(
          { error: 'Failed to connect to Shopify. Please check your credentials.' },
          { status: 401 }
        )
      }
    } else if (action === 'disconnect') {
      await prisma.dataSource.update({
        where: { name: 'shopify' },
        data: {
          connected: false,
          config: null,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Shopify disconnected successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Shopify auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const dataSource = await prisma.dataSource.findFirst({
      where: { name: 'shopify' }
    })

    if (!dataSource || !dataSource.connected || !dataSource.config) {
      return NextResponse.json({
        connected: false,
        data: null
      })
    }

    // Fetch fresh data
    const config = dataSource.config as any
    const data = await realDataService.fetchShopifyData({
      shopDomain: config.shopDomain,
      accessToken: config.accessToken
    })

    return NextResponse.json({
      connected: true,
      data,
      lastSync: config.lastSync
    })

  } catch (error) {
    console.error('Error fetching Shopify data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Shopify data' },
      { status: 500 }
    )
  }
}