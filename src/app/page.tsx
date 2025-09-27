'use client'

import { useState, useEffect } from 'react'
import { ChatInterface } from '@/components/ChatInterface'
import { DataSourceModal } from '@/components/DataSourceModal'
import { DataSource, Channel, ChannelInfo } from '@/types'

const availableChannels: ChannelInfo[] = [
  { id: 'email', name: 'Email', icon: '📧', description: 'Email marketing campaigns', category: 'messaging' },
  { id: 'sms', name: 'SMS', icon: '💬', description: 'Text message campaigns', category: 'messaging' },
  { id: 'whatsapp', name: 'WhatsApp', icon: '💚', description: 'WhatsApp messaging', category: 'messaging' },
  { id: 'display_ads', name: 'Ads', icon: '🎯', description: 'Display advertisements', category: 'advertising' }
]

export default function Home() {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDataSource, setSelectedDataSource] = useState('')
  const [testMode, setTestMode] = useState(false)
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(['email', 'whatsapp'])

  useEffect(() => {
    fetchDataSources()

    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('shopify_connected') === 'success') {
      // Show success message or notification
      console.log('Shopify connected successfully!')
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (urlParams.get('error')) {
      const error = urlParams.get('error')
      console.error('OAuth error:', error)
      // Show error message to user
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/connections')
      const data = await response.json()

      if (data.dataSources) {
        setDataSources(data.dataSources)
      } else {
        setDataSources([
          { id: '1', name: 'shopify', type: 'ecommerce', connected: false, createdAt: new Date(), updatedAt: new Date() },
          { id: '2', name: 'facebook_pixel', type: 'analytics', connected: false, createdAt: new Date(), updatedAt: new Date() },
          { id: '3', name: 'google_ads', type: 'advertising', connected: false, createdAt: new Date(), updatedAt: new Date() }
        ])
      }
    } catch (error) {
      console.error('Error fetching data sources:', error)
      setDataSources([
        { id: '1', name: 'shopify', type: 'ecommerce', connected: false, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'facebook_pixel', type: 'analytics', connected: false, createdAt: new Date(), updatedAt: new Date() },
        { id: '3', name: 'google_ads', type: 'advertising', connected: false, createdAt: new Date(), updatedAt: new Date() }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDataSourceConnect = async (name: string, action: 'connect' | 'disconnect') => {
    if (action === 'connect') {
      if (testMode) {
        // In test mode, simulate connection immediately
        await handleTestModeConnect(name)
      } else {
        setSelectedDataSource(name)
        setModalOpen(true)
      }
    } else {
      // Handle disconnect
      try {
        if (testMode) {
          // In test mode, just update local state
          await handleTestModeDisconnect(name)
        } else {
          const endpoint = `/api/auth/${name.replace('_', '-')}`
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'disconnect' })
          })

          if (response.ok) {
            await fetchDataSources()
          }
        }
      } catch (error) {
        console.error('Error disconnecting:', error)
      }
    }
  }

  const handleTestModeConnect = async (name: string) => {
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataSource: name,
          action: 'connect',
          testMode: true,
          config: { testMode: true, connectedAt: new Date().toISOString() }
        })
      })

      if (response.ok) {
        await fetchDataSources()
      }
    } catch (error) {
      console.error('Error in test mode connect:', error)
    }
  }

  const handleTestModeDisconnect = async (name: string) => {
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataSource: name,
          action: 'disconnect',
          testMode: true
        })
      })

      if (response.ok) {
        await fetchDataSources()
      }
    } catch (error) {
      console.error('Error in test mode disconnect:', error)
    }
  }

  const handleModalConnect = async (credentials: any) => {
    try {
      if (selectedDataSource === 'shopify') {
        // For Shopify, the OAuth process is handled in the modal
        // The modal will call this function with success: true when done
        if (credentials.success) {
          await fetchDataSources()
          setModalOpen(false)
          return
        }
      } else {
        // For other data sources, use the regular API
        const endpoint = `/api/auth/${selectedDataSource.replace('_', '-')}`
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...credentials, action: 'connect' })
        })

        const data = await response.json()

        if (response.ok) {
          await fetchDataSources()
          setModalOpen(false)
        } else {
          throw new Error(data.error || 'Connection failed')
        }
      }
    } catch (error) {
      console.error('Connection error:', error)
      throw error
    }
  }

  const handleChannelToggle = (channelId: Channel) => {
    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(c => c !== channelId)
        : [...prev, channelId]
    )
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">O</span>
          </div>
          <div className="text-lg text-white">Loading OmniPulse...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="h-screen bg-[#0f1419] text-white flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-64 bg-gray-900/50 border-r border-gray-700/50 flex flex-col overflow-hidden">
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">OmniPulse</h1>
              <p className="text-xs text-gray-400">AI Campaign Generator</p>
            </div>
          </div>
        </div>

        {/* Test Mode Section */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Test Mode</h3>
              <p className="text-xs text-gray-400">
                {testMode ? 'Mock data' : 'Real APIs'}
              </p>
            </div>
            <button
              onClick={() => setTestMode(!testMode)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                testMode ? 'bg-orange-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                  testMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Data Sources Section */}
        <div className="p-4 border-b border-gray-700/50">
          <h3 className="text-sm font-medium text-white mb-3">Data Sources</h3>
          <div className="space-y-2">
            {dataSources.map((source) => {
              const info = {
                shopify: { title: 'Shopify', icon: '🛍️' },
                facebook_pixel: { title: 'Facebook Pixel', icon: '📘' },
                google_ads: { title: 'Google Ads', icon: '🎯' }
              }[source.name]

              return (
                <div key={source.id} className="flex items-center justify-between p-2 bg-gray-800/30 rounded-md border border-gray-700/30 hover:border-gray-600/50 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{info?.icon}</span>
                    <div className="text-sm font-medium text-gray-200">{info?.title}</div>
                    {source.connected && (
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDataSourceConnect(source.name, source.connected ? 'disconnect' : 'connect')}
                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      source.connected ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                        source.connected ? 'translate-x-3' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Channels Section */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-white mb-3">Channels</h3>
          <div className="space-y-2">
            {availableChannels.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between p-2 bg-gray-800/30 rounded-md border border-gray-700/30 hover:border-gray-600/50 transition-all">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{channel.icon}</span>
                  <div className="text-sm font-medium text-gray-200">{channel.name}</div>
                  {selectedChannels.includes(channel.id) && (
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  )}
                </div>
                <button
                  onClick={() => handleChannelToggle(channel.id)}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    selectedChannels.includes(channel.id) ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                      selectedChannels.includes(channel.id) ? 'translate-x-3' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fixed Chat Header */}
        <div className="p-4 border-b border-gray-700/50 bg-gray-900/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Campaign Generator</h2>
              <p className="text-sm text-gray-400">Create AI-powered marketing campaigns</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {dataSources.filter(ds => ds.connected).length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-blue-400">
                    {dataSources.filter(ds => ds.connected).length} source{dataSources.filter(ds => ds.connected).length !== 1 ? 's' : ''} connected
                  </span>
                </div>
              )}
              {selectedChannels.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400">
                    {selectedChannels.length} channel{selectedChannels.length !== 1 ? 's' : ''} active
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            dataSources={dataSources}
            onDataSourceConnect={handleDataSourceConnect}
            selectedChannels={selectedChannels}
          />
        </div>
      </div>

      {/* Data Source Connection Modal */}
      <DataSourceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        dataSource={selectedDataSource}
        onConnect={handleModalConnect}
      />
    </main>
  )
}