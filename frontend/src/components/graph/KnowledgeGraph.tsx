import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { useQuery } from '@tanstack/react-query'
import { graphApi, notesApi, tagsApi } from '@/lib/api'
import { useNoteStore } from '@/stores/noteStore'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Search,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import type { GraphNode, GraphEdge, Tag } from '@/types'

export const KnowledgeGraph: React.FC = () => {
  const navigate = useNavigate()
  const { setActiveNote } = useNoteStore()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null)

  // Fetch graph data
  const { data: graphData, isLoading, refetch } = useQuery({
    queryKey: ['graph'],
    queryFn: graphApi.getGraph,
  })

  // Fetch tags for filtering
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  // Filter nodes & edges based on search and tag selection
  const filteredData = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [] }

    let nodes = [...graphData.nodes]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      nodes = nodes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.tag_names.some((t) => t.toLowerCase().includes(q))
      )
    }

    if (selectedTagFilter) {
      nodes = nodes.filter((n) => n.tag_names.includes(selectedTagFilter))
    }

    const nodeIds = new Set(nodes.map((n) => n.id))
    const edges = graphData.edges.filter(
      (e) =>
        nodeIds.has(typeof e.source === 'object' ? (e.source as any).id : (e.source as number)) &&
        nodeIds.has(typeof e.target === 'object' ? (e.target as any).id : (e.target as number))
    )

    return { nodes, edges }
  }, [graphData, searchQuery, selectedTagFilter])

  // Render D3 Graph
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || filteredData.nodes.length === 0) return

    const width = containerRef.current.clientWidth || 800
    const height = containerRef.current.clientHeight || 600

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Container group for zoom & pan
    const g = svg.append('g').attr('class', 'graph-content')

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Deep clone nodes and edges for D3 simulation
    const simulationNodes: (GraphNode & d3.SimulationNodeDatum)[] = filteredData.nodes.map((n) => ({
      ...n,
    }))
    const simulationEdges: any[] = filteredData.edges.map((e) => ({
      source: typeof e.source === 'object' ? (e.source as any).id : e.source,
      target: typeof e.target === 'object' ? (e.target as any).id : e.target,
    }))

    // Connected nodes lookup map
    const neighborMap = new Map<number, Set<number>>()
    simulationNodes.forEach((n) => neighborMap.set(n.id, new Set<number>()))
    simulationEdges.forEach((e) => {
      neighborMap.get(e.source)?.add(e.target)
      neighborMap.get(e.target)?.add(e.source)
    })

    // Force simulation setup
    const simulation = d3
      .forceSimulation(simulationNodes)
      .force(
        'link',
        d3
          .forceLink(simulationEdges)
          .id((d: any) => d.id)
          .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(28))

    // Draw Edges
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(simulationEdges)
      .enter()
      .append('line')
      .attr('stroke', '#6366f1')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.5)

    // Draw Node Groups
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('.node')
      .data(simulationNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    // Node Outer Glow Ring
    node
      .append('circle')
      .attr('r', 12)
      .attr('fill', '#818cf8')
      .attr('fill-opacity', 0.15)
      .attr('stroke', '#818cf8')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)

    // Node Center Circle
    node
      .append('circle')
      .attr('r', 6)
      .attr('fill', (d) => {
        if (d.tag_names.includes('aws')) return '#f59e0b'
        if (d.tag_names.includes('docker')) return '#06b6d4'
        if (d.tag_names.includes('python')) return '#10b981'
        return '#818cf8'
      })

    // Node Text Labels
    node
      .append('text')
      .text((d) => d.title)
      .attr('x', 14)
      .attr('y', 4)
      .attr('fill', '#f1f5f9')
      .attr('font-size', '11px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')

    // Node Interaction Handlers
    node
      .on('mouseover', (_, d) => {
        setHoveredNodeId(d.id)
        const neighbors = neighborMap.get(d.id) || new Set()

        node.style('opacity', (n) => (n.id === d.id || neighbors.has(n.id) ? 1 : 0.2))
        link.style('stroke-opacity', (l) =>
          l.source.id === d.id || l.target.id === d.id ? 0.9 : 0.08
        ).style('stroke-width', (l) =>
          l.source.id === d.id || l.target.id === d.id ? 2.5 : 1
        )
      })
      .on('mouseout', () => {
        setHoveredNodeId(null)
        node.style('opacity', 1)
        link.style('stroke-opacity', 0.4).style('stroke-width', 1.5)
      })
      .on('click', async (_, d) => {
        try {
          const fullNote = await notesApi.get(d.id)
          setActiveNote(fullNote)
          navigate('/')
        } catch {
          // Error handled by Axios
        }
      })

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [filteredData, navigate, setActiveNote])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-3.5rem)] bg-gradient-to-b from-background via-card/40 to-background overflow-hidden select-none"
    >
      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 max-w-xl">
        {/* Search Overlay */}
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-card/80 backdrop-blur-md border-border/80"
          />
        </div>

        {/* Tag filter pills */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-xs py-1">
          {tags.map((tag: Tag) => (
            <button
              key={tag.id}
              onClick={() =>
                setSelectedTagFilter(selectedTagFilter === tag.name ? null : tag.name)
              }
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                selectedTagFilter === tag.name
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card/70 backdrop-blur-md border border-border/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              #{tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Right Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-card/80 backdrop-blur-md p-1 rounded-lg border border-border/80 shadow-md">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => refetch()}
          title="Refresh Graph"
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Empty State / Loading */}
      {isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <span>Computing knowledge connections...</span>
        </div>
      ) : filteredData.nodes.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
          <Sparkles className="h-8 w-8 text-primary/60 mb-1" />
          <p className="font-semibold text-foreground">No Knowledge Graph Nodes</p>
          <p className="text-muted-foreground/70">
            Create notes and connect them using [[Wiki Links]] to build your interactive knowledge graph.
          </p>
        </div>
      ) : null}

      {/* SVG Canvas for D3 */}
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  )
}
