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
          { id: mainPaper.paperId, paper: mainPaper }
        ];
        
        const links: GraphLink[] = [];

        // Add citation nodes and links (papers that cite this one)
        citations.papers?.slice(0, maxCitations).forEach((paper: Paper) => {
          if (paper && paper.paperId) {
            nodes.push({ id: paper.paperId, paper });
            links.push({ source: paper.paperId, target: mainPaper.paperId, type: 'citation' });
          }
        });

        // Add reference nodes and links (papers this one references)
        references.papers?.slice(0, maxReferences).forEach((paper: Paper) => {
          if (paper && paper.paperId) {
            nodes.push({ id: paper.paperId, paper });
            links.push({ source: mainPaper.paperId, target: paper.paperId, type: 'reference' });
          }
        });

        console.log(`Graph data: ${nodes.length} nodes, ${links.length} links`);
        console.log('Citations:', citations.papers?.length || 0, 'References:', references.papers?.length || 0);

        setGraphData({ nodes, links });
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

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(graphData.links).id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    simulationRef.current = simulation;

    // Create links
    const link = g.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(graphData.links)
      .join("line")
      .attr("stroke-width", 2)
      .attr("stroke", d => d.type === 'citation' ? '#ef4444' : '#3b82f6');

    // Create nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(graphData.nodes)
      .join("circle")
      .attr("r", d => d.paper.paperId === paperId ? 20 : 12)
      .attr("fill", d => d.paper.paperId === paperId ? '#3b82f6' : '#64748b')
      .attr("stroke", d => d.paper.paperId === paperId ? '#1d4ed8' : '#475569')
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d.paper);
      });

    // Add drag behavior
    node.call(d3.drag<any, GraphNode>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

    // Add labels
    const labels = g.append("g")
      .selectAll("text")
      .data(graphData.nodes)
      .join("text")
      .text(d => d.paper.title.length > 30 ? d.paper.title.substring(0, 30) + "..." : d.paper.title)
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .attr("dy", -25)
      .style("pointer-events", "none")
      .style("fill", "#374151");

    // Add hover effects
    node.on("mouseenter", function(event, d) {
      d3.select(this).attr("r", d.paper.paperId === paperId ? 24 : 16);
    }).on("mouseleave", function(event, d) {
      d3.select(this).attr("r", d.paper.paperId === paperId ? 20 : 12);
    });

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      node
        .attr("cx", d => d.x!)
        .attr("cy", d => d.y!);

      labels
        .attr("x", d => d.x!)
        .attr("y", d => d.y!);
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
      <div className="mt-4 text-sm text-slate-600 dark:text-slate-400 text-center">
        Interactive citation network (showing top {maxCitations} citations, {maxReferences} references)
        <br />
        <span className="text-blue-600">Blue lines:</span> References • <span className="text-red-600">Red lines:</span> Citations • <span className="font-medium">Drag nodes</span> to explore
      </div>
    </div>
  );
}