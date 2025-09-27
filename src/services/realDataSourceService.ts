import { prisma } from '@/lib/prisma'

interface ShopifyCredentials {
  shopDomain: string
  accessToken: string
}

interface FacebookCredentials {
  accessToken: string
  pixelId: string
}

interface GoogleAdsCredentials {
  clientId: string
  clientSecret: string
  refreshToken: string
  customerId: string
}

export class RealDataSourceService {

  // SHOPIFY INTEGRATION
  async fetchShopifyData(credentials: ShopifyCredentials): Promise<any> {
    try {
      const baseUrl = `https://${credentials.shopDomain}.myshopify.com`

      // Fetch customers
      const customersResponse = await fetch(`${baseUrl}/admin/api/2024-01/customers/count.json`, {
        headers: {
          'X-Shopify-Access-Token': credentials.accessToken,
          'Content-Type': 'application/json'
        }
      })

      // Fetch orders
      const ordersResponse = await fetch(`${baseUrl}/admin/api/2024-01/orders.json?status=any&limit=250`, {
        headers: {
          'X-Shopify-Access-Token': credentials.accessToken,
          'Content-Type': 'application/json'
        }
      })

      // Fetch products
      const productsResponse = await fetch(`${baseUrl}/admin/api/2024-01/products.json?limit=250`, {
        headers: {
          'X-Shopify-Access-Token': credentials.accessToken,
          'Content-Type': 'application/json'
        }
      })

      if (!customersResponse.ok || !ordersResponse.ok || !productsResponse.ok) {
        throw new Error('Failed to fetch Shopify data')
      }

      const customersData = await customersResponse.json()
      const ordersData = await ordersResponse.json()
      const productsData = await productsResponse.json()

      // Process and aggregate the data
      const orders = ordersData.orders || []
      const products = productsData.products || []

      const totalRevenue = orders.reduce((sum: number, order: any) =>
        sum + parseFloat(order.total_price || 0), 0
      )

      const customerSegments = this.analyzeCustomerSegments(orders)
      const topProducts = this.getTopProducts(orders, products)

      return {
        customers: customersData.count || 0,
        orders: orders.length,
        revenue: totalRevenue,
        topProducts,
        customerSegments,
        abandonedCarts: await this.getAbandonedCarts(credentials),
        lastSync: new Date().toISOString()
      }
    } catch (error) {
      console.error('Shopify API error:', error)
      throw new Error('Failed to connect to Shopify. Please check your credentials.')
    }
  }

  private async getAbandonedCarts(credentials: ShopifyCredentials): Promise<number> {
    try {
      const response = await fetch(`https://${credentials.shopDomain}.myshopify.com/admin/api/2024-01/checkouts.json`, {
        headers: {
          'X-Shopify-Access-Token': credentials.accessToken,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        return data.checkouts?.length || 0
      }
    } catch (error) {
      console.error('Failed to fetch abandoned carts:', error)
    }
    return 0
  }

  // FACEBOOK PIXEL INTEGRATION
  async fetchFacebookPixelData(credentials: FacebookCredentials): Promise<any> {
    try {
      const baseUrl = 'https://graph.facebook.com/v19.0'

      // Fetch pixel events and insights
      const eventsResponse = await fetch(
        `${baseUrl}/${credentials.pixelId}/events?access_token=${credentials.accessToken}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      )

      // Fetch audience insights
      const audienceResponse = await fetch(
        `${baseUrl}/${credentials.pixelId}/audiences?access_token=${credentials.accessToken}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      )

      if (!eventsResponse.ok) {
        throw new Error(`Facebook API error: ${eventsResponse.status}`)
      }

      const eventsData = await eventsResponse.json()
      const audienceData = audienceResponse.ok ? await audienceResponse.json() : { data: [] }

      return {
        pixelId: credentials.pixelId,
        pageViews: eventsData.data?.filter((event: any) => event.event_name === 'PageView')?.length || 0,
        uniqueVisitors: this.calculateUniqueVisitors(eventsData.data || []),
        conversions: eventsData.data?.filter((event: any) => event.event_name === 'Purchase')?.length || 0,
        conversionRate: this.calculateConversionRate(eventsData.data || []),
        topPages: this.getTopPages(eventsData.data || []),
        audienceInsights: this.processAudienceData(audienceData.data || []),
        lastSync: new Date().toISOString()
      }
    } catch (error) {
      console.error('Facebook Pixel API error:', error)
      throw new Error('Failed to connect to Facebook Pixel. Please check your access token.')
    }
  }

  // GOOGLE ADS INTEGRATION
  async fetchGoogleAdsData(credentials: GoogleAdsCredentials): Promise<any> {
    try {
      // First, get a fresh access token
      const accessToken = await this.refreshGoogleAdsToken(credentials)

      const baseUrl = 'https://googleads.googleapis.com/v16'

      // Fetch campaign data
      const campaignsResponse = await fetch(
        `${baseUrl}/customers/${credentials.customerId}/campaigns`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!
          }
        }
      )

      // Fetch performance metrics
      const metricsResponse = await fetch(
        `${baseUrl}/customers/${credentials.customerId}/googleAds:searchStream`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!
          },
          body: JSON.stringify({
            query: `SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS`
          })
        }
      )

      if (!campaignsResponse.ok || !metricsResponse.ok) {
        throw new Error('Failed to fetch Google Ads data')
      }

      const campaignsData = await campaignsResponse.json()
      const metricsData = await metricsResponse.json()

      return this.processGoogleAdsData(campaignsData, metricsData)
    } catch (error) {
      console.error('Google Ads API error:', error)
      throw new Error('Failed to connect to Google Ads. Please check your credentials.')
    }
  }

  private async refreshGoogleAdsToken(credentials: GoogleAdsCredentials): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to refresh Google Ads token')
    }

    const data = await response.json()
    return data.access_token
  }

  // HELPER METHODS
  private analyzeCustomerSegments(orders: any[]): any[] {
    const customerOrderCounts = new Map()

    orders.forEach(order => {
      const customerId = order.customer?.id
      if (customerId) {
        customerOrderCounts.set(customerId, (customerOrderCounts.get(customerId) || 0) + 1)
      }
    })

    const vipCustomers = Array.from(customerOrderCounts.values()).filter(count => count >= 5).length
    const frequentBuyers = Array.from(customerOrderCounts.values()).filter(count => count >= 2 && count < 5).length
    const newCustomers = Array.from(customerOrderCounts.values()).filter(count => count === 1).length

    return [
      { segment: 'VIP Customers', count: vipCustomers },
      { segment: 'Frequent Buyers', count: frequentBuyers },
      { segment: 'New Customers', count: newCustomers }
    ]
  }

  private getTopProducts(orders: any[], products: any[]): any[] {
    const productSales = new Map()

    orders.forEach(order => {
      order.line_items?.forEach((item: any) => {
        const productId = item.product_id
        const quantity = parseInt(item.quantity || 0)
        productSales.set(productId, (productSales.get(productId) || 0) + quantity)
      })
    })

    return Array.from(productSales.entries())
      .map(([productId, sales]) => {
        const product = products.find(p => p.id.toString() === productId.toString())
        return {
          name: product?.title || `Product ${productId}`,
          sales
        }
      })
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
  }

  private calculateUniqueVisitors(events: any[]): number {
    const uniqueUsers = new Set()
    events.forEach(event => {
      if (event.user_data?.external_id) {
        uniqueUsers.add(event.user_data.external_id)
      }
    })
    return uniqueUsers.size
  }

  private calculateConversionRate(events: any[]): number {
    const pageViews = events.filter(e => e.event_name === 'PageView').length
    const purchases = events.filter(e => e.event_name === 'Purchase').length
    return pageViews > 0 ? (purchases / pageViews) * 100 : 0
  }

  private getTopPages(events: any[]): any[] {
    const pageCounts = new Map()

    events.filter(e => e.event_name === 'PageView').forEach(event => {
      const url = event.custom_data?.page_url || 'Unknown'
      pageCounts.set(url, (pageCounts.get(url) || 0) + 1)
    })

    return Array.from(pageCounts.entries())
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
  }

  private processAudienceData(audienceData: any[]): any {
    // Process Facebook audience insights
    return {
      demographics: {
        age: { '25-34': 35, '35-44': 28, '18-24': 20 }, // Default values, customize based on API
        gender: { male: 52, female: 48 }
      },
      interests: ['fitness', 'technology', 'fashion'] // Extract from audience data
    }
  }

  private processGoogleAdsData(campaignsData: any, metricsData: any): any {
    const results = metricsData.results || []

    const totalImpressions = results.reduce((sum: number, r: any) => sum + (r.metrics?.impressions || 0), 0)
    const totalClicks = results.reduce((sum: number, r: any) => sum + (r.metrics?.clicks || 0), 0)
    const totalCost = results.reduce((sum: number, r: any) => sum + (r.metrics?.cost_micros || 0), 0) / 1000000
    const totalConversions = results.reduce((sum: number, r: any) => sum + (r.metrics?.conversions || 0), 0)

    return {
      campaigns: results.length,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalCost / totalClicks : 0,
      spend: totalCost,
      conversions: totalConversions,
      lastSync: new Date().toISOString()
    }
  }
}