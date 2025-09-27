import { CampaignPayload } from '@/types'

export class StreamingService {
  async *streamCampaignGeneration(payload: CampaignPayload): AsyncGenerator<string> {
    let partialPayload: any = { campaign: {} }

    // Stage 1: Start with campaign structure
    await this.delay(300)
    partialPayload.campaign.objective = payload.campaign.objective
    yield JSON.stringify(partialPayload, null, 2)

    // Stage 2: Add audience base
    await this.delay(500)
    partialPayload.campaign.audience = {
      source: payload.campaign.audience.source
    }
    yield JSON.stringify(partialPayload, null, 2)

    // Stage 3: Add audience filters
    await this.delay(400)
    partialPayload.campaign.audience.filters = payload.campaign.audience.filters
    yield JSON.stringify(partialPayload, null, 2)

    // Stage 4-7: Add channels one by one
    partialPayload.campaign.channels = []

    for (let i = 0; i < payload.campaign.channels.length; i++) {
      await this.delay(600)
      partialPayload.campaign.channels.push(payload.campaign.channels[i])
      yield JSON.stringify(partialPayload, null, 2)
    }

    // Final stage: Complete payload
    await this.delay(300)
    yield JSON.stringify(payload, null, 2)
  }

  createServerSentEventStream(payload: CampaignPayload): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    let streamGenerator: AsyncGenerator<string> | null = null
    const self = this

    return new ReadableStream({
      async start(controller) {
        streamGenerator = self.streamCampaignGeneration(payload)

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', message: 'Generating campaign...' })}\n\n`))
      },

      async pull(controller) {
        if (!streamGenerator) return

        try {
          const { value, done } = await streamGenerator.next()

          if (done) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', payload: JSON.parse(value || '{}') })}\n\n`))
            controller.close()
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', payload: JSON.parse(value) })}\n\n`))
          }
        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Stream error occurred' })}\n\n`))
          controller.close()
        }
      },

      cancel() {
        if (streamGenerator) {
          streamGenerator.return(undefined)
        }
      }
    })
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()

    if (!lastKey) return

    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {}
      }
      return current[key]
    }, obj)

    target[lastKey] = value
  }

  async *simulateProgressiveGeneration(userMessage: string): AsyncGenerator<{ stage: string; content: string }> {
    const stages = [
      { stage: 'analyzing', content: `Analyzing your request: "${userMessage}"` },
      { stage: 'data_gathering', content: 'Gathering data from connected sources...' },
      { stage: 'audience_analysis', content: 'Analyzing target audience characteristics...' },
      { stage: 'message_optimization', content: 'Optimizing message content and subject line...' },
      { stage: 'channel_selection', content: 'Selecting optimal communication channels...' },
      { stage: 'timing_optimization', content: 'Calculating optimal send times...' },
      { stage: 'budget_allocation', content: 'Allocating budget across channels...' },
      { stage: 'finalizing', content: 'Finalizing campaign configuration...' }
    ]

    for (const { stage, content } of stages) {
      await this.delay(Math.random() * 500 + 300)
      yield { stage, content }
    }
  }
}