import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { searchWiki, getSummary } from "../api/wikipedia";

export default function WikipediaMode() {
  const { query } = useParams();
  const [results, setResults] = useState([]);

  useEffect(() => {
    async function load() {
      if (query === "random") {
        setResults([{ title: "Albert Einstein" }]);
        return;
      }

      const data = await searchWiki(query);
      setResults(data);
    }

    load();
  }, [query]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Wikipedia Mode: {query}</h2>

      {results.map((item, i) => (
        <div key={i} style={{
          margin: 10,
          padding: 10,
          background: "rgba(255,255,255,0.05)"
        }}>
          {item.title}
        </div>
      ))}
    </div>
  );
}