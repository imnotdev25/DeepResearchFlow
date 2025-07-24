import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { type Paper } from "@shared/schema";

interface GraphVisualizationProps {
  paperId: string;
  onNodeClick: (paper: Paper) => void;
}

export function GraphVisualization({ paperId, onNodeClick }: GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paperId) return;
    
    setIsLoading(true);
    setError(null);
    
    // Placeholder for D3.js visualization
    // This would normally fetch citation data and render a graph
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Mock successful load
    }, 1000);

    return () => clearTimeout(timer);
  }, [paperId]);

  const handleReset = () => {
    // Reset zoom and pan
    console.log("Reset graph view");
  };

  const handleZoomIn = () => {
    // Zoom in
    console.log("Zoom in");
  };

  const handleZoomOut = () => {
    // Zoom out
    console.log("Zoom out");
  };

  const handleFullscreen = () => {
    // Toggle fullscreen
    console.log("Toggle fullscreen");
  };

  if (isLoading) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading citation network...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Graph Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleFullscreen}>
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* SVG Container */}
      <div className="h-[500px] border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="rounded-lg"
        >
          {/* Placeholder visualization */}
          <g>
            {/* Central node */}
            <circle
              cx="50%"
              cy="50%"
              r="20"
              fill="#3b82f6"
              stroke="#1d4ed8"
              strokeWidth="2"
              className="cursor-pointer hover:fill-blue-700"
            />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dy="0.35em"
              fill="white"
              fontSize="12"
              fontWeight="bold"
            >
              Paper
            </text>

            {/* Connected nodes */}
            {[...Array(8)].map((_, i) => {
              const angle = (i * Math.PI * 2) / 8;
              const radius = 100;
              const x = 50 + Math.cos(angle) * radius;
              const y = 50 + Math.sin(angle) * radius;
              
              return (
                <g key={i}>
                  {/* Connection line */}
                  <line
                    x1="50%"
                    y1="50%"
                    x2={`${x}%`}
                    y2={`${y}%`}
                    stroke="#94a3b8"
                    strokeWidth="1"
                  />
                  {/* Connected node */}
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="12"
                    fill="#64748b"
                    stroke="#475569"
                    strokeWidth="1"
                    className="cursor-pointer hover:fill-slate-600"
                  />
                  <text
                    x={`${x}%`}
                    y={`${y}%`}
                    textAnchor="middle"
                    dy="0.35em"
                    fill="white"
                    fontSize="8"
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Graph Info */}
      <div className="mt-4 text-sm text-slate-600 dark:text-slate-400 text-center">
        Interactive citation network visualization (placeholder)
        <br />
        Click nodes to explore connected papers
      </div>
    </div>
  );
}