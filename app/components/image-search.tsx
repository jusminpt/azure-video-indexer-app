'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { videoIndexer, Video } from "../lib/video-indexer"
import { Upload, Search, X } from 'lucide-react'
import Image from 'next/image'

interface ImageSearchProps {
  onSearchResults: (results: { video: Video; matchingTags: string[]; score: number }[], imageAnalysis: ImageAnalysis) => void;
}

interface ImageAnalysis {
  description: {
    tags: string[];
    captions: Array<{ text: string; confidence: number }>;
  };
  tags: Array<{ name: string; confidence: number }>;
}

export function ImageSearch({ onSearchResults }: ImageSearchProps) {
  const [searchImage, setSearchImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchImage) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(searchImage)
    } else {
      setImagePreview(null)
    }
  }, [searchImage])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSearchImage(e.target.files[0])
      setImageAnalysis(null) // Reset image analysis when a new image is uploaded
    }
  }

  const triggerImageUpload = () => {
    fileInputRef.current?.click()
  }

  const clearImage = () => {
    setSearchImage(null)
    setImageAnalysis(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const analyzeImage = async (file: File): Promise<ImageAnalysis> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/analyze-image', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Failed to analyze image')
    }

    return response.json()
  }

  const handleSearch = async () => {
    if (!searchImage) return

    setLoading(true)
    setError(null)

    try {
      const analysis = await analyzeImage(searchImage)
      setImageAnalysis(analysis)
      const searchTags = new Set([
        ...analysis.description.tags,
        ...analysis.tags.map(tag => tag.name)
      ])

      const videos = await videoIndexer.getAllVideos()
      const results = await Promise.all(
        videos.map(async (video) => {
          const insights = await videoIndexer.getVideoInsights(video.id)
          const videoTags = new Set([
            ...insights.summarizedInsights.labels.map(label => label.name),
            ...insights.summarizedInsights.keywords.map(keyword => keyword.name)
          ])

          const matchingTags = [...searchTags].filter(tag => videoTags.has(tag))
          const score = matchingTags.length / searchTags.size

          return { video, matchingTags, score }
        })
      )

      results.sort((a, b) => b.score - a.score)
      const topResults = results.slice(0, 10)

      onSearchResults(topResults, analysis)
    } catch (err) {
      console.error('Error in image search:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during image search')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
        <Button type="button" onClick={triggerImageUpload}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Image
        </Button>
        <Button onClick={handleSearch} disabled={!searchImage || loading}>
          <Search className="w-4 h-4 mr-2" />
          Search by Image
        </Button>
        {searchImage && (
          <Button variant="outline" onClick={clearImage}>
            <X className="w-4 h-4 mr-2" />
            Clear Image
          </Button>
        )}
      </div>
      {imagePreview && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Uploaded Image</h3>
          <div className="relative w-64 h-64">
            <Image
              src={imagePreview || "/placeholder.svg"}
              alt="Uploaded image"
              layout="fill"
              objectFit="cover"
              className="rounded-lg"
            />
          </div>
        </div>
      )}
      {imageAnalysis && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Image Analysis</h3>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p><strong>Description:</strong> {imageAnalysis.description.captions[0]?.text}</p>
            <p><strong>Confidence:</strong> {(imageAnalysis.description.captions[0]?.confidence * 100).toFixed(2)}%</p>
            <p><strong>Tags:</strong> {imageAnalysis.tags.map(tag => tag.name).join(', ')}</p>
          </div>
        </div>
      )}
      {loading && <p>Analyzing image and searching videos...</p>}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

