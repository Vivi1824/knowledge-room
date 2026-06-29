import { useEffect, useRef } from "react";
import ForceGraph from "force-graph";

export default function GraphMode() {
  const containerRef = useRef(null);

  useEffect(() => {
    const data = {
      nodes: [
        { id: "Einstein" },
        { id: "Relativity" },
        { id: "Quantum" },
        { id: "Newton" }
      ],
      links: [
        { source: "Einstein", target: "Relativity" },
        { source: "Einstein", target: "Quantum" },
        { source: "Relativity", target: "Newton" }
      ]
    };

    const graph = ForceGraph()(containerRef.current)
      .graphData(data)
      .nodeLabel("id")
      .nodeAutoColorBy("id")
      .linkDirectionalParticles(2)
      .linkDirectionalParticleSpeed(0.01);

    return () => {
      graph._destructor?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", background: "#0b0f1a" }}
    />
  );
}