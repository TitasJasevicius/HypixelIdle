import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Auth from './Components/Auth';
import GameLayout from './Components/GameLayout';
import PlayerSkinRender from './Components/PlayerSkinRender';
import Home from './Pages/Home';
import Mining from './Pages/Mining';
import Foraging from './Pages/Foraging';
import Combat from './Pages/Combat';
import Bank from './Pages/Bank';
import CraftingTable from './Components/CraftingTable';

const getIsAuthenticated = () => {
  const token = localStorage.getItem('accessToken');
  const expiresAt = localStorage.getItem('accessTokenExpiresAtUtc');

  if (!token || !expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() > Date.now();
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(getIsAuthenticated());

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(getIsAuthenticated());
    };

    window.addEventListener('storage', syncAuthState);
    window.addEventListener('auth-changed', syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('auth-changed', syncAuthState);
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Auth initialMode="login" />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Auth initialMode="register" />}
        />
        <Route
          path="/"
          element={isAuthenticated ? <GameLayout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Home />} />
          <Route path="mining" element={<Mining />} />
          <Route path="foraging" element={<Foraging />} />
          <Route path="combat" element={<Combat />} />
          <Route path="bank" element={<Bank />} />
          <Route path="crafting" element={<CraftingTable />} />
          <Route path="skin-render" element={<PlayerSkinRender />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />}
        />
      </Routes>
    </Router>
  )
}

export default App