import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { RealDataSourceService } from '@/services/realDataSourceService'

const realDataService = new RealDataSourceService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const shop = searchParams.get('shop')
    const error = searchParams.get('error')

    // Check if this is being called from the popup callback page
    // We'll assume it's a popup callback if it's a fetch request (has Content-Type header)
    const isPopupCallback = request.headers.get('content-type') === 'application/json' ||
                            request.headers.get('referer')?.includes('/auth/shopify/callback')

    console.log('API Callback called:', {
      isPopupCallback,
      hasContentType: !!request.headers.get('content-type'),
      referer: request.headers.get('referer'),
      code: !!code,
      state: !!state,
      shop,
      error
    })

    if (error) {
      if (isPopupCallback) {
        return NextResponse.json({ error: 'shopify_auth_denied' }, { status: 400 })
      }
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?error=shopify_auth_denied`
      )
    }

    if (!code || !shop || !state) {
      if (isPopupCallback) {
        return NextResponse.json({ error: 'invalid_callback' }, { status: 400 })
      }
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?error=invalid_callback`
      )
    }

    // Retrieve stored credentials using the state
    console.log('Looking for stored state:', state)
    console.log('Available states:', global.shopifyOAuthStates ? Array.from(global.shopifyOAuthStates.keys()) : 'none')

    const storedData = global.shopifyOAuthStates?.get(state)
    if (!storedData) {
      console.error('State not found in storage')
      if (isPopupCallback) {
        return NextResponse.json({ error: 'state_not_found' }, { status: 400 })
      }
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?error=state_not_found`
      )
    }

    console.log('Found stored data for shop:', storedData.shopDomain)

    // Clean up the used state
    global.shopifyOAuthStates.delete(state)

    // Exchange code for access token
    console.log('Exchanging code for access token with shop:', shop)
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: storedData.clientId,
        client_secret: storedData.clientSecret,
        code: code
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      if (isPopupCallback) {
        return NextResponse.json({
          error: 'token_exchange_failed',
          details: errorText
        }, { status: 400 })
      }
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?error=token_exchange_failed`
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    console.log('Successfully got access token')

    // Extract shop domain from the shop parameter
    const shopDomain = shop.replace('.myshopify.com', '')

    try {
      // Test the connection and fetch initial data
      const testData = await realDataService.fetchShopifyData({
        shopDomain,
        accessToken
      })

      // Save the connection to database
      await prisma.dataSource.upsert({
        where: { name: 'shopify' },
        update: {
          connected: true,
          config: {
            shopDomain,
            accessToken,
            clientId: storedData.clientId,
            clientSecret: storedData.clientSecret,
            scopes: storedData.scopes,
            lastSync: new Date().toISOString(),
            connectedAt: new Date().toISOString(),
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
            clientId: storedData.clientId,
            clientSecret: storedData.clientSecret,
            scopes: storedData.scopes,
            lastSync: new Date().toISOString(),
            connectedAt: new Date().toISOString(),
            testData: JSON.stringify(testData)
          }
        }
      })

      // Return success response
      if (isPopupCallback) {
        return NextResponse.json({
          success: true,
          message: 'Shopify connected successfully',
          data: {
            shopDomain,
            customers: testData.customers,
            orders: testData.orders
          }
        })
      }

      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?shopify_connected=success`
      )

    } catch (dataError) {
      console.error('Failed to fetch Shopify data:', dataError)
      if (isPopupCallback) {
        return NextResponse.json({ error: 'data_fetch_failed' }, { status: 500 })
      }
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?error=data_fetch_failed`
      )
    }

  } catch (error) {
    console.error('Shopify OAuth callback error:', error)
    const isPopupCallback = request.headers.get('referer')?.includes('/auth/shopify/callback')

    if (isPopupCallback) {
      return NextResponse.json({ error: 'callback_error' }, { status: 500 })
    }

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?error=callback_error`
    )
  }
}