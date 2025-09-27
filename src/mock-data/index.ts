import * as fs from 'fs'
import * as path from 'path'

export interface MockDataLoader {
  loadMockData(dataSource: string): any
  getAllMockData(): Record<string, any>
}

export class FileBasedMockDataLoader implements MockDataLoader {
  private mockDataCache: Map<string, any> = new Map()

  loadMockData(dataSource: string): any {
    // Check cache first
    if (this.mockDataCache.has(dataSource)) {
      return this.mockDataCache.get(dataSource)
    }

    try {
      const fileName = dataSource.replace('_', '-')
      const mockDataPath = path.join(process.cwd(), 'src', 'mock-data', `${fileName}.json`)
      const fileContent = fs.readFileSync(mockDataPath, 'utf8')
      const data = JSON.parse(fileContent)

      // Cache the data for future use
      this.mockDataCache.set(dataSource, data)

      return data
    } catch (error) {
      console.error(`Failed to load mock data for ${dataSource}:`, error)
      throw new Error(`Mock data not available for ${dataSource}`)
    }
  }

  getAllMockData(): Record<string, any> {
    const dataSources = ['shopify', 'facebook_pixel', 'google_ads']
    const allData: Record<string, any> = {}

    for (const source of dataSources) {
      try {
        allData[source] = this.loadMockData(source)
      } catch (error) {
        console.warn(`Skipping ${source} mock data due to error:`, error)
      }
    }

    return allData
  }

  clearCache(): void {
    this.mockDataCache.clear()
  }

  getAvailableDataSources(): string[] {
    try {
      const mockDataDir = path.join(process.cwd(), 'src', 'mock-data')
      const files = fs.readdirSync(mockDataDir)
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', '').replace('-', '_'))
    } catch (error) {
      console.error('Failed to read mock data directory:', error)
      return []
    }
  }
}

export const mockDataLoader = new FileBasedMockDataLoader()

// Export individual loaders for convenience
export const loadShopifyMockData = () => mockDataLoader.loadMockData('shopify')
export const loadFacebookPixelMockData = () => mockDataLoader.loadMockData('facebook_pixel')
export const loadGoogleAdsMockData = () => mockDataLoader.loadMockData('google_ads')