import { useEffect, useRef } from "react";
import ForceGraph from "force-graph";
import { useParams, useNavigate } from "react-router-dom";

export default function GraphRoom() {
  const { topic } = useParams();
  const ref = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const data = {
      nodes: [
        { id: topic },
        { id: "Concept A" },
        { id: "Concept B" },
        { id: "Concept C" }
      ],
      links: [
        { source: topic, target: "Concept A" },
        { source: topic, target: "Concept B" },
        { source: topic, target: "Concept C" }
      ]
    };

    const graph = ForceGraph()(ref.current)
      .graphData(data)
      .nodeLabel("id")
      .onNodeClick((node) => {
        navigate(`/detail/${node.id}`);
      })
      .nodeAutoColorBy("id");

    return () => graph._destructor?.();
  }, [topic]);

  return (
    <div
      ref={ref}
      style={{ width: "100vw", height: "100vh", background: "#0b0f1a" }}
    />
  );
}