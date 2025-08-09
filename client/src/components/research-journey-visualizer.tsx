import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Calendar, TrendingUp, Users } from "lucide-react";
import { type Paper } from "@shared/schema";
import * as d3 from "d3";

interface ResearchJourneyVisualizerProps {
  papers: Paper[];
  onPaperSelect?: (paper: Paper) => void;
}

interface JourneyNode extends Paper {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface JourneyLink {
  source: string;
  target: string;
  year: number;
  strength: number;
}

export function ResearchJourneyVisualizer({ papers, onPaperSelect }: ResearchJourneyVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentYear, setCurrentYear] = useState<number>(2000);
  const [animationSpeed, setAnimationSpeed] = useState([1000]);
  const [sortBy, setSortBy] = useState<"year" | "citations" | "influence">("year");
  const [filteredPapers, setFilteredPapers] = useState<JourneyNode[]>([]);
  const [journeyLinks, setJourneyLinks] = useState<JourneyLink[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const minYear = Math.min(...papers.filter(p => p.year).map(p => p.year!));
  const maxYear = Math.max(...papers.filter(p => p.year).map(p => p.year!));

  // Process papers and create journey visualization data
  useEffect(() => {
    if (!papers.length) return;

    // Sort papers based on selected criteria
    const sorted = [...papers].sort((a, b) => {
      switch (sortBy) {
        case "year":
          return (a.year || 0) - (b.year || 0);
        case "citations":
          return (b.citationCount || 0) - (a.citationCount || 0);
        case "influence":
          return (b.citationCount || 0) * (b.referenceCount || 0) - 
                 (a.citationCount || 0) * (a.referenceCount || 0);
        default:
          return 0;
      }
    });

    setFilteredPapers(sorted.map(paper => ({ ...paper })));

    // Create links based on temporal proximity and field similarity
    const links: JourneyLink[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      
      if (current.year && next.year) {
        const yearDiff = Math.abs(next.year - current.year);
        const fieldOverlap = current.fieldsOfStudy?.some(field => 
          next.fieldsOfStudy?.includes(field)
        ) ? 1 : 0;
        
        links.push({
          source: current.paperId,
          target: next.paperId,
          year: Math.max(current.year, next.year),
          strength: fieldOverlap + (1 / (yearDiff + 1))
        });
      }
    }

    setJourneyLinks(links);
    setCurrentYear(minYear);
  }, [papers, sortBy, minYear]);

  // Animation control
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentYear(prev => {
          if (prev >= maxYear) {
            setIsPlaying(false);
            return maxYear;
          }
          return prev + 1;
        });
      }, animationSpeed[0]);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, animationSpeed, maxYear]);

  // D3 visualization
  useEffect(() => {
    if (!svgRef.current || !filteredPapers.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Filter papers and links up to current year
    const visiblePapers = filteredPapers.filter(p => (p.year || 0) <= currentYear);
    const visibleLinks = journeyLinks.filter(l => l.year <= currentYear);

    if (!visiblePapers.length) return;

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(visiblePapers, d => d.citationCount || 0) || 1])
      .range([height - margin.bottom, margin.top]);

    const radiusScale = d3.scaleLinear()
      .domain([0, d3.max(visiblePapers, d => d.citationCount || 0) || 1])
      .range([3, 20]);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create main group
    const g = svg.append("g");

    // Add timeline axis
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "currentColor")
      .style("text-anchor", "middle")
      .text("Publication Year");

    // Add citation axis
    const yAxis = d3.axisLeft(yScale);
    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -height / 2)
      .attr("fill", "currentColor")
      .style("text-anchor", "middle")
      .text("Citation Count");

    // Create links (connections between papers)
    const links = g.selectAll(".journey-link")
      .data(visibleLinks)
      .enter()
      .append("line")
      .attr("class", "journey-link")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", d => d.strength * 2)
      .attr("stroke-opacity", 0.6)
      .attr("x1", d => {
        const source = visiblePapers.find(p => p.paperId === d.source);
        return source ? xScale(source.year || 0) : 0;
      })
      .attr("y1", d => {
        const source = visiblePapers.find(p => p.paperId === d.source);
        return source ? yScale(source.citationCount || 0) : 0;
      })
      .attr("x2", d => {
        const target = visiblePapers.find(p => p.paperId === d.target);
        return target ? xScale(target.year || 0) : 0;
      })
      .attr("y2", d => {
        const target = visiblePapers.find(p => p.paperId === d.target);
        return target ? yScale(target.citationCount || 0) : 0;
      });

    // Create nodes (papers)
    const nodes = g.selectAll(".journey-node")
      .data(visiblePapers)
      .enter()
      .append("g")
      .attr("class", "journey-node")
      .attr("transform", d => `translate(${xScale(d.year || 0)}, ${yScale(d.citationCount || 0)})`);

    // Add circles for papers
    nodes.append("circle")
      .attr("r", d => radiusScale(d.citationCount || 0))
      .attr("fill", d => colorScale(d.fieldsOfStudy?.[0] || "Unknown"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (onPaperSelect) onPaperSelect(d);
      })
      .on("mouseover", function(event, d) {
        // Show tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "journey-tooltip")
          .style("opacity", 0)
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", "1000");

        tooltip.transition()
          .duration(200)
          .style("opacity", 1);

        tooltip.html(`
          <strong>${d.title}</strong><br/>
          Year: ${d.year}<br/>
          Citations: ${d.citationCount}<br/>
          Authors: ${d.authors?.length || 0}<br/>
          ${d.venue ? `Venue: ${d.venue}` : ''}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");

        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", radiusScale(d.citationCount || 0) * 1.5);
      })
      .on("mouseout", function(event, d) {
        d3.selectAll(".journey-tooltip").remove();
        
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", radiusScale(d.citationCount || 0));
      });

    // Add animation effect for new nodes
    nodes.style("opacity", 0)
      .transition()
      .duration(500)
      .style("opacity", 1);

    // Add current year indicator
    const yearLine = svg.append("line")
      .attr("class", "year-indicator")
      .attr("x1", xScale(currentYear))
      .attr("x2", xScale(currentYear))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    // Add year label
    svg.append("text")
      .attr("class", "year-label")
      .attr("x", xScale(currentYear))
      .attr("y", margin.top - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#ef4444")
      .attr("font-weight", "bold")
      .text(currentYear);

  }, [filteredPapers, journeyLinks, currentYear, minYear, maxYear, onPaperSelect]);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentYear(minYear);
  };

  const handleYearChange = (value: number[]) => {
    setCurrentYear(value[0]);
    setIsPlaying(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Animated Research Journey
        </CardTitle>
        <CardDescription>
          Explore the evolution of research over time with animated visualization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePlay}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Sort by:</label>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="citations">Citations</SelectItem>
                <SelectItem value="influence">Influence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Speed:</label>
            <div className="w-24">
              <Slider
                value={animationSpeed}
                onValueChange={setAnimationSpeed}
                min={100}
                max={2000}
                step={100}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Year control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Timeline: {currentYear}
            </label>
            <Badge variant="outline">
              {filteredPapers.filter(p => (p.year || 0) <= currentYear).length} / {filteredPapers.length} papers
            </Badge>
          </div>
          <Slider
            value={[currentYear]}
            onValueChange={handleYearChange}
            min={minYear}
            max={maxYear}
            step={1}
            className="w-full"
          />
        </div>

        {/* Visualization */}
        <div className="border rounded-lg bg-white dark:bg-slate-900">
          <svg
            ref={svgRef}
            width="100%"
            height="600"
            viewBox="0 0 800 600"
            className="w-full"
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Papers (size = citations)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-slate-400"></div>
            <span>Temporal connections</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-8 bg-red-500"></div>
            <span>Current year</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredPapers.filter(p => (p.year || 0) <= currentYear).length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Papers Shown</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {journeyLinks.filter(l => l.year <= currentYear).length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Connections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {currentYear}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Current Year</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {maxYear - minYear + 1}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Year Span</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}