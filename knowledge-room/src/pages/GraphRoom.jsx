import { useEffect, useRef, useState } from "react";
import ForceGraph from "force-graph";
import { useParams, useNavigate } from "react-router-dom";

import { searchEntity, getNeighbors } from "../api/wikidata";
import "../styles/graph.css";

export default function GraphRoom() {
  const { topic } = useParams();
  const graphRef = useRef(null);
  const graphInstance = useRef(null);

  const cacheRef = useRef(new Map());
  const selectedRef = useRef(null);

  const [selectedNode, setSelectedNode] = useState(null);
  const navigate = useNavigate();

  // =========================
  // CACHE FETCH
  // =========================
  async function fetchWithCache(id) {
    if (!id) return [];

    if (cacheRef.current.has(id)) {
      return cacheRef.current.get(id);
    }

    const res = await getNeighbors(id);

    const normalized = (res || [])
      .slice(0, 6)
      .map((n) => ({
        id: n.id,
        name: n.label,
        type: classify(n.label),
      }));

    cacheRef.current.set(id, normalized);
    return normalized;
  }

  // =========================
  // INIT GRAPH
  // =========================
  useEffect(() => {
    let graph;

    async function load() {
      const entity = await searchEntity(topic);
      if (!entity) return;

      const root = {
        id: entity.id,
        name: entity.label,
        type: classify(entity.label),
      };

      const neighbors = await fetchWithCache(entity.id);

      const data = {
        nodes: [root, ...neighbors],
        links: neighbors.map((n) => ({
          source: root.id,
          target: n.id,
        })),
      };

      // =========================
      // FORCE GRAPH INIT
      // =========================
      graph = ForceGraph()(graphRef.current)
        .graphData(data)

        // 🔥 layout più sparso
        .cooldownTicks(200)
        .d3Force("charge", (d3) =>
          d3.forceManyBody().strength(-180)
        )
        .d3Force("link", (d3) =>
          d3.forceLink()
            .id((d) => d.id)
            .distance(160)
        )
        .d3Force("center", (d3) =>
          d3.forceCenter()
        )

        // =========================
        // NODI
        // =========================
        .nodeRelSize(6)
        .nodeLabel((n) => n.name)

        .nodeCanvasObject((node, ctx) => {
          const selected = selectedRef.current === node.id;

          const r = selected ? 10 : 6;

          // glow
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 8, 0, Math.PI * 2);
          ctx.fillStyle = selected
            ? "rgba(168,85,247,0.25)"
            : "transparent";
          ctx.fill();

          // nodo
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

          ctx.fillStyle = getColor(node.type, selected);
          ctx.fill();

          // label
          ctx.fillStyle = "white";
          ctx.font = selected ? "13px Arial" : "11px Arial";
          ctx.fillText(node.name, node.x + 12, node.y + 4);
        })

        // =========================
        // CLICK → ESPANSIONE
        // =========================
        .onNodeClick(async (node) => {
          selectedRef.current = node.id;
          setSelectedNode(node);

          const current = graph.graphData();

          const neighbors = await fetchWithCache(node.id);

          let added = 0;

          for (const n of neighbors) {
            if (current.nodes.length >= 20) break;
            if (added >= 6) break;

            if (!current.nodes.find((x) => x.id === n.id)) {
              current.nodes = [...current.nodes, n];
              added++;
            }

            const exists = current.links.find(
              (l) =>
                (typeof l.source === "object"
                  ? l.source.id
                  : l.source) === node.id &&
                (typeof l.target === "object"
                  ? l.target.id
                  : l.target) === n.id
            );

            if (!exists) {
              current.links = [
                ...current.links,
                {
                  source: node.id,
                  target: n.id,
                },
              ];
            }
          }

          // IMPORTANTISSIMO: nuovo oggetto
          graph.graphData({
            nodes: [...current.nodes],
            links: [...current.links],
          });

          graph.centerAt(node.x, node.y, 600);
          graph.zoom(2.2, 600);
        })

        // =========================
        // DOUBLE CLICK → DETTAGLIO
        // =========================
        .onNodeDblClick((node) => {
          navigate(`/detail/${node.id}`);
        });

      graphInstance.current = graph;
    }

    load();

    return () => graphInstance.current?._destructor?.();
  }, [topic]);

  return (
    <div className="graphWrapper">
      <div ref={graphRef} className="graphCanvas" />

      {selectedNode && (
        <div className="sidePanel">
          <h2>{selectedNode.name}</h2>
          <p>{selectedNode.type}</p>

          <button
            onClick={() =>
              navigate(`/detail/${selectedNode.id}`)
            }
          >
            Apri dettagli →
          </button>
        </div>
      )}
    </div>
  );
}

// =========================
// HELPERS
// =========================
function classify(label = "") {
  const l = label.toLowerCase();

  if (
    l.includes("city") ||
    l.includes("country") ||
    l.includes("italy")
  )
    return "place";

  if (
    l.includes("born") ||
    l.includes("physicist") ||
    l.includes("king")
  )
    return "person";

  return "concept";
}

function getColor(type, selected) {
  if (selected) return "#a855f7";

  switch (type) {
    case "person":
      return "#00d4ff";
    case "place":
      return "#00ff88";
    default:
      return "#ffffff";
  }
}