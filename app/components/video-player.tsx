"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { videoIndexer, type VideoInsights } from "../lib/video-indexer"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface VideoPlayerProps {
  videoId: string
  startTime?: string | null
  onClose: () => void
  videoInsights: VideoInsights
}

export function VideoPlayer({ videoId, startTime, onClose, videoInsights }: VideoPlayerProps) {
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const fetchStreamingUrl = async () => {
      try {
        const url = await videoIndexer.getVideoStreamingUrl(videoId)
        setStreamingUrl(url)
      } catch (err) {
        console.error("Error fetching streaming URL:", err)
        setError(err instanceof Error ? err.message : "An error occurred while fetching the video")
      }
    }

    fetchStreamingUrl()
  }, [videoId])

  useEffect(() => {
    if (videoRef.current && startTime) {
      const [minutes, seconds] = startTime.split(":").map(Number)
      videoRef.current.currentTime = minutes * 60 + seconds
    }
  }, [startTime])

  const updateSubtitle = useCallback(
    (currentTime: number) => {
      const subtitle = videoInsights.videos[0].insights.transcript.find((item) => {
        const [startMinutes, startSeconds] = item.instances[0].start.split(":").map(Number)
        const [endMinutes, endSeconds] = item.instances[0].end.split(":").map(Number)
        const startTime = startMinutes * 60 + startSeconds
        const endTime = endMinutes * 60 + endSeconds
        return currentTime >= startTime && currentTime < endTime
      })
      setCurrentSubtitle(subtitle ? subtitle.text : null)
    },
    [videoInsights],
  )

  useEffect(() => {
    const videoElement = videoRef.current
    if (videoElement) {
      const handleTimeUpdate = () => updateSubtitle(videoElement.currentTime)
      videoElement.addEventListener("timeupdate", handleTimeUpdate)
      return () => {
        videoElement.removeEventListener("timeupdate", handleTimeUpdate)
      }
    }
  }, [updateSubtitle])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!streamingUrl) {
    return <div>Loading video...</div>
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg max-w-4xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Video Player</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            Close
          </button>
        </div>
        <video ref={videoRef} src={streamingUrl} controls className="w-full" />
        <div className="mt-4 text-center">{currentSubtitle && <p className="text-lg">{currentSubtitle}</p>}</div>
      </div>
    </div>
  )
}

