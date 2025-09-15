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
const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<MinimalApp />);
