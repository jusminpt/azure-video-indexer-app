import { NextRequest, NextResponse } from 'next/server'
import { videoIndexer } from '@/app/lib/video-indexer'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const searchResults = await videoIndexer.searchByImage(file)
    return NextResponse.json(searchResults)
  } catch (error) {
    console.error('Error in search-by-image API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

