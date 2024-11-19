// components/ProtectedRoute.tsx
import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from "../Authentication/AuthContext";

const ProtectedRoute: React.FC = () => {
  const { currentUser, loading } = useAuth()

  if (loading) return <div>Loading...</div>;

  return currentUser ? <Outlet /> : <Navigate to="/auth/signin" />;
};

export default ProtectedRoute;
