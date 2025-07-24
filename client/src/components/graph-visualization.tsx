import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crosshair, ZoomOut, Maximize2, Download } from "lucide-react";
import { type Paper, type GraphNode, type GraphLink } from "@shared/schema";
import * as d3 from "d3";

interface GraphVisualizationProps {
  selectedPaper: Paper | null;
  onPaperSelect: (paper: Paper) => void;
}

export function GraphVisualization({ selectedPaper, onPaperSelect }: GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [layout, setLayout] = useState("force-directed");
  const [simulation, setSimulation] = useState<d3.Simulation<GraphNode, GraphLink> | null>(null);

  // Fetch graph data when a paper is selected
  const { data: graphData, isLoading } = useQuery({
    queryKey: ["/api/papers", selectedPaper?.paperId, "graph"],
    enabled: !!selectedPaper?.paperId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }) as { data: { nodes: GraphNode[]; links: GraphLink[] } | undefined; isLoading: boolean };

  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous content
    svg.selectAll("*").remove();

    const nodes: GraphNode[] = graphData.nodes || [];
    const links: GraphLink[] = graphData.links || [];

    if (nodes.length === 0) return;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const g = svg.append("g");

    // Create arrow markers for directed edges
    svg.append("defs").selectAll("marker")
      .data(["citation", "reference", "semantic"])
      .enter().append("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", d => d === "citation" ? "#1976D2" : d === "reference" ? "#FF6F00" : "#4CAF50");

    // Create force simulation
    const sim = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    setSimulation(sim);

    // Create links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", (d: any) => d.type === "citation" ? "#1976D2" : d.type === "reference" ? "#FF6F00" : "#4CAF50")
      .attr("stroke-width", (d: any) => d.strength || 1)
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", (d: any) => `url(#arrow-${d.type})`);

    // Create node groups
    const nodeGroup = g.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Create circles for nodes
    nodeGroup.append("circle")
      .attr("r", (d: any) => Math.max(8, Math.min(20, Math.sqrt((d.citationCount || 0) / 100))))
      .attr("fill", (d: any) => d.id === selectedPaper?.paperId ? "#1976D2" : "#FF6F00")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Add labels
    nodeGroup.append("text")
      .text((d: any) => {
        const title = d.title.length > 30 ? d.title.substring(0, 30) + "..." : d.title;
        return title;
      })
      .attr("font-size", "10px")
      .attr("text-anchor", "middle")
      .attr("dy", "25px")
      .attr("fill", "#333")
      .style("pointer-events", "none");

    // Add click handler
    nodeGroup.on("click", async (event, d) => {
      try {
        const response = await fetch(`/api/papers/${d.id}`);
        if (response.ok) {
          const paper = await response.json();
          onPaperSelect(paper);
        }
      } catch (error) {
        console.error("Error fetching paper:", error);
      }
    });

    // Add hover effects
    nodeGroup
      .on("mouseover", function(event: any, d: GraphNode) {
        d3.select(this as any).select("circle")
          .attr("stroke-width", 3)
          .attr("stroke", "#1976D2");
        
        // Show tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0,0,0,0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", "1000")
          .html(`
            <div><strong>${d.title}</strong></div>
            <div>Authors: ${d.authors.join(", ")}</div>
            <div>Year: ${d.year || "Unknown"}</div>
            <div>Citations: ${d.citationCount || 0}</div>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this as any).select("circle")
          .attr("stroke-width", 2)
          .attr("stroke", "#fff");
        
        // Remove tooltip
        d3.selectAll(".tooltip").remove();
      });

    // Update positions on simulation tick
    sim.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as GraphNode).x!)
        .attr("y1", (d: any) => (d.source as GraphNode).y!)
        .attr("x2", (d: any) => (d.target as GraphNode).x!)
        .attr("y2", (d: any) => (d.target as GraphNode).y!);

      nodeGroup
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Cleanup function
    return () => {
      sim.stop();
      d3.selectAll(".tooltip").remove();
    };
  }, [graphData, selectedPaper, onPaperSelect]);

  const centerGraph = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    svg.transition().duration(750).call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(1)
    );
  };

  const resetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    
    svg.transition().duration(750).call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      d3.zoomIdentity
    );
  };

  const nodeCount = graphData?.nodes?.length || 0;
  const edgeCount = graphData?.links?.length || 0;

  return (
    <>
      {/* Graph Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Research Graph</h2>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={centerGraph}>
                <Crosshair className="w-3 h-3 mr-1" />
                Center
              </Button>
              <Button variant="outline" size="sm" onClick={resetZoom}>
                <ZoomOut className="w-3 h-3 mr-1" />
                Reset Zoom
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Layout:</span>
              <Select value={layout} onValueChange={setLayout}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="force-directed">Force-directed</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  <SelectItem value="circular">Circular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Graph Visualization */}
      <div className="flex-1 relative bg-white">
        {!selectedPaper ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">Select a paper to view its research graph</p>
              <p className="text-sm">Search for papers in the sidebar to get started</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm">Loading graph data...</p>
            </div>
          </div>
        ) : (
          <>
            <svg ref={svgRef} className="w-full h-full" />
            
            {/* Graph Legend */}
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Legend</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span>Selected Paper</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Related Papers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-0.5 bg-primary"></div>
                  <span>Citations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-0.5 bg-orange-500"></div>
                  <span>References</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-0.5 bg-green-500"></div>
                  <span>Semantic Links</span>
                </div>
              </div>
            </div>

            {/* Graph Stats */}
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-600 space-y-1">
                <div>Nodes: <span className="font-medium">{nodeCount}</span></div>
                <div>Edges: <span className="font-medium">{edgeCount}</span></div>
                <div>Clusters: <span className="font-medium">1</span></div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
