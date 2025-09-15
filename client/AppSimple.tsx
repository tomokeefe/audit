import "./global.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Simple test component
const SimpleIndex = () => (
  <div className="min-h-screen bg-gray-50 p-8">
    <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple App Working!</h1>
    <p className="text-gray-600">This tests basic routing and Tailwind CSS.</p>
    <div className="mt-4 p-4 bg-blue-500 text-white rounded">
      Tailwind CSS is working if this is blue!
    </div>
  </div>
);

const SimpleApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<SimpleIndex />} />
      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
  </BrowserRouter>
);

// Mount the app
const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<SimpleApp />);
