import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getWikidataId } from "../api/wikidata";
import { getEntityRelations } from "../api/wikidata";

export default function GraphMode() {
  const { title } = useParams();
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    async function load() {
      const qid = await getWikidataId(title);
      const links = await getEntityRelations(qid);

      setNodes([
        { id: title, group: 1 },
        ...links.map((l) => ({ id: l, group: 2 })),
      ]);
    }

    load();
  }, [title]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Graph Mode: {title}</h2>

      {nodes.map((n, i) => (
        <div key={i} style={{
          margin: 10,
          padding: 10,
          background: "rgba(255,255,255,0.05)"
        }}>
          {n.id}
        </div>
      ))}
    </div>
  );
}