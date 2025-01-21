import { useState, useEffect } from 'react'
import { videoIndexer, VideoInsights } from "../lib/video-indexer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface VideoInsightsProps {
  videoId: string
}

export function VideoInsightsDialog({ videoId }: VideoInsightsProps) {
  const [insights, setInsights] = useState<VideoInsights | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await videoIndexer.getVideoInsights(videoId)
      setInsights(data)
    } catch (err) {
      console.error('Error fetching video insights:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while fetching video insights')
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button onClick={fetchInsights} className="flex-1">Details</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Video Insights</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p>Loading insights...</p>
        ) : insights ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">Sentiments</h4>
                <ul>
                  {insights.summarizedInsights.sentiments.map((sentiment, index) => (
                    <li key={index}>{sentiment.sentimentKey}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium">Emotions</h4>
                <ul>
                  {insights.summarizedInsights.emotions.map((emotion, index) => (
                    <li key={index}>{emotion.type}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <h4 className="font-medium">Labels</h4>
              <ul className="flex flex-wrap gap-2">
                {insights.summarizedInsights.labels.map((label, index) => (
                  <li key={index} className="bg-gray-100 px-2 py-1 rounded">{label.name}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium">Keywords</h4>
              <ul className="flex flex-wrap gap-2">
                {insights.summarizedInsights.keywords.map((keyword, index) => (
                  <li key={index} className="bg-gray-100 px-2 py-1 rounded">{keyword.name}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium">Topics</h4>
              <ul>
                {insights.summarizedInsights.topics.map((topic, index) => (
                  <li key={index}>{topic.name}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

