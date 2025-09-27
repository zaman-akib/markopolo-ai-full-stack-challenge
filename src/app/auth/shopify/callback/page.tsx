'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ShopifyCallbackPage() {
  const [status, setStatus] = useState('processing')
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const shop = searchParams.get('shop')
        const error = searchParams.get('error')

        console.log('Shopify callback received:', { code: !!code, state: !!state, shop, error })

        if (error) {
          setStatus('error')
          console.error('Shopify OAuth error:', error)
          window.opener?.postMessage({
            type: 'shopify-oauth-error',
            error: error
          }, window.location.origin)
          return
        }

        if (!code || !state || !shop) {
          setStatus('error')
          const errorMsg = 'Missing required parameters'
          console.error(errorMsg, { code: !!code, state: !!state, shop })
          window.opener?.postMessage({
            type: 'shopify-oauth-error',
            error: errorMsg
          }, window.location.origin)
          return
        }

        // Process the OAuth callback by calling our API
        console.log('Calling API callback...')
        const apiUrl = `/api/auth/shopify/callback?${searchParams.toString()}`
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        console.log('API response status:', response.status)

        if (response.ok) {
          const result = await response.json()
          console.log('API response data:', result)

          setStatus('success')
          // Send success message to parent window
          window.opener?.postMessage({
            type: 'shopify-oauth-success',
            data: result
          }, window.location.origin)

          // Auto-close after a short delay
          setTimeout(() => {
            window.close()
          }, 2000)
        } else {
          const errorData = await response.text()
          console.error('API error response:', errorData)
          setStatus('error')
          window.opener?.postMessage({
            type: 'shopify-oauth-error',
            error: `API error: ${response.status}`
          }, window.location.origin)
        }
      } catch (error) {
        console.error('Callback error:', error)
        setStatus('error')
        window.opener?.postMessage({
          type: 'shopify-oauth-error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }, window.location.origin)
      }
    }

    // Small delay to ensure the page is fully loaded
    const timer = setTimeout(() => {
      handleCallback()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchParams])

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-2xl">O</span>
        </div>

        {status === 'processing' && (
          <>
            <div className="text-lg text-white mb-2">Processing Shopify Connection...</div>
            <div className="text-gray-400">Please wait while we complete the setup.</div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-lg text-green-400 mb-2">✅ Connection Successful!</div>
            <div className="text-gray-400">You can close this window.</div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-lg text-red-400 mb-2">❌ Connection Failed</div>
            <div className="text-gray-400">Please close this window and try again.</div>
          </>
        )}
      </div>
    </div>
  )
}