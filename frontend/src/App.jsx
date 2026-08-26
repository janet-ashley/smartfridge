import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Splash from "./pages/Auth/Splash";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import FridgePage from "./pages/Fridge/FridgePage";
import RecipesPage from "./pages/Recipes/RecipesPage";
import ChallengesPage from "./pages/Challenges/ChallengesPage";
import ProfilePage from "./pages/Profile/ProfilePage";
import NotificationsPage from "./pages/Notifications/NotificationsPage";
import BottomBar from "./components/BottomBar";

function App() {
  const { token } = useAuth();

  if (!token) {
    return (
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  return (
    <div>
      <Routes>
        <Route path="/" element={<FridgePage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomBar />
    </div>
  );
}

export default App;