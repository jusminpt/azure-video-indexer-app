'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { videoIndexer } from "../lib/video-indexer"

export function VideoUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)
      setError(null)
      setSuccess(null)
      const videoId = await videoIndexer.uploadVideo(file, file.name)
      setSuccess(`Video uploaded successfully. Video ID: ${videoId}`)
      setFile(null)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : JSON.stringify(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Upload Video</h2>
      <div className="space-y-4">
        <Input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={uploading}
        />
        <Button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            'Uploading...'
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Video
            </>
          )}
        </Button>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Error: {error}</p>
                <p className="text-sm">Check the console for more details.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription className="text-green-600">
              {success}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

