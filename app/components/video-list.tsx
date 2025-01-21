'use client'

import { useState, useEffect } from 'react'
import { videoIndexer, Video } from "../lib/video-indexer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { VideoPlayer } from "./video-player"
import { Download, Play } from 'lucide-react'

export function VideoList() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedVideos = await videoIndexer.getAllVideos()
      setVideos(fetchedVideos)
      fetchThumbnails(fetchedVideos)
    } catch (err) {
      console.error('Error fetching videos:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while fetching videos')
    } finally {
      setLoading(false)
    }
  }

  const fetchThumbnails = async (videos: Video[]) => {
    const thumbnailPromises = videos.map(async (video) => {
      if (video.thumbnailId) {
        try {
          const thumbnailUrl = await videoIndexer.generateThumbnail(video.id, video.thumbnailId)
          return { id: video.id, url: thumbnailUrl }
        } catch (error) {
          console.error(`Error generating thumbnail for video ${video.id}:`, error)
          return { id: video.id, url: null }
        }
      }
      return { id: video.id, url: null }
    })

    const thumbnailResults = await Promise.all(thumbnailPromises)
    const newThumbnails: Record<string, string> = {}
    thumbnailResults.forEach(({ id, url }) => {
      if (url) {
        newThumbnails[id] = url
      }
    })
    setThumbnails(newThumbnails)
  }

  const handleDownload = async (videoId: string, videoName: string) => {
    try {
      const downloadUrl = await videoIndexer.getVideoDownloadUrl(videoId)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${videoName}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading video:', error)
      setError('Failed to download video. Please try again.')
    }
  }

  if (loading) {
    return <div>Loading videos...</div>
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Uploaded Videos</h2>
      {videos.length === 0 ? (
        <p>No videos uploaded yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <div key={video.id} className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">{video.name}</h3>
              <p className="text-sm text-gray-500">
                Duration: {Math.round(video.durationInSeconds)}s
              </p>
              <p className="text-sm text-gray-500">
                Uploaded: {new Date(video.created).toLocaleString()}
              </p>
              {thumbnails[video.id] && (
                <img
                  src={thumbnails[video.id] || "/placeholder.svg"}
                  alt={video.name}
                  className="mt-2 w-full h-32 object-cover rounded"
                />
              )}
              <div className="mt-2 flex gap-2">
                <Button
                  onClick={() => setPlayingVideoId(video.id)}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </Button>
                <Button
                  onClick={() => handleDownload(video.id, video.name)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {playingVideoId && (
        <VideoPlayer
          videoId={playingVideoId}
          onClose={() => setPlayingVideoId(null)}
        />
      )}
    </div>
  )
}

