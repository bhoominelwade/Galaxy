import Universe from './components/Universe'

function App() {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0, 
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      <Universe />
    </div>
  )
}

export default App