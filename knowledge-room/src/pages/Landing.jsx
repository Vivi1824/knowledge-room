import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landing.css";

export default function Landing() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleStart = () => {
    if (!query.trim()) return;
    navigate(`/graph/${query}`);
  };

  return (
    <div className="landing">
      <h1>🧠 Knowledge Room Explorer</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter a topic (e.g. Einstein, Space, Rome...)"
      />

      <button onClick={handleStart}>
        Enter the Knowledge Graph
      </button>
    </div>
  );
}