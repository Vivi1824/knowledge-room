import { Routes, Route } from "react-router-dom";
import Room from "./pages/Room";
import WikipediaMode from "./pages/WikipediaMode";
import GraphMode from "./pages/GraphMode";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Room />} />
      <Route path="/wiki/:query" element={<WikipediaMode />} />
      <Route path="/graph/:title" element={<GraphMode />} />
    </Routes>
  );
}