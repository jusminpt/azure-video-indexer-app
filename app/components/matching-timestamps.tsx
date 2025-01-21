import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Appearance {
  startTime: string
  endTime: string
}

interface MatchingTimestamp {
  type: "label" | "keyword" | "topic"
  name: string
  appearances: Appearance[]
}

interface MatchingTimestampsProps {
  timestamps: MatchingTimestamp[]
  onSelectTimestamp: (startTime: string) => void
}

export function MatchingTimestamps({ timestamps, onSelectTimestamp }: MatchingTimestampsProps) {
  const [expanded, setExpanded] = useState(false)

  const formatTime = (time: string) => {
    const [minutes, seconds] = time.split(":").map(Number)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="mt-2">
      <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
        {expanded ? "Hide" : "Show"} Matching Timestamps
      </Button>
      {expanded && (
        <ScrollArea className="h-40 mt-2 border rounded">
          <div className="p-2">
            {timestamps.map((timestamp, index) => (
              <div key={index} className="mb-2">
                <p className="font-semibold">
                  {timestamp.type}: {timestamp.name}
                </p>
                {timestamp.appearances.map((appearance, idx) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    size="sm"
                    className="mr-2 mb-1"
                    onClick={() => onSelectTimestamp(appearance.startTime)}
                  >
                    {formatTime(appearance.startTime)} - {formatTime(appearance.endTime)}
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

