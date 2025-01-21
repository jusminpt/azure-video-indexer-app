import { config } from "../config"

interface VideoIndexerError extends Error {
  status?: number
  statusText?: string
  body?: string
}

export interface Video {
  id: string
  name: string
  durationInSeconds: number
  thumbnailId: string
  created: string
}

export interface VideoInsights {
  id: string
  name: string
  durationInSeconds: number
  summarizedInsights: {
    sentiments: Array<{ sentimentKey: string; appearances: Array<{ startTime: string; endTime: string }> }>
    emotions: Array<{ type: string; appearances: Array<{ startTime: string; endTime: string }> }>
    audioEffects: Array<{ type: string; appearances: Array<{ startTime: string; endTime: string }> }>
    labels: Array<{ name: string; appearances: Array<{ startTime: string; endTime: string }> }>
    faces: Array<{ name: string; appearances: Array<{ startTime: string; endTime: string }> }>
    keywords: Array<{ name: string; appearances: Array<{ startTime: string; endTime: string }> }>
    topics: Array<{ name: string; appearances: Array<{ startTime: string; endTime: string }> }>
  }
  videos: Array<{
    insights: {
      transcript: Array<{
        text: string
        instances: Array<{
          start: string
          end: string
        }>
      }>
      sentiments: Array<{ sentimentKey: string; appearances: Array<{ startTime: string; endTime: string }> }>
      emotions: Array<{ type: string; appearances: Array<{ startTime: string; endTime: string }> }>
      audioEffects: Array<{ type: string; appearances: Array<{ startTime: string; endTime: string }> }>
      labels: Array<{ name: string; appearances: Array<{ startTime: string; endTime: string }> }>
      faces: Array<{ name: string; appearances: Array<{ startTime: string; endTime: string }> }>
      keywords: Array<{ name: string; appearances: Array<{ startTime: string; endTime: string }> }>
      topics: Array<{ name: string; appearances: Array<{ startTime: string; endTime: string }> }>
      keyFrames: Array<{
        id: string
        instances: Array<{
          start: string
          thumbnailId: string
        }>
      }>
    }
  }>
}

export interface Keyframe {
  id: string
  instances: Array<{
    start: string
    thumbnailId: string
  }>
}

export class VideoIndexerClient {
  private baseUrl: string
  private accountId: string
  private location: string
  private apiKey: string
  private accessToken?: string
  private tokenExpiration?: Date

  constructor() {
    this.baseUrl = "https://api.videoindexer.ai"
    this.accountId = config.videoIndexer.accountId
    this.location = config.videoIndexer.location
    this.apiKey = config.videoIndexer.apiKey
  }

  private createError(message: string, response?: Response, body?: string): VideoIndexerError {
    const error = new Error(message) as VideoIndexerError
    if (response) {
      error.status = response.status
      error.statusText = response.statusText
      error.body = body
    }
    return error
  }

  private async handleResponse(response: Response, errorContext: string): Promise<any> {
    const responseText = await response.text()

    if (!response.ok) {
      const error = this.createError(
        `${errorContext}: ${response.status} ${response.statusText}`,
        response,
        responseText,
      )
      console.error("API Error:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
        headers: Object.fromEntries(response.headers.entries()),
      })
      throw error
    }

    try {
      return responseText ? JSON.parse(responseText) : null
    } catch {
      return responseText
    }
  }

  private isTokenValid(): boolean {
    if (!this.accessToken || !this.tokenExpiration) {
      return false
    }
    // Add 5 minute buffer before expiration
    const bufferTime = 5 * 60 * 1000
    return new Date().getTime() + bufferTime < this.tokenExpiration.getTime()
  }

  async getAccessToken(forceNew = false): Promise<string> {
    if (!forceNew && this.isTokenValid()) {
      return this.accessToken!
    }

    try {
      const url = new URL(`${this.baseUrl}/Auth/${this.location}/Accounts/${this.accountId}/AccessToken`)
      url.searchParams.append("allowEdit", "true")

      console.log("Requesting access token from:", url.toString())

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
        },
      })

      const token = await this.handleResponse(response, "Failed to get access token")

      // Parse token to get expiration
      try {
        const tokenData = JSON.parse(atob(token.split(".")[1]))
        this.tokenExpiration = new Date(tokenData.exp * 1000)
      } catch (error) {
        console.warn("Could not parse token expiration:", error)
        // Set a default expiration of 1 hour from now
        this.tokenExpiration = new Date(Date.now() + 60 * 60 * 1000)
      }

      this.accessToken = token
      console.log("Successfully retrieved access token, expires:", this.tokenExpiration)
      return token
    } catch (error) {
      console.error("Error in getAccessToken:", error)
      throw error
    }
  }

  async uploadVideo(file: File, name: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken()

      const url = new URL(`${this.baseUrl}/${this.location}/Accounts/${this.accountId}/Videos`)
      url.searchParams.append("name", name)
      url.searchParams.append("accessToken", accessToken)
      url.searchParams.append("videoUrl", "")

      console.log("Uploading video to:", url.toString())

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(url.toString(), {
        method: "POST",
        body: formData,
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
        },
      })

      const result = await this.handleResponse(response, "Failed to upload video")
      return result.id
    } catch (error) {
      console.error("Error in uploadVideo:", error)
      throw error
    }
  }

  async searchVideos(query: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()

      const url = new URL(`${this.baseUrl}/${this.location}/Accounts/${this.accountId}/Videos/Search`)
      url.searchParams.append("query", query)
      url.searchParams.append("accessToken", accessToken)

      console.log("Searching videos at:", url.toString())

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
        },
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error in searchVideos:", error)
      throw error
    }
  }

  async getAllVideos(): Promise<Video[]> {
    try {
      const accessToken = await this.getAccessToken()

      const url = new URL(`${this.baseUrl}/${this.location}/Accounts/${this.accountId}/Videos`)
      url.searchParams.append("accessToken", accessToken)

      console.log("Fetching all videos from:", url.toString())

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
        },
      })

      const result = await this.handleResponse(response, "Failed to fetch videos")
      return result.results || []
    } catch (error) {
      console.error("Error in getAllVideos:", error)
      throw error
    }
  }

  async getVideoStreamingUrl(videoId: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken()

      const url = new URL(
        `${this.baseUrl}/${this.location}/Accounts/${this.accountId}/Videos/${videoId}/SourceFile/DownloadUrl`,
      )
      url.searchParams.append("accessToken", accessToken)

      console.log("Fetching video streaming URL from:", url.toString())

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
        },
      })

      const result = await this.handleResponse(response, "Failed to fetch video streaming URL")
      return result
    } catch (error) {
      console.error("Error in getVideoStreamingUrl:", error)
      throw error
    }
  }

  async generateThumbnail(videoId: string, thumbnailId: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken()

      const url = new URL(
        `${this.baseUrl}/${this.location}/Accounts/${this.accountId}/Videos/${videoId}/Thumbnails/${thumbnailId}`,
      )
      url.searchParams.append("accessToken", accessToken)
      url.searchParams.append("format", "Jpeg")

      console.log("Generating thumbnail from:", url.toString())

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
        },
      })

      if (!response.ok) {
        throw this.createError("Failed to generate thumbnail", response)
      }

      const blob = await response.blob()
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error("Error in generateThumbnail:", error)
      throw error
    }
  }

  async getVideoDownloadUrl(videoId: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken()

      const url = new URL(
        `${this.baseUrl}/${this.location}/Accounts/${this.accountId}/Videos/${videoId}/SourceFile/DownloadUrl`,
      )
      url.searchParams.append("accessToken", accessToken)

      console.log("Fetching video download URL from:", url.toString())

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
        },
      })

      const result = await this.handleResponse(response, "Failed to fetch video download URL")
      return result
    } catch (error) {
      console.error("Error in getVideoDownloadUrl:", error)
      throw error
    }
  }

  async getVideoInsights(videoId: string): Promise<VideoInsights> {
    try {
      const accessToken = await this.getAccessToken()

      const url = new URL(`${this.baseUrl}/${this.location}/Accounts/${this.accountId}/Videos/${videoId}/Index`)
      url.searchParams.append("accessToken", accessToken)
      url.searchParams.append("language", "English")

      console.log("Fetching video insights from:", url.toString())

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
        },
      })

      const result = await this.handleResponse(response, "Failed to fetch video insights")
      return result
    } catch (error) {
      console.error("Error in getVideoInsights:", error)
      throw error
    }
  }

  async getVideoKeyframes(videoId: string): Promise<Keyframe[]> {
    try {
      const accessToken = await this.getAccessToken()

      const url = new URL(`${this.baseUrl}/${this.location}/Accounts/${this.accountId}/Videos/${videoId}/Index`)
      url.searchParams.append("accessToken", accessToken)
      url.searchParams.append("language", "English")

      console.log("Fetching video keyframes from:", url.toString())

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
        },
      })

      const result = await this.handleResponse(response, "Failed to fetch video keyframes")
      return result.videos[0].insights.keyFrames || []
    } catch (error) {
      console.error("Error in getVideoKeyframes:", error)
      throw error
    }
  }

  async getKeyframeThumbnail(videoId: string, thumbnailId: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken()

      const url = new URL(
        `${this.baseUrl}/${this.location}/Accounts/${this.accountId}/Videos/${videoId}/Thumbnails/${thumbnailId}`,
      )
      url.searchParams.append("accessToken", accessToken)
      url.searchParams.append("format", "Jpeg")

      console.log("Generating keyframe thumbnail from:", url.toString())

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
        },
      })

      if (!response.ok) {
        throw this.createError("Failed to generate keyframe thumbnail", response)
      }

      const blob = await response.blob()
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error("Error in getKeyframeThumbnail:", error)
      throw error
    }
  }
}

export const videoIndexer = new VideoIndexerClient()

