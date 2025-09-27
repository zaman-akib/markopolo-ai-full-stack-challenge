'use client'

import { DataSource } from '@/types'

interface ConnectionStatusProps {
  dataSources: DataSource[]
}

export function ConnectionStatus({ dataSources }: ConnectionStatusProps) {
  const connectedSources = dataSources.filter(ds => ds.connected)
  const totalSources = dataSources.length

  return (
    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          connectedSources.length > 0 ? 'bg-green-500' : 'bg-gray-300'
        }`}></div>
        <span className="font-medium">
          {connectedSources.length} of {totalSources} data sources connected
        </span>
      </div>

      {connectedSources.length > 0 && (
        <div className="flex gap-2">
          {connectedSources.map(source => (
            <div
              key={source.id}
              className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"
            >
              {source.name.replace('_', ' ')}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}