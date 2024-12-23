// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/Landing';
import Welcome from './components/Welcome';
import Universe from './components/Universe';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/universe" element={<Universe isPreview={false} onLoad={() => {}} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;