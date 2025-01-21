import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Appearance {
  startTime: string
  endTime: string
  text?: string
}

interface MatchingTimestamp {
  type: "label" | "keyword" | "topic" | "subtitle"
  name: string
  appearances: Appearance[]
}

interface MatchingTimestampsWithSubtitlesProps {
  timestamps: MatchingTimestamp[]
  onSelectTimestamp: (startTime: string) => void
}

export function MatchingTimestampsWithSubtitles({
  timestamps,
  onSelectTimestamp,
}: MatchingTimestampsWithSubtitlesProps) {
  const [expanded, setExpanded] = useState(false)

  const formatTime = (time: string) => {
    const [minutes, seconds] = time.split(":").map(Number)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const highlightKeywords = (text: string, keyword: string) => {
    const parts = text.split(new RegExp(`(${keyword})`, "gi"))
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === keyword.toLowerCase() ? (
            <span key={i} className="bg-yellow-200 font-bold">
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </>
    )
  }

  return (
    <div className="mt-2">
      <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
        {expanded ? "Hide" : "Show"} Matching Timestamps
      </Button>
      {expanded && (
        <ScrollArea className="h-60 mt-2 border rounded">
          <div className="p-2">
            {timestamps.map((timestamp, index) => (
              <div key={index} className="mb-4">
                <p className="font-semibold">
                  {timestamp.type}: {timestamp.name}
                </p>
                {timestamp.appearances.map((appearance, idx) => (
                  <div key={idx} className="mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mr-2 mb-1"
                      onClick={() => onSelectTimestamp(appearance.startTime)}
                    >
                      {formatTime(appearance.startTime)} - {formatTime(appearance.endTime)}
                    </Button>
                    {appearance.text && (
                      <p className="text-sm text-gray-600 ml-2">{highlightKeywords(appearance.text, timestamp.name)}</p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

