export default function DebugTest() {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'red', 
      color: 'white',
      fontSize: '24px',
      margin: '20px'
    }}>
      <h1>DEBUG TEST - This should be visible with red background</h1>
      <p>If you can see this, React is working!</p>
      <div className="bg-blue-500 text-white p-4 m-4">
        This div uses Tailwind classes. If it's blue, Tailwind is working.
      </div>
    </div>
  );
}
