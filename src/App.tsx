import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ServiceInitializer from "@/components/ServiceInitializer";
import Home from "@/pages/Home";

export default function App() {
  return (
    <ServiceInitializer>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
        </Routes>
      </Router>
    </ServiceInitializer>
  );
}
