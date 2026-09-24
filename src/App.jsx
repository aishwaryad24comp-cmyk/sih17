import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import Login from "./components/Login";
import DashboardLayout from "./components/layout/DashboardLayout";

// A simple wrapper to protect the dashboard routes
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  
  // For the sake of the demo, if there is no user in AuthContext, 
  // we redirect them to the login page.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all route to redirect back to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
