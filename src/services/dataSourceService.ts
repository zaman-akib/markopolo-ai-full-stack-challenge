import { prisma } from '@/lib/prisma'
import { DataSource, ConnectionRequest } from '@/types'
import { mockDataLoader } from '@/mock-data'

export class DataSourceService {
  async getDataSources(): Promise<DataSource[]> {
    const availableDataSources = [
      { name: 'shopify', type: 'ecommerce' },
      { name: 'facebook_pixel', type: 'analytics' },
      { name: 'google_ads', type: 'advertising' }
    ]

    const result: DataSource[] = []

    for (const source of availableDataSources) {
      try {
        let existingSource = await prisma.dataSource.findFirst({
          where: { name: source.name }
        })

        if (!existingSource) {
          existingSource = await prisma.dataSource.create({
            data: {
              name: source.name as any,
              type: source.type,
              connected: false
            }
          })
        }

        result.push(existingSource)
      } catch (error) {
        // If database fails, return mock data
        result.push({
          id: `mock_${source.name}`,
          name: source.name as any,
          type: source.type,
          connected: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    }

    return result
  }

  async connectDataSource(request: ConnectionRequest): Promise<DataSource> {
    const existingSource = await prisma.dataSource.findFirst({
      where: { name: request.dataSource }
    })

    const config = request.testMode
      ? { testMode: true, connectedAt: new Date().toISOString(), ...request.config }
      : request.config

    if (existingSource) {
      return await prisma.dataSource.update({
        where: { id: existingSource.id },
        data: {
          connected: request.action === 'connect',
          config: config || existingSource.config,
          updatedAt: new Date()
        }
      })
    }

    if (request.action === 'connect') {
      return await prisma.dataSource.create({
        data: {
          name: request.dataSource,
          type: this.getDataSourceType(request.dataSource),
          connected: true,
          config: config
        }
      })
    }

    throw new Error('Data source not found')
  }

  async validateConnection(dataSource: string): Promise<boolean> {
    const mockValidation = await this.simulateApiCall(dataSource)
    return mockValidation.success
  }

  async fetchMockData(dataSource: string): Promise<any> {
    // First, check if we should use mock data based on test mode
    try {
      const connectedSource = await prisma.dataSource.findFirst({
        where: { name: dataSource, connected: true }
      })

      if (connectedSource && connectedSource.config) {
        const config = connectedSource.config as any

        // If test mode is enabled, always return mock data
        if (config.testMode) {
          console.log(`Using mock data for ${dataSource} (test mode enabled)`)
          return this.getMockDataForSource(dataSource)
        }

        // Otherwise, try to fetch real data
        const endpoint = `/api/auth/${dataSource.replace('_', '-')}`
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${endpoint}`)

        if (response.ok) {
          const result = await response.json()
          if (result.connected && result.data) {
            return result.data
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch real data for ${dataSource}, falling back to mock data:`, error)
    }

    // Fall back to mock data
    return this.getMockDataForSource(dataSource)
  }

  private getMockDataForSource(dataSource: string): any {
    try {
      return mockDataLoader.loadMockData(dataSource)
    } catch (error) {
      console.error(`Failed to load mock data for ${dataSource}:`, error)
      // Fallback to hardcoded data if file reading fails
      switch (dataSource) {
        case 'shopify':
          return this.getShopifyMockData()
        case 'facebook_pixel':
          return this.getFacebookPixelMockData()
        case 'google_ads':
          return this.getGoogleAdsMockData()
        default:
          throw new Error(`Unknown data source: ${dataSource}`)
      }
    }
  }

  private getDataSourceType(name: string): string {
    const types = {
      shopify: 'ecommerce',
      facebook_pixel: 'analytics',
      google_ads: 'advertising'
    }
    return types[name as keyof typeof types] || 'unknown'
  }

  private async simulateApiCall(dataSource: string): Promise<{ success: boolean }> {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: Math.random() > 0.1 }
  }

  private getShopifyMockData() {
    return {
      customers: 15420,
      orders: 3240,
      revenue: 425600,
      topProducts: [
        { name: 'Winter Coat', sales: 234 },
        { name: 'Running Shoes', sales: 189 },
        { name: 'Coffee Mug', sales: 156 }
      ],
      customerSegments: [
        { segment: 'VIP Customers', count: 890 },
        { segment: 'Frequent Buyers', count: 2340 },
        { segment: 'New Customers', count: 1240 }
      ]
    }
  }

  private getFacebookPixelMockData() {
    return {
      pageViews: 45230,
      uniqueVisitors: 12400,
      conversions: 342,
      conversionRate: 2.76,
      topPages: [
        { page: '/products', views: 8920 },
        { page: '/checkout', views: 3450 },
        { page: '/cart', views: 2340 }
      ],
      audienceInsights: {
        demographics: {
          age: { '25-34': 35, '35-44': 28, '18-24': 20 },
          gender: { male: 52, female: 48 }
        },
        interests: ['fitness', 'technology', 'fashion']
      }
    }
  }

  private getGoogleAdsMockData() {
    return {
      campaigns: 8,
      impressions: 234500,
      clicks: 4320,
      ctr: 1.84,
      cpc: 2.45,
      spend: 10584,
      conversions: 156,
      topKeywords: [
        { keyword: 'running shoes', clicks: 890 },
        { keyword: 'winter clothing', clicks: 620 },
        { keyword: 'fitness gear', clicks: 540 }
      ],
      performance: {
        searchNetwork: { impressions: 180000, clicks: 3200 },
        displayNetwork: { impressions: 54500, clicks: 1120 }
      }
    }
  }
}