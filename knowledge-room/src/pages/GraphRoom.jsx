import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph from "force-graph";
import { forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force-3d";
import { useLocation, useParams, useNavigate } from "react-router-dom";

import { searchEntity, getNeighbors } from "../api/wikidata";
import { getSummaryByWikidataId } from "../api/wikipedia";
import "../styles/graph.css";

import ambientImage from "../assets/image.png";
import brainIcon from "../assets/brain.svg";
import compassIcon from "../assets/compass.svg";
import homeIcon from "../assets/icons/home.svg";
import shareIcon from "../assets/icons/share.png";
import favoritesIcon from "../assets/icons/heart.png";

export default function GraphRoom() {
  const { topic } = useParams();
  const graphRef = useRef(null);
  const graphInstance = useRef(null);

  const cacheRef = useRef(new Map());
  const previewCacheRef = useRef(new Map());
  const selectedRef = useRef(null);

  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedConnections, setSelectedConnections] = useState(0);
  const [nodePreview, setNodePreview] = useState({ id: null, status: "idle", data: null });
  const [graphStats, setGraphStats] = useState({ nodes: 0, links: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [graphReady, setGraphReady] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [rootLabel, setRootLabel] = useState("");
  const [explorationState, setExplorationState] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const topicLabel = useMemo(() => {
    return decodeTopic(topic);
  }, [topic]);
  const autoExploreRoot = location.state?.autoExploreRoot || "";
  const selectedNodeId = selectedNode?.id;
  const selectedNodeName = selectedNode?.name;

  useEffect(() => {
    setIsSaved(readSavedGraph(topic));
  }, [topic]);

  useEffect(() => {
    if (!selectedNodeId) return undefined;

    let cancelled = false;

    async function loadPreview() {
      setNodePreview({ id: selectedNodeId, status: "loading", data: null });

      try {
        const cached = previewCacheRef.current.get(selectedNodeId);
        const preview = cached || await getSummaryByWikidataId(selectedNodeId);

        if (!cached) previewCacheRef.current.set(selectedNodeId, preview);

        if (!cancelled) {
          setNodePreview({ id: selectedNodeId, status: "success", data: preview });

          if (!preview.hasDetailedInfo) {
            const isAlreadyRoot = topicLabel.toUpperCase() === selectedNodeId.toUpperCase();

            navigate(`/graph/${selectedNodeId}`, {
              replace: isAlreadyRoot,
              state: {
                autoExploreRoot: selectedNodeId,
                rootLabel: preview.title || selectedNodeName || selectedNodeId,
              },
            });
          }
        }
      } catch {
        if (!cancelled) {
          setNodePreview({ id: selectedNodeId, status: "error", data: null });
        }
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [navigate, selectedNodeId, selectedNodeName, topicLabel]);

  // =========================
  // CACHE FETCH
  // =========================
  const fetchWithCache = useCallback(async (id) => {
    if (!id) return [];

    if (cacheRef.current.has(id)) {
      return cacheRef.current.get(id);
    }

    const res = await getNeighbors(id);

    const normalized = (res || [])
      .slice(0, 18)
      .map((n) => ({
        id: n.id,
        name: n.label,
        type: classify(n.label),
      }));

    cacheRef.current.set(id, normalized);
    return normalized;
  }, []);

  const handleShare = async () => {
    try {
      const shareData = {
        title: `Knowledge Room - ${topicLabel}`,
        text: `Grafo della conoscenza: ${topicLabel}`,
        url: window.location.href,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard?.writeText(window.location.href);
    } catch {
      // Sharing is optional UI sugar.
    }
  };

  const toggleSaved = () => {
    const nextValue = !isSaved;

    try {
      window.localStorage.setItem(savedGraphKey(topic), String(nextValue));
    } catch {
      // Storage optional.
    }

    setIsSaved(nextValue);
  };

  function savedGraphKey(topicValue) {
    return `knowledge-room:saved:graph:${encodeURIComponent(topicValue)}`;
  }

  function readSavedGraph(topicValue) {
    try {
      return window.localStorage.getItem(savedGraphKey(topicValue)) === "true";
    } catch {
      return false;
    }
  }

  // =========================
  // INIT GRAPH
  // =========================
  useEffect(() => {
    let graph;
    let resizeGraph;
    let canceled = false;

    async function load() {
      setIsLoading(true);
      setGraphReady(false);
      setSelectedNode(null);
      setSelectedConnections(0);
      setGraphStats({ nodes: 0, links: 0 });
      selectedRef.current = null;
      setIsSaved(false);
      setRootLabel("");
      setExplorationState(
        autoExploreRoot
          ? {
              status: "searching",
              message: "Il nodo non ha una scheda diretta: esploro le sue connessioni…",
            }
          : null
      );

      try {
        const entity = await searchEntity(topic);
        if (canceled) return;

        if (!entity) {
          setIsSaved(readSavedGraph(topic));
          setIsLoading(false);
          return;
        }

        if (canceled || !graphRef.current) return;

        const root = {
          id: entity.id,
          name: entity.label,
          type: classify(entity.label),
          isRoot: true,
        };
        setRootLabel(entity.label);

        const neighbors = await fetchWithCache(entity.id);

        if (canceled || !graphRef.current) return;

        const data = {
          nodes: [root, ...neighbors.map((node) => ({ ...node, isRoot: false }))],
          links: neighbors.map((n) => ({
            source: root.id,
            target: n.id,
          })),
        };

        setGraphStats({
          nodes: data.nodes.length,
          links: data.links.length,
        });

        // =========================
        // FORCE GRAPH INIT
        // =========================
        graph = ForceGraph()(graphRef.current)
          .graphData(data)
          .backgroundColor("rgba(0,0,0,0)")
          .autoPauseRedraw(false)
          .width(graphRef.current.clientWidth)
          .height(graphRef.current.clientHeight)

          // layout più sparso
          .cooldownTicks(200)
          .d3Force(
            "charge",
            forceManyBody().strength(-260)
          )

          .d3Force(
            "link",
            forceLink()
              .id(d => d.id)
              .distance(215)
          )
          .d3Force(
            "collision",
            forceCollide()
              .radius(node => getNodeMetrics(node, false).collisionRadius)
              .strength(0.82)
          )

          .d3Force(
            "center",
            forceCenter()
          )

          // =========================
          // LINKS
          // =========================
          .linkColor(() => "rgba(192, 205, 255, 0.18)")
          .linkWidth((link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);
            return selectedRef.current === source || selectedRef.current === target
              ? 1.8
              : 0.8;
          })
          .linkDirectionalParticles(1)
          .linkDirectionalParticleWidth(1.4)
          .linkDirectionalParticleSpeed(0.004)
          .linkDirectionalParticleColor(() => "rgba(125, 211, 252, 0.68)")

          // =========================
          // NODI
          // =========================
          .nodeRelSize(6)
          .nodeLabel((n) => getNodeDisplayName(n))
          .nodeColor((n) =>
            getPalette(n.type, selectedRef.current === n.id || n.isRoot).fill
          )
          .nodeCanvasObject((node, ctx, globalScale) => {
            if (!isFinite(node.x) || !isFinite(node.y)) return;
            drawKnowledgeNode(
              node,
              ctx,
              selectedRef.current === node.id || node.isRoot,
              globalScale
            );
          })
          .nodePointerAreaPaint((node, color, ctx) => {
            const metrics = getNodeMetrics(
              node,
              selectedRef.current === node.id || node.isRoot
            );
            const x = node.x - metrics.width / 2;
            const y = node.y - metrics.height / 2;

            ctx.fillStyle = color;
            drawRoundRect(ctx, x, y, metrics.width, metrics.height, metrics.radius);
            ctx.fill();
          })

          // =========================
          // CLICK -> ESPANSIONE
          // =========================
          .onNodeClick(async (node) => {
            selectedRef.current = node.id;
            setSelectedNode(node);
            setNodePreview({ id: node.id, status: "loading", data: null });

            const currentGraph = graphInstance.current;
            if (!currentGraph) return;

            const current = currentGraph.graphData();
            setSelectedConnections(countNodeConnections(current.links, node.id));

            const neighbors = await fetchWithCache(node.id);

            let added = 0;

            for (const n of neighbors) {
              if (current.nodes.length >= 24) break;
              if (added >= 6) break;

              if (!current.nodes.find((x) => x.id === n.id)) {
                current.nodes = [...current.nodes, n];
                added++;
              }

              const exists = current.links.find(
                (l) =>
                  getNodeId(l.source) === node.id &&
                  getNodeId(l.target) === n.id
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

            const nextData = {
              nodes: [...current.nodes],
              links: [...current.links],
            };

            graph.graphData(nextData);
            setGraphStats({
              nodes: nextData.nodes.length,
              links: nextData.links.length,
            });
            setSelectedConnections(countNodeConnections(nextData.links, node.id));

            fitGraph(graph, nextData.nodes.length);
            graph.centerAt(node.x, node.y, 600);
          })

          // =========================
          // DOUBLE CLICK -> DETTAGLIO
          // =========================
          .onNodeDblClick((node) => {
            navigate(`/detail/${node.id}`);
          });

        resizeGraph = () => {
          if (!graphRef.current || !graph) return;
          graph
            .width(graphRef.current.clientWidth)
            .height(graphRef.current.clientHeight);
          fitGraph(graph, graph.graphData().nodes.length);
        };

        window.addEventListener("resize", resizeGraph);
        graph.onEngineStop(() => {
          fitGraph(graph, graph.graphData().nodes.length);
        });
        fitGraph(graph, data.nodes.length);

        graphInstance.current = graph;
        setGraphReady(true);
        setIsLoading(false);

        if (autoExploreRoot === root.id) {
          const discovery = await findInformativePath({
            rootId: root.id,
            seedNodes: neighbors,
            fetchNeighbors: fetchWithCache,
            fetchPreview: async (node) => {
              const cached = previewCacheRef.current.get(node.id);
              if (cached) return cached;

              const preview = await getSummaryByWikidataId(node.id);
              previewCacheRef.current.set(node.id, preview);
              return preview;
            },
            isCancelled: () => canceled,
          });

          if (canceled) return;

          if (discovery?.node) {
            const nextData = mergeDiscoveryPath(
              graph.graphData(),
              root.id,
              discovery.path
            );
            graph.graphData(nextData);

            const informativeNode = nextData.nodes.find(
              (node) => node.id === discovery.node.id
            );

            selectedRef.current = informativeNode.id;
            setSelectedNode(informativeNode);
            setNodePreview({
              id: informativeNode.id,
              status: "success",
              data: discovery.preview,
            });
            setSelectedConnections(
              countNodeConnections(nextData.links, informativeNode.id)
            );
            setGraphStats({
              nodes: nextData.nodes.length,
              links: nextData.links.length,
            });
            setExplorationState({
              status: "found",
              message: `Informazione precisa trovata a ${discovery.path.length} ${
                discovery.path.length === 1 ? "passaggio" : "passaggi"
              } dalla nuova radice.`,
            });
            fitGraph(graph, nextData.nodes.length);

            if (Number.isFinite(informativeNode.x) && Number.isFinite(informativeNode.y)) {
              graph.centerAt(informativeNode.x, informativeNode.y, 700);
            }
          } else {
            setExplorationState({
              status: "empty",
              message:
                "Nessuna scheda precisa nelle connessioni vicine: puoi continuare l’esplorazione manualmente.",
            });
          }
        }
      } catch {
        if (!canceled) {
          setGraphReady(false);
          setIsLoading(false);
        }
      }

    }

    load();

    return () => {
      canceled = true;
      if (resizeGraph) {
        window.removeEventListener("resize", resizeGraph);
      }
      graphInstance.current?._destructor?.();
      graphInstance.current = null;
    };
  }, [autoExploreRoot, fetchWithCache, navigate, topic]);

  return (
    <main className="graphPage">
      <aside className="graphSidebar">
        <div className="graphSidebarTop">
        </div>

        <nav className="graphSidebarNav" aria-label="Navigazione grafo">
          <button
            type="button"
            className="graphNavItem"
            onClick={() => navigate("/")}
            title="Home"
          >
            <img src={homeIcon} alt="Home" className="graphNavIcon" />
          </button>

          <button
            type="button"
            className="graphNavItem"
            onClick={handleShare}
            title="Condividi"
          >
            <img src={shareIcon} alt="Condividi" className="graphNavIcon" />
          </button>

          <button
            type="button"
            className={`graphNavItem ${isSaved ? "isActive" : ""}`}
            onClick={() => setIsSaved((value) => !value)}
            title="Preferiti"
          >
            <img src={favoritesIcon} alt="Preferiti" className="graphNavIcon" />
          </button>
        </nav>

        <div className="graphSidebarBottom">
          <img src={compassIcon} alt="" className="graphCompassIcon" />
        </div>
      </aside>

      <section className="graphShell">
        <div className="graphBackdrop">
          <img src={ambientImage} className="graphBgImage" alt="" />
          <div className="graphOverlay" />
        </div>

        <header className="graphTopbar">
          <div className="graphBrand">
            <span className="graphBrandIcon">
              <img src={brainIcon} alt="" />
            </span>
            <div>
              <p className="graphEyebrow">SALA DELLA CONOSCENZA</p>
              <h1>{rootLabel || topicLabel}</h1>
            </div>
          </div>

          <div className="graphStats" aria-label="Statistiche grafo">
            <div className="graphStat">
              <strong>{graphStats.nodes}</strong>
              <span>Nodi</span>
            </div>
            <div className="graphStat">
              <strong>{graphStats.links}</strong>
              <span>Relazioni</span>
            </div>
            <div className="graphStat graphStatWide">
              <strong>{selectedNode ? selectedNode.type : "Radice"}</strong>
              <span>Focus</span>
            </div>
          </div>
        </header>

        <div
          className={`graphViewport ${graphReady ? "isReady" : ""}`}
          aria-busy={isLoading}
        >
          <div ref={graphRef} className="graphCanvas" />
        </div>

        {isLoading && (
          <div className="graphStatePanel" role="status">
            <img src={brainIcon} alt="" />
            <p>Sto costruendo le connessioni…</p>
          </div>
        )}

        {explorationState && (
          <div
            className={`graphExplorationNotice is-${explorationState.status}`}
            role="status"
            aria-live="polite"
          >
            <span className="graphExplorationPulse" aria-hidden="true" />
            <div>
              <strong>
                {explorationState.status === "searching"
                  ? "Esplorazione automatica"
                  : explorationState.status === "found"
                    ? "Connessione verificata"
                    : "Nuova radice attiva"}
              </strong>
              <p>{explorationState.message}</p>
            </div>
          </div>
        )}

        <div className="graphLegend" aria-label="Legenda grafo">
          {legendItems.map((item) => (
            <span key={item.label}>
              <i style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>

        {selectedNode && (
          <aside className="sidePanel">
            {nodePreview.data?.thumbnail?.source && (
              <div className="sidePanelImage">
                <img
                  src={nodePreview.data.thumbnail.source}
                  alt={`Immagine di ${nodePreview.data.title || selectedNode.name}`}
                />
              </div>
            )}

            <div className="sidePanelHeader">
              <p>{selectedNode.type}</p>
            </div>

            <h2>{nodePreview.data?.title || selectedNode.name}</h2>

            {nodePreview.status === "loading" && (
              <div className="sidePanelLoading" aria-label="Caricamento informazioni">
                <span />
                <span />
                <span />
              </div>
            )}

            {nodePreview.status === "success" && (
              <>
                {(nodePreview.data.entityDescription || nodePreview.data.description) && (
                  <p className="sidePanelDescription">
                    {nodePreview.data.entityDescription || nodePreview.data.description}
                  </p>
                )}
                {nodePreview.data.extract && (
                  <p className="sidePanelExtract">{nodePreview.data.extract}</p>
                )}
              </>
            )}

            {nodePreview.status === "error" && (
              <p className="sidePanelUnavailable">
                Anteprima non disponibile. La scheda completa può contenere i dati
                Wikidata del nodo.
              </p>
            )}

            <dl className="nodeMeta">
              <div>
                <dt>ID nodo</dt>
                <dd>{selectedNode.id}</dd>
              </div>
              <div>
                <dt>Relazioni</dt>
                <dd>{selectedConnections}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() =>
                navigate(`/detail/${selectedNode.id}`)
              }
            >
              Apri approfondimento
            </button>
          </aside>
        )}
      </section>
    </main>
  );
}

// =========================
// HELPERS
// =========================
const legendItems = [
  { label: "Persone", color: getPalette("person", false).fill },
  { label: "Luoghi", color: getPalette("place", false).fill },
  { label: "Concetti", color: getPalette("concept", false).fill },
];

async function findInformativePath({
  rootId,
  seedNodes,
  fetchNeighbors,
  fetchPreview,
  isCancelled,
}) {
  const queue = seedNodes.slice(0, 6).map((node) => ({
    node,
    depth: 1,
    path: [node],
  }));
  const visited = new Set([rootId, ...queue.map((entry) => entry.node.id)]);
  let checkedNodes = 0;

  while (queue.length && checkedNodes < 12 && !isCancelled()) {
    const remainingChecks = 12 - checkedNodes;
    const batch = queue.splice(0, Math.min(3, remainingChecks));
    const previews = await Promise.all(
      batch.map(async (entry) => {
        try {
          return await fetchPreview(entry.node);
        } catch {
          return null;
        }
      })
    );

    checkedNodes += batch.length;
    if (isCancelled()) return null;

    for (let index = 0; index < batch.length; index += 1) {
      if (previews[index]?.hasDetailedInfo) {
        return {
          node: batch[index].node,
          path: batch[index].path,
          preview: previews[index],
        };
      }
    }

    const expansions = await Promise.all(
      batch.map(async (entry) => {
        if (entry.depth >= 2) return [];

        try {
          return await fetchNeighbors(entry.node.id);
        } catch {
          return [];
        }
      })
    );

    for (let index = 0; index < batch.length; index += 1) {
      const entry = batch[index];

      for (const neighbor of expansions[index].slice(0, 4)) {
        if (visited.has(neighbor.id)) continue;

        visited.add(neighbor.id);
        queue.push({
          node: neighbor,
          depth: entry.depth + 1,
          path: [...entry.path, neighbor],
        });
      }
    }
  }

  return null;
}

function mergeDiscoveryPath(currentData, rootId, path) {
  const nodes = [...currentData.nodes];
  const links = [...currentData.links];
  let parentId = rootId;

  for (const pathNode of path) {
    if (!nodes.find((node) => node.id === pathNode.id)) {
      nodes.push({ ...pathNode, isRoot: false });
    }

    const linkExists = links.some((link) => {
      const source = getNodeId(link.source);
      const target = getNodeId(link.target);

      return (
        (source === parentId && target === pathNode.id) ||
        (source === pathNode.id && target === parentId)
      );
    });

    if (!linkExists) {
      links.push({ source: parentId, target: pathNode.id });
    }

    parentId = pathNode.id;
  }

  return { nodes, links };
}

function countNodeConnections(links, nodeId) {
  return (links || []).filter((link) =>
    getNodeId(link.source) === nodeId || getNodeId(link.target) === nodeId
  ).length;
}

function classify(label = "") {
  const l = label.toLowerCase();

  const placeKeywords = [
    "city",
    "country",
    "italy",
    "città",
    "paese",
    "stato",
    "region",
    "provincia",
    "province",
    "regione",
    "village",
    "town",
    "mount",
    "river",
    "lake",
    "sea",
    "ocean",
    "island",
    "park",
    "capital",
    "capoluogo",
    "fiume",
    "lago",
    "montagna",
    "isola",
  ];

  const personKeywords = [
    "born",
    "died",
    "king",
    "queen",
    "actor",
    "actress",
    "musician",
    "singer",
    "author",
    "writer",
    "artist",
    "scientist",
    "engineer",
    "politician",
    "footballer",
    "president",
    "poet",
    "philosopher",
    "doctor",
    "lawyer",
    "historian",
    "composer",
    "director",
    "attore",
    "cantante",
    "scrittore",
    "artista",
    "regista",
    "poeta",
    "scienziato",
    "fisico",
    "matematico",
  ];

  if (placeKeywords.some((keyword) => l.includes(keyword))) {
    return "place";
  }

  if (personKeywords.some((keyword) => l.includes(keyword))) {
    return "person";
  }

  return "concept";
}

function getPalette(type, selected) {
  if (selected) {
    return {
      fill: "#a855f7",
      stroke: "rgba(255,255,255,0.84)",
      halo: "rgba(168,85,247,0.24)",
      glow: "rgba(168,85,247,0.72)",
      orbit: "rgba(232, 213, 255, 0.92)",
      surfaceStart: "rgba(88, 28, 135, 0.94)",
      surfaceEnd: "rgba(37, 99, 235, 0.76)",
      sheen: "rgba(255, 255, 255, 0.18)",
      text: "rgba(255, 255, 255, 0.96)",
    };
  }

  const palettes = {
    person: {
      fill: "#38bdf8",
      stroke: "rgba(186, 230, 253, 0.76)",
      halo: "rgba(56,189,248,0.16)",
      glow: "rgba(56,189,248,0.45)",
      orbit: "rgba(125, 211, 252, 0.86)",
      surfaceStart: "rgba(8, 47, 73, 0.88)",
      surfaceEnd: "rgba(14, 116, 144, 0.62)",
      sheen: "rgba(224, 242, 254, 0.16)",
      text: "rgba(240, 249, 255, 0.94)",
    },
    place: {
      fill: "#34d399",
      stroke: "rgba(187, 247, 208, 0.72)",
      halo: "rgba(52,211,153,0.15)",
      glow: "rgba(52,211,153,0.4)",
      orbit: "rgba(110, 231, 183, 0.84)",
      surfaceStart: "rgba(6, 78, 59, 0.86)",
      surfaceEnd: "rgba(13, 148, 136, 0.58)",
      sheen: "rgba(209, 250, 229, 0.15)",
      text: "rgba(236, 253, 245, 0.94)",
    },
    concept: {
      fill: "#f8fafc",
      stroke: "rgba(255,255,255,0.72)",
      halo: "rgba(255,255,255,0.13)",
      glow: "rgba(255,255,255,0.34)",
      orbit: "rgba(226, 232, 240, 0.8)",
      surfaceStart: "rgba(30, 41, 59, 0.9)",
      surfaceEnd: "rgba(71, 85, 105, 0.56)",
      sheen: "rgba(255, 255, 255, 0.14)",
      text: "rgba(248, 250, 252, 0.94)",
    },
  };

  return palettes[type] || palettes.concept;
}

function getNodeId(value) {
  return typeof value === "object" ? value.id : value;
}

function decodeTopic(value) {
  if (!value) return "Grafo";

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getNodeDisplayName(node) {
  return node.name || node.label || node.id || "N/A";
}

function estimateMaxZoom(nodeCount) {
  if (nodeCount <= 8) return 0.06;
  if (nodeCount <= 12) return 0.06;
  if (nodeCount <= 16) return 0.06;
  if (nodeCount <= 22) return 0.06;
  if (nodeCount <= 28) return 0.06;
  return 0.12;
}

function fitGraph(graph, nodeCount) {
  if (!graph) return;
  const zoomLevel = estimateMaxZoom(nodeCount);

  if (typeof graph.minZoom === "function") {
    graph.minZoom(0.01);
  }
  if (typeof graph.maxZoom === "function") {
    graph.maxZoom(0.12);
  }

  const bbox = typeof graph.getGraphBbox === "function" ? graph.getGraphBbox() : null;
  if (bbox) {
    const centerX = (bbox.x[0] + bbox.x[1]) / 2;
    const centerY = (bbox.y[0] + bbox.y[1]) / 2;
    graph.centerAt(centerX, centerY, 0);
  }

  const applyZoom = () => {
    if (typeof graph.zoom === "function") {
      graph.zoom(zoomLevel, 0);
    }
  };

  applyZoom();
  window.requestAnimationFrame(applyZoom);
  setTimeout(applyZoom, 100);
  setTimeout(applyZoom, 300);
}

function drawKnowledgeNode(node, ctx, selected, globalScale = 1) {
  if (!isFinite(node.x) || !isFinite(node.y)) return;
  const metrics = getNodeMetrics(node, selected);
  const palette = getPalette(node.type, selected);
  const x = node.x - metrics.width / 2;
  const y = node.y - metrics.height / 2;
  const elapsed = performance.now() / 1000;
  const lineOffset = -elapsed * (selected ? 28 : 18) - (node.index || 0) * 3;

  ctx.save();
  ctx.font = `${selected ? "800" : "700"} ${metrics.fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = selected ? 30 : 18;
  drawRoundRect(
    ctx,
    x - metrics.haloOffset,
    y - metrics.haloOffset,
    metrics.width + metrics.haloOffset * 2,
    metrics.height + metrics.haloOffset * 2,
    metrics.radius + metrics.haloOffset
  );
  ctx.fillStyle = palette.halo;
  ctx.fill();

  ctx.shadowBlur = selected ? 22 : 10;
  const fillGradient = ctx.createLinearGradient(x, y, x + metrics.width, y + metrics.height);
  fillGradient.addColorStop(0, palette.surfaceStart);
  fillGradient.addColorStop(1, palette.surfaceEnd);
  drawRoundRect(ctx, x, y, metrics.width, metrics.height, metrics.radius);
  ctx.fillStyle = fillGradient;
  ctx.fill();

  ctx.shadowBlur = 0;
  drawRoundRect(
    ctx,
    x + 3,
    y + 3,
    metrics.width - 6,
    Math.max(8, metrics.height * 0.38),
    Math.max(6, metrics.radius - 5)
  );
  ctx.fillStyle = palette.sheen;
  ctx.fill();

  ctx.lineWidth = selected ? 2.2 : 1.35;
  ctx.strokeStyle = palette.stroke;
  drawRoundRect(ctx, x, y, metrics.width, metrics.height, metrics.radius);
  ctx.stroke();

  ctx.save();
  ctx.setLineDash(selected ? [10, 5] : [7, 5]);
  ctx.lineDashOffset = lineOffset / Math.max(globalScale, 0.75);
  ctx.lineWidth = selected ? 2 : 1.2;
  ctx.strokeStyle = palette.orbit;
  drawRoundRect(
    ctx,
    x - metrics.outlineOffset,
    y - metrics.outlineOffset,
    metrics.width + metrics.outlineOffset * 2,
    metrics.height + metrics.outlineOffset * 2,
    metrics.radius + metrics.outlineOffset
  );
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = palette.text;
  ctx.fillText(
    fitLabel(ctx, getNodeDisplayName(node), metrics.textWidth),
    node.x,
    node.y + 0.5
  );
  ctx.restore();
}

function getNodeMetrics(node, selected = false) {
  const label = node.name || node.id || "";
  const fontSize = selected ? 13 : 11;
  const estimatedText = Math.min(label.length * fontSize * 0.58, selected ? 148 : 122);
  const width = Math.max(selected ? 112 : 86, estimatedText + (selected ? 36 : 30));
  const height = selected ? 42 : 34;

  return {
    width,
    height,
    fontSize,
    radius: height / 2,
    haloOffset: selected ? 10 : 7,
    outlineOffset: selected ? 5 : 4,
    textWidth: width - (selected ? 34 : 28),
    collisionRadius: Math.max(width * 0.52, height) + (selected ? 22 : 18),
  };
}

function fitLabel(ctx, value = "", maxWidth) {
  if (ctx.measureText(value).width <= maxWidth) return value;

  let output = value;
  while (output.length > 1 && ctx.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }

  return `${output}...`;
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}
