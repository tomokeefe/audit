import { createRoot } from "react-dom/client";

const App = () => (
  <div style={{ 
    padding: '20px', 
    backgroundColor: 'green', 
    color: 'white',
    fontSize: '24px',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif'
  }}>
    <h1>NO CSS IMPORT TEST</h1>
    <p>This version has no CSS imports. If this is stable, CSS is the issue.</p>
    <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'darkgreen' }}>
      This should stay visible without flashing!
    </div>
  </div>
);

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<App />);
