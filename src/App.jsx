/* import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Universe from './components/Universe';
import './globals.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/universe" element={<Universe />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
import Universe from './components/Universe';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/universe" element={<Universe />} />
      </Routes>
    </Router>
  );
}

export default App;