'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DataSourceModalProps {
  isOpen: boolean
  onClose: () => void
  dataSource: string
  onConnect: (credentials: any) => Promise<void>
}

export function DataSourceModal({ isOpen, onClose, dataSource, onConnect }: DataSourceModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [credentials, setCredentials] = useState<any>({})

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onConnect(credentials)
      onClose()
    } catch (error) {
      console.error('Connection failed:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const renderShopifyForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <div className="text-green-400 text-4xl mb-2">🛍️</div>
        <h3 className="text-lg font-medium text-white mb-2">Connect Your Shopify Store</h3>
        <p className="text-sm text-gray-400">
          Enter your shop domain and API access token
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Shop Domain
        </label>
        <div className="flex items-center">
          <Input
            type="text"
            placeholder="your-shop-name"
            value={credentials.shopDomain || ''}
            onChange={(e) => setCredentials(prev => ({ ...prev, shopDomain: e.target.value }))}
            className="bg-gray-700 border-gray-600 text-white rounded-r-none"
            required
          />
          <span className="bg-gray-600 border border-l-0 border-gray-600 px-3 py-2 text-gray-300 text-sm rounded-r">
            .myshopify.com
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Your Shopify store domain (e.g., mystore.myshopify.com)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Access Token
        </label>
        <Input
          type="password"
          placeholder="shpat_..."
          value={credentials.accessToken || ''}
          onChange={(e) => setCredentials(prev => ({ ...prev, accessToken: e.target.value }))}
          className="bg-gray-700 border-gray-600 text-white"
          required
        />
        <p className="text-xs text-gray-400 mt-1">
          Admin API access token from your Shopify private app
        </p>
      </div>

      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">How to get your Access Token</span>
        </div>
        <div className="text-xs text-gray-400 mt-2 space-y-1">
          <p>1. Go to Settings → Apps and sales channels</p>
          <p>2. Click "Develop apps" → "Create an app"</p>
          <p>3. Configure Admin API scopes (customers, orders, products)</p>
          <p>4. Install the app and copy the access token</p>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !credentials.shopDomain || !credentials.accessToken} className="flex-1 bg-green-600 hover:bg-green-700">
          {isLoading ? 'Connecting...' : 'Connect Shopify'}
        </Button>
      </div>
    </form>
  )

  const renderFacebookForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Facebook Access Token
        </label>
        <Input
          type="password"
          placeholder="EAABs..."
          value={credentials.accessToken || ''}
          onChange={(e) => setCredentials(prev => ({ ...prev, accessToken: e.target.value }))}
          className="bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Pixel ID
        </label>
        <Input
          type="text"
          placeholder="123456789"
          value={credentials.pixelId || ''}
          onChange={(e) => setCredentials(prev => ({ ...prev, pixelId: e.target.value }))}
          className="bg-gray-700 border-gray-600 text-white"
          required
        />
        <p className="text-xs text-gray-400 mt-1">
          Find your Pixel ID in Facebook Events Manager
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700">
          {isLoading ? 'Connecting...' : 'Connect Facebook'}
        </Button>
      </div>
    </form>
  )

  const renderGoogleAdsForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Client ID
        </label>
        <Input
          type="text"
          placeholder="123456789-abc123.apps.googleusercontent.com"
          value={credentials.clientId || ''}
          onChange={(e) => setCredentials(prev => ({ ...prev, clientId: e.target.value }))}
          className="bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Client Secret
        </label>
        <Input
          type="password"
          placeholder="GOCSPX-..."
          value={credentials.clientSecret || ''}
          onChange={(e) => setCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
          className="bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Refresh Token
        </label>
        <Input
          type="password"
          placeholder="1//04..."
          value={credentials.refreshToken || ''}
          onChange={(e) => setCredentials(prev => ({ ...prev, refreshToken: e.target.value }))}
          className="bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Customer ID
        </label>
        <Input
          type="text"
          placeholder="123-456-7890"
          value={credentials.customerId || ''}
          onChange={(e) => setCredentials(prev => ({ ...prev, customerId: e.target.value }))}
          className="bg-gray-700 border-gray-600 text-white"
          required
        />
        <p className="text-xs text-gray-400 mt-1">
          Your Google Ads Customer ID (without dashes)
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1 bg-red-600 hover:bg-red-700">
          {isLoading ? 'Connecting...' : 'Connect Google Ads'}
        </Button>
      </div>
    </form>
  )

  const getTitle = () => {
    switch (dataSource) {
      case 'shopify':
        return 'Connect Shopify Store'
      case 'facebook_pixel':
        return 'Connect Facebook Pixel'
      case 'google_ads':
        return 'Connect Google Ads'
      default:
        return 'Connect Data Source'
    }
  }

  const getForm = () => {
    switch (dataSource) {
      case 'shopify':
        return renderShopifyForm()
      case 'facebook_pixel':
        return renderFacebookForm()
      case 'google_ads':
        return renderGoogleAdsForm()
      default:
        return <div>Unknown data source</div>
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          {getForm()}
        </CardContent>
      </Card>
    </div>
  )
}