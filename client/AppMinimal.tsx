import { createRoot } from "react-dom/client";

const MinimalApp = () => {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'blue', 
      color: 'white',
      fontSize: '24px',
      minHeight: '100vh'
    }}>
      <h1>MINIMAL APP WORKING!</h1>
      <p>If you see this, React is mounting correctly</p>
    </div>
  );
};

// Simple mounting without complex providers
console.log("=== DEBUGGING: Starting to mount React app ===");
const container = document.getElementById("root");
console.log("=== DEBUGGING: Container found:", container);

if (!container) {
  console.error("=== ERROR: Root container not found! ===");
  throw new Error("Root container not found");
}

console.log("=== DEBUGGING: Creating React root ===");
const root = createRoot(container);
console.log("=== DEBUGGING: Rendering app ===");
root.render(<MinimalApp />);
console.log("=== DEBUGGING: App rendered successfully ===");
