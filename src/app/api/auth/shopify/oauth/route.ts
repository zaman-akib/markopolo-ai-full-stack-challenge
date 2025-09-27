import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { shopDomain, clientId, clientSecret, scopes } = await request.json()

    if (!shopDomain || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Shop domain, client ID, and client secret are required' },
        { status: 400 }
      )
    }

    // Basic validation
    if (!shopDomain.match(/^[a-zA-Z0-9\-]+$/)) {
      return NextResponse.json(
        { error: 'Invalid shop domain format' },
        { status: 400 }
      )
    }

    if (clientId.length < 10 || clientSecret.length < 10) {
      return NextResponse.json(
        { error: 'Client ID and secret appear to be too short' },
        { status: 400 }
      )
    }

    const scopesList = scopes || 'read_customers,read_orders,read_products,read_analytics'
    const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/shopify/callback`

    // Generate a random state for security
    const state = crypto.randomBytes(32).toString('hex')

    // Store the credentials temporarily with the state for later use
    // In a production app, you'd want to use Redis or a secure session store
    global.shopifyOAuthStates = global.shopifyOAuthStates || new Map()
    global.shopifyOAuthStates.set(state, {
      clientId,
      clientSecret,
      shopDomain,
      scopes: scopesList,
      timestamp: Date.now()
    })

    console.log('Stored OAuth state:', state, 'for shop:', shopDomain)

    // Clean up old states (older than 10 minutes)
    for (const [key, value] of global.shopifyOAuthStates.entries()) {
      if (Date.now() - value.timestamp > 10 * 60 * 1000) {
        global.shopifyOAuthStates.delete(key)
      }
    }

    const authUrl = `https://${shopDomain}.myshopify.com/admin/oauth/authorize?` +
      new URLSearchParams({
        client_id: clientId,
        scope: scopesList,
        redirect_uri: redirectUri,
        state: state,
        grant_options: 'per-user'
      }).toString()

    return NextResponse.json({
      authUrl,
      state
    })

  } catch (error) {
    console.error('Shopify OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Shopify OAuth' },
      { status: 500 }
    )
  }
}