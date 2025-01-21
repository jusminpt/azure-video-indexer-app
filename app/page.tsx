import { VideoUpload } from './components/video-upload'
import { VideoSearchAndList } from './components/video-search-and-list'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Azure Video Indexer</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-[300px_1fr]">
          <div className="space-y-8">
            <VideoUpload />
          </div>
          <div className="space-y-8">
            <VideoSearchAndList />
          </div>
        </div>
      </main>
    </div>
  )
}

