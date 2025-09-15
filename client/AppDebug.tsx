import { createRoot } from "react-dom/client";

console.log("=== DEBUG APP STARTING ===");

// Test if basic React works
const TestApp = () => {
  console.log("=== TestApp component rendering ===");
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'orange', 
      color: 'white',
      fontSize: '24px',
      minHeight: '100vh'
    }}>
      <h1>DEBUG APP - STEP BY STEP</h1>
      <p>If you see this orange page, basic React mounting works</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'darkorange' }}>
        Testing step by step to find the issue...
      </div>
    </div>
  );
};

console.log("=== About to mount React app ===");

try {
  const container = document.getElementById("root");
  console.log("=== Container found:", container);
  
  if (!container) {
    throw new Error("Root container not found");
  }
  
  const root = createRoot(container);
  console.log("=== Root created successfully ===");
  
  root.render(<TestApp />);
  console.log("=== App rendered successfully ===");
} catch (error) {
  console.error("=== ERROR mounting app:", error);
  
  // Fallback - show error in DOM
  const container = document.getElementById("root");
  if (container) {
    container.innerHTML = `
      <div style="padding: 20px; background: red; color: white; font-size: 18px;">
        <h1>DEBUG ERROR</h1>
        <p>Error: ${error instanceof Error ? error.message : String(error)}</p>
      </div>
    `;
  }
}
