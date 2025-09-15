import { createRoot } from "react-dom/client";

const App = () => (
  <div
    style={{
      padding: "20px",
      backgroundColor: "green",
      color: "white",
      fontSize: "24px",
      minHeight: "100vh",
      fontFamily: "Arial, sans-serif",
    }}
  >
    <h1>NO CSS IMPORT TEST</h1>
    <p>This version has no CSS imports. If this is stable, CSS is the issue.</p>
    <div
      style={{
        marginTop: "20px",
        padding: "10px",
        backgroundColor: "darkgreen",
      }}
    >
      This should stay visible without flashing!
    </div>
  </div>
);

console.log("=== MOUNTING APP ===", new Date().toISOString());

// Check if app is already mounted
if (window.__app_mounted) {
  console.log("=== APP ALREADY MOUNTED, SKIPPING ===");
} else {
  window.__app_mounted = true;
  const container = document.getElementById("root")!;
  console.log("=== CONTAINER FOUND ===", container);
  const root = createRoot(container);
  console.log("=== RENDERING APP ===");
  root.render(<App />);
  console.log("=== APP RENDERED ===");
}
