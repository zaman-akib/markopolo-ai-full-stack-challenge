import { NextRequest, NextResponse } from 'next/server'
import { DataSourceService } from '@/services/dataSourceService'
import { ConnectionRequest } from '@/types'

const dataSourceService = new DataSourceService()

export async function GET() {
  try {
    const dataSources = await dataSourceService.getDataSources()
    return NextResponse.json({ dataSources })
  } catch (error) {
    console.error('Error fetching data sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data sources' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ConnectionRequest = await request.json()

    if (!body.dataSource || !body.action) {
      return NextResponse.json(
        { error: 'Missing required fields: dataSource and action' },
        { status: 400 }
      )
    }

    if (!['connect', 'disconnect'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "connect" or "disconnect"' },
        { status: 400 }
      )
    }

    if (!['shopify', 'facebook_pixel', 'google_ads'].includes(body.dataSource)) {
      return NextResponse.json(
        { error: 'Invalid data source. Must be shopify, facebook_pixel, or google_ads' },
        { status: 400 }
      )
    }

    if (body.action === 'connect') {
      // Skip validation for test mode
      if (!body.testMode) {
        const isValid = await dataSourceService.validateConnection(body.dataSource)
        if (!isValid) {
          return NextResponse.json(
            { error: 'Failed to validate connection' },
            { status: 400 }
          )
        }
      }
    }

    const result = await dataSourceService.connectDataSource(body)

    return NextResponse.json({
      success: true,
      dataSource: result,
      message: `Successfully ${body.action}ed ${body.dataSource}`
    })
  } catch (error) {
    console.error('Error managing data source connection:', error)
    return NextResponse.json(
      { error: 'Failed to manage connection' },
      { status: 500 }
    )
  }
}