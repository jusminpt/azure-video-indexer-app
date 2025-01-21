"use client"

import { useState, useEffect } from "react"
import { videoIndexer, type Video, type VideoInsights } from "../lib/video-indexer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VideoPlayer } from "./video-player"
import { VideoInsightsDialog } from "./video-insights"
import { ImageSearch } from "./image-search"
import { MatchingTimestampsWithSubtitles } from "./matching-timestamps-with-subtitles"
import { Download, Play, Search } from "lucide-react"

interface ImageAnalysis {
  description: {
    tags: string[]
    captions: Array<{ text: string; confidence: number }>
  }
  tags: Array<{ name: string; confidence: number }>
}

interface VideoSearchResult {
  video: Video
  matchingTags: string[]
  score: number
  matchingTimestamps: {
    type: "label" | "keyword" | "topic" | "subtitle"
    name: string
    appearances: Array<{ startTime: string; endTime: string; text?: string }>
  }[]
}

export function VideoSearchAndList() {
  const [videos, setVideos] = useState<Video[]>([])
  const [filteredVideos, setFilteredVideos] = useState<VideoSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [playingVideoStartTime, setPlayingVideoStartTime] = useState<string | null>(null)
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [isImageSearch, setIsImageSearch] = useState(false)
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null)
  const [currentVideoInsights, setCurrentVideoInsights] = useState<VideoInsights | null>(null)

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedVideos = await videoIndexer.getAllVideos()
      setVideos(fetchedVideos)
      setFilteredVideos(fetchedVideos.map((video) => ({ video, matchingTags: [], score: 1, matchingTimestamps: [] })))
      fetchThumbnails(fetchedVideos)
    } catch (err) {
      console.error("Error fetching videos:", err)
      setError(err instanceof Error ? err.message : "An error occurred while fetching videos")
    } finally {
      setLoading(false)
    }
  }

  const fetchThumbnails = async (videosToFetch: Video[]) => {
    const thumbnailPromises = videosToFetch.map(async (video) => {
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
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `${videoName}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading video:", error)
      setError("Failed to download video. Please try again.")
    }
  }

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setIsImageSearch(false)
    setImageAnalysis(null)
    try {
      if (searchQuery) {
        console.log("Searching for:", searchQuery)
        const result = await videoIndexer.searchVideos(searchQuery)
        console.log("Search result:", result)
        const searchResults = result?.results || []
        if (!Array.isArray(searchResults)) {
          throw new Error("Unexpected search results format")
        }
        const scoredResults = await Promise.all(
          searchResults.map(async (video) => {
            console.log("Processing video:", video.id)
            const insights = await videoIndexer.getVideoInsights(video.id)
            const videoElements = new Set([
              ...(insights.summarizedInsights?.labels || []).map((label) => label.name.toLowerCase()),
              ...(insights.summarizedInsights?.keywords || []).map((keyword) => keyword.name.toLowerCase()),
              ...(insights.summarizedInsights?.topics || []).map((topic) => topic.name.toLowerCase()),
            ])
            const searchTerms = searchQuery.toLowerCase().split(" ")
            const matchingTags = searchTerms.filter((term) => videoElements.has(term))
            const score = matchingTags.length / searchTerms.length
            const matchingTimestamps = getMatchingTimestamps(insights, searchTerms)
            return { video, matchingTags, score, matchingTimestamps }
          }),
        )
        scoredResults.sort((a, b) => b.score - a.score)
        setFilteredVideos(scoredResults)
        fetchThumbnails(scoredResults.map((r) => r.video))
      } else {
        setFilteredVideos(videos.map((video) => ({ video, matchingTags: [], score: 1, matchingTimestamps: [] })))
        fetchThumbnails(videos)
      }
    } catch (err) {
      console.error("Error searching videos:", err)
      if (err instanceof Error) {
        setError(`An error occurred while searching videos: ${err.message}`)
      } else {
        setError("An unknown error occurred while searching videos")
      }
      setFilteredVideos([])
    } finally {
      setLoading(false)
    }
  }

  const handleImageSearchResults = async (results: VideoSearchResult[], analysis: ImageAnalysis) => {
    const updatedResults = await Promise.all(
      results.map(async ({ video, matchingTags, score }) => {
        const insights = await videoIndexer.getVideoInsights(video.id)
        const videoTags = new Set([
          ...insights.summarizedInsights.labels.map((label) => label.name.toLowerCase()),
          ...insights.summarizedInsights.keywords.map((keyword) => keyword.name.toLowerCase()),
          ...insights.summarizedInsights.topics.map((topic) => topic.name.toLowerCase()),
        ])
        const searchTags = new Set([
          ...analysis.description.tags.map((tag) => tag.toLowerCase()),
          ...analysis.tags.map((tag) => tag.name.toLowerCase()),
        ])
        const updatedMatchingTags = [...searchTags].filter((tag) => videoTags.has(tag))
        const updatedScore = updatedMatchingTags.length / searchTags.size
        const matchingTimestamps = getMatchingTimestamps(insights, updatedMatchingTags)
        return { video, matchingTags: updatedMatchingTags, score: updatedScore, matchingTimestamps }
      }),
    )

    updatedResults.sort((a, b) => b.score - a.score)
    setFilteredVideos(updatedResults)
    fetchThumbnails(updatedResults.map((r) => r.video))
    setSearchQuery("")
    setIsImageSearch(true)
    setImageAnalysis(analysis)
  }

  const getMatchingTimestamps = (insights: VideoInsights, searchTerms: string[]) => {
    const matchingTimestamps: MatchingTimestamp[] = []

    if (insights.summarizedInsights) {
      for (const label of insights.summarizedInsights.labels || []) {
        if (searchTerms.includes(label.name.toLowerCase())) {
          matchingTimestamps.push({
            type: "label",
            name: label.name,
            appearances: label.appearances,
          })
        }
      }

      for (const keyword of insights.summarizedInsights.keywords || []) {
        if (searchTerms.includes(keyword.name.toLowerCase())) {
          matchingTimestamps.push({
            type: "keyword",
            name: keyword.name,
            appearances: keyword.appearances,
          })
        }
      }

      for (const topic of insights.summarizedInsights.topics || []) {
        if (searchTerms.includes(topic.name.toLowerCase())) {
          matchingTimestamps.push({
            type: "topic",
            name: topic.name,
            appearances: topic.appearances,
          })
        }
      }
    }

    // Add subtitle matches
    const subtitleMatches =
      insights.videos?.[0]?.insights?.transcript?.filter((item) =>
        searchTerms.some((term) => item.text.toLowerCase().includes(term)),
      ) || []

    for (const match of subtitleMatches) {
      matchingTimestamps.push({
        type: "subtitle",
        name: searchTerms.find((term) => match.text.toLowerCase().includes(term)) || "",
        appearances: match.instances.map((instance) => ({
          startTime: instance.start,
          endTime: instance.end,
          text: match.text,
        })),
      })
    }

    return matchingTimestamps
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
      <h2 className="text-2xl font-bold">Video Library</h2>
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          placeholder="Search videos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow"
        />
        <Button type="submit">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </form>
      <ImageSearch onSearchResults={handleImageSearchResults} />
      {isImageSearch && imageAnalysis && (
        <div className="mb-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Image Search Results</h3>
          <p>Showing {filteredVideos.filter((item) => item.score > 0).length} results for image search</p>
          <p className="text-sm text-gray-600">Results are sorted by relevance to the uploaded image</p>
          <div className="mt-2">
            <p>
              <strong>Image Description:</strong> {imageAnalysis.description.captions[0]?.text}
            </p>
            <p>
              <strong>Image Tags:</strong> {imageAnalysis.tags.map((tag) => tag.name).join(", ")}
            </p>
          </div>
        </div>
      )}
      {!isImageSearch && searchQuery && (
        <div className="mb-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Keyword Search Results</h3>
          <p>
            Showing top {filteredVideos.length} results for "{searchQuery}"
          </p>
          <p className="text-sm text-gray-600">Results are sorted by relevance to the search query</p>
        </div>
      )}
      {filteredVideos.length === 0 ? (
        <p>No videos found.</p>
      ) : (
        <div>
          <div className="space-y-4">
            {filteredVideos
              .filter((item) => !isImageSearch || item.score > 0)
              .map(({ video, matchingTags, score, matchingTimestamps }) => (
                <div key={video.id} className="p-4 border rounded-lg flex flex-col md:flex-row gap-4">
                  <div className="md:w-1/3">
                    {thumbnails[video.id] && (
                      <img
                        src={thumbnails[video.id] || "/placeholder.svg"}
                        alt={video.name}
                        className="w-full h-48 object-cover rounded"
                      />
                    )}
                  </div>
                  <div className="md:w-2/3 space-y-2">
                    <h3 className="font-medium text-lg">{video.name}</h3>
                    <p className="text-sm text-gray-500">Duration: {Math.round(video.durationInSeconds)}s</p>
                    <p className="text-sm text-gray-500">Uploaded: {new Date(video.created).toLocaleString()}</p>
                    {(isImageSearch || searchQuery) && (
                      <div>
                        <p className="text-sm text-green-600">Match Score: {(score * 100).toFixed(2)}%</p>
                        <p className="text-sm text-blue-600">Matching Elements: {matchingTags.join(", ")}</p>
                        <p className="text-xs text-gray-500">(Includes matches from labels, keywords, and topics)</p>
                      </div>
                    )}
                    {(isImageSearch || searchQuery) && matchingTimestamps.length > 0 && (
                      <MatchingTimestampsWithSubtitles
                        timestamps={matchingTimestamps}
                        onSelectTimestamp={(startTime) => {
                          setPlayingVideoId(video.id)
                          setPlayingVideoStartTime(startTime)
                        }}
                      />
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          const insights = await videoIndexer.getVideoInsights(video.id)
                          setCurrentVideoInsights(insights)
                          setPlayingVideoId(video.id)
                          setPlayingVideoStartTime(null)
                        }}
                        className="flex-1"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Play
                      </Button>
                      <Button onClick={() => handleDownload(video.id, video.name)} className="flex-1">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <VideoInsightsDialog videoId={video.id} />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      {playingVideoId && currentVideoInsights && (
        <VideoPlayer
          videoId={playingVideoId}
          startTime={playingVideoStartTime}
          onClose={() => {
            setPlayingVideoId(null)
            setPlayingVideoStartTime(null)
            setCurrentVideoInsights(null)
          }}
          videoInsights={currentVideoInsights}
        />
      )}
    </div>
  )
}

interface MatchingTimestamp {
  type: "label" | "keyword" | "topic" | "subtitle"
  name: string
  appearances: Array<{ startTime: string; endTime: string; text?: string }>
}

