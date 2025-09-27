'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataSource } from '@/types'

interface DataSourceCardProps {
  dataSource: DataSource
  onConnect: (name: string, action: 'connect' | 'disconnect') => Promise<void>
}

const dataSourceInfo = {
  shopify: {
    title: 'Shopify',
    description: 'E-commerce platform data including orders, customers, and products',
    icon: '🛍️'
  },
  facebook_pixel: {
    title: 'Facebook Pixel',
    description: 'Website analytics and audience insights from Facebook',
    icon: '📊'
  },
  google_ads: {
    title: 'Google Ads',
    description: 'Campaign performance and keyword data from Google Ads',
    icon: '🎯'
  }
}

export function DataSourceCard({ dataSource, onConnect }: DataSourceCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const info = dataSourceInfo[dataSource.name]

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      const action = dataSource.connected ? 'disconnect' : 'connect'
      await onConnect(dataSource.name, action)
    } catch (error) {
      console.error('Connection error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      dataSource.connected ? 'border-green-200 bg-green-50' : ''
    }`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">{info.icon}</span>
          {info.title}
          {dataSource.connected && (
            <span className="ml-auto">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </span>
          )}
        </CardTitle>
        <CardDescription>{info.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Status: {dataSource.connected ? (
              <span className="text-green-600 font-medium">Connected</span>
            ) : (
              <span className="text-gray-500">Disconnected</span>
            )}
          </div>
          <Button
            onClick={handleConnect}
            disabled={isLoading}
            variant={dataSource.connected ? 'outline' : 'default'}
            size="sm"
          >
            {isLoading ? 'Loading...' : dataSource.connected ? 'Disconnect' : 'Connect'}
          </Button>
        </div>
        {dataSource.connected && dataSource.config && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
            <div className="font-medium text-gray-700">Configuration:</div>
            <div className="text-gray-600">
              {Object.entries(dataSource.config).map(([key, value]) => (
                <div key={key}>
                  {key}: {typeof value === 'string' ? '***' : JSON.stringify(value)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}