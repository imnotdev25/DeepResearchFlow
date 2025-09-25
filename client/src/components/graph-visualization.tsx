import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { type Paper } from "@shared/schema";
import * as d3 from "d3";

interface GraphVisualizationProps {
  paperId: string;
  onNodeClick: (paper: Paper) => void;
  maxCitations?: number;
  maxReferences?: number;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  paper: Paper;
  year: number;
  citations: number;
  authorLastName: string;
  x?: number;
  y?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'citation' | 'reference';
}

export function GraphVisualization({ 
  paperId, 
  onNodeClick, 
  maxCitations = 5, 
  maxReferences = 5 
}: GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[], links: GraphLink[] } | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Fetch citation data and setup D3.js graph
  useEffect(() => {
    if (!paperId || !svgRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    const fetchCitationData = async () => {
      try {
        // Fetch main paper
        const paperResponse = await fetch(`/api/papers/${paperId}`);
        if (!paperResponse.ok) throw new Error('Failed to fetch paper data');
        const mainPaper = await paperResponse.json();

        // Fetch citations and references
        const citationsResponse = await fetch(`/api/papers/${paperId}/citations`);
        const referencesResponse = await fetch(`/api/papers/${paperId}/references`);
        
        const citations = citationsResponse.ok ? await citationsResponse.json() : { papers: [] };
        const references = referencesResponse.ok ? await referencesResponse.json() : { papers: [] };

        // Build graph data
        const nodes: GraphNode[] = [
          { 
            id: mainPaper.paperId, 
            paper: mainPaper,
            year: mainPaper.year || new Date().getFullYear(),
            citations: mainPaper.citationCount || 0,
            authorLastName: mainPaper.authors?.[0]?.name?.split(' ').pop() || 'Unknown'
          }
        ];
        
        const links: GraphLink[] = [];

        // Add citation nodes (papers that cite this one)
        citations.papers?.slice(0, maxCitations).forEach((paper: Paper) => {
          if (paper && paper.paperId) {
            nodes.push({ 
              id: paper.paperId, 
              paper,
              year: paper.year || new Date().getFullYear(),
              citations: paper.citationCount || 0,
              authorLastName: paper.authors?.[0]?.name?.split(' ').pop() || 'Unknown'
            });
            // Remove link creation for bubble layout
          }
        });

        // Add reference nodes (papers this one references)
        references.papers?.slice(0, maxReferences).forEach((paper: Paper) => {
          if (paper && paper.paperId) {
            nodes.push({ 
              id: paper.paperId, 
              paper,
              year: paper.year || new Date().getFullYear(),
              citations: paper.citationCount || 0,
              authorLastName: paper.authors?.[0]?.name?.split(' ').pop() || 'Unknown'
            });
            // Remove link creation for bubble layout
          }
        });

        console.log(`Graph data: ${nodes.length} nodes, ${links.length} links`);
        console.log('Citations:', citations.papers?.length || 0, 'References:', references.papers?.length || 0);

        setGraphData({ nodes, links: [] }); // No links needed for bubble layout
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load citation data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCitationData();
  }, [paperId, maxCitations, maxReferences]);

  // Create D3.js visualization
  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 500;

    // Clear previous content
    svg.selectAll("*").remove();

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Create main group for zoomable content
    const g = svg.append("g");

    // Create bubble scales
    const minYear = d3.min(graphData.nodes, d => d.year) || 1997;
    const maxYear = d3.max(graphData.nodes, d => d.year) || 2024;
    const maxCitations = d3.max(graphData.nodes, d => d.citations) || 1;
    
    // Radius scale based on citation count
    const radiusScale = d3.scaleSqrt()
      .domain([0, maxCitations])
      .range([10, 40]);
    
    // Color scale based on year
    const colorScale = d3.scaleSequential(d3.interpolateTurbo)
      .domain([minYear, maxYear]);
    
    // X position scale based on year for temporal clustering
    const xScale = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([100, width - 100]);

    // Create bubble simulation (no links)
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force("x", d3.forceX(d => xScale(d.year)).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .force("charge", d3.forceManyBody().strength(-10))
      .force("collide", d3.forceCollide(d => radiusScale(d.citations) * 0.9));

    simulationRef.current = simulation;

    // Create bubble nodes as groups containing circle and text
    const nodeGroups = g.append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .attr("class", "bubble-node")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d.paper);
      });

    // Create bubble circles
    const circles = nodeGroups.append("circle")
      .attr("r", d => radiusScale(d.citations))
      .attr("fill", d => d.year ? colorScale(d.year) : '#6b7280')
      .attr("fill-opacity", 0.6)
      .attr("stroke", d => d3.color(d.year ? colorScale(d.year) : '#6b7280')?.darker(1).toString() || '#374151')
      .attr("stroke-width", 1.5)
      .attr("data-testid", d => `bubble-${d.id}`);

    // Add drag behavior to node groups
    nodeGroups.call(d3.drag<any, GraphNode>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

    // Add author labels
    const authorLabels = nodeGroups.append("text")
      .text(d => d.authorLastName)
      .attr("text-anchor", "middle")
      .attr("dy", "-0.1em")
      .attr("font-size", d => Math.max(8, Math.min(14, radiusScale(d.citations) * 0.4)))
      .attr("font-weight", "600")
      .attr("fill", "white")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.5)
      .style("pointer-events", "none")
      .attr("data-testid", d => `author-label-${d.id}`);

    // Add year labels
    const yearLabels = nodeGroups.append("text")
      .text(d => d.year)
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .attr("font-size", d => Math.max(7, Math.min(12, radiusScale(d.citations) * 0.3)))
      .attr("font-weight", "400")
      .attr("fill", "white")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.3)
      .style("pointer-events", "none")
      .attr("data-testid", d => `year-label-${d.id}`);

    // Add hover effects
    nodeGroups.on("mouseenter", function(event, d) {
      d3.select(this).select("circle")
        .transition().duration(200)
        .attr("r", radiusScale(d.citations) * 1.1)
        .attr("fill-opacity", 0.8);
    }).on("mouseleave", function(event, d) {
      d3.select(this).select("circle")
        .transition().duration(200)
        .attr("r", radiusScale(d.citations))
        .attr("fill-opacity", 0.6);
    });

    // Update positions on tick
    simulation.on("tick", () => {
      nodeGroups
        .attr("transform", d => `translate(${d.x!},${d.y!})`);
    });

    // Drag functions
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Add legends
    const legendContainer = svg.append("g")
      .attr("class", "legends")
      .attr("transform", `translate(20, ${height - 100})`);

    // Color legend (years)
    const colorLegend = legendContainer.append("g")
      .attr("class", "color-legend")
      .attr("data-testid", "color-legend");

    const legendWidth = 200;
    const legendHeight = 10;
    
    // Create gradient for color legend
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "year-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%");
    
    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      const t = i / numStops;
      const year = minYear + t * (maxYear - minYear);
      gradient.append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", colorScale(year));
    }
    
    colorLegend.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#year-gradient)");
    
    colorLegend.append("text")
      .attr("x", 0)
      .attr("y", legendHeight + 15)
      .attr("font-size", 12)
      .attr("fill", "#374151")
      .text(minYear.toString());
    
    colorLegend.append("text")
      .attr("x", legendWidth)
      .attr("y", legendHeight + 15)
      .attr("text-anchor", "end")
      .attr("font-size", 12)
      .attr("fill", "#374151")
      .text(maxYear.toString());
    
    colorLegend.append("text")
      .attr("x", legendWidth / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("font-weight", "600")
      .attr("fill", "#374151")
      .text("Publication Year");

    // Size legend (citations)
    const sizeLegend = legendContainer.append("g")
      .attr("class", "size-legend")
      .attr("transform", `translate(${legendWidth + 60}, 0)`)
      .attr("data-testid", "size-legend");
    
    const sizeSteps = [0, Math.floor(maxCitations * 0.25), Math.floor(maxCitations * 0.5), maxCitations];
    
    sizeLegend.append("text")
      .attr("x", 50)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("font-weight", "600")
      .attr("fill", "#374151")
      .text("Citation Count");
    
    sizeSteps.forEach((count, i) => {
      const radius = radiusScale(count);
      const y = legendHeight + radius + i * 20;
      
      sizeLegend.append("circle")
        .attr("cx", 25)
        .attr("cy", y)
        .attr("r", radius)
        .attr("fill", "#6b7280")
        .attr("fill-opacity", 0.6)
        .attr("stroke", "#374151")
        .attr("stroke-width", 1);
      
      sizeLegend.append("text")
        .attr("x", 55)
        .attr("y", y + 4)
        .attr("font-size", 10)
        .attr("fill", "#374151")
        .text(`${count} citations`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, paperId, onNodeClick]);

  const handleReset = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
    console.log("Reset graph view");
  };

  const handleZoomIn = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(200)
        .call(zoomRef.current.scaleBy, 1.5);
    }
    console.log("Zoom in");
  };

  const handleZoomOut = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(200)
        .call(zoomRef.current.scaleBy, 0.75);
    }
    console.log("Zoom out");
  };

  const handleFullscreen = () => {
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
          width="800"
          height="500"
          viewBox="0 0 800 500"
          className="w-full h-full rounded-lg"
          style={{ userSelect: 'none' }}
        />
      </div>

      {/* Graph Info */}
      <div className="mt-4 text-sm text-slate-600 dark:text-slate-400 text-center" data-testid="graph-info">
        Interactive bubble citation network (showing top {maxCitations} citations, {maxReferences} references)
        <br />
        <span className="font-medium">Bubble size:</span> Citation count • <span className="font-medium">Color:</span> Publication year • <span className="font-medium">Drag bubbles</span> to explore
      </div>
    </div>
  );
}