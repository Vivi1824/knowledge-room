import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import GraphRoom from "./pages/GraphRoom";
import DetailRoom from "./pages/DetailRoom";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/graph/:topic" element={<GraphRoom />} />
      <Route path="/detail/:id" element={<DetailRoom />} />
    </Routes>
  );
}