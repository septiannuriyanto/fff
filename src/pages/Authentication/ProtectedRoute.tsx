// components/ProtectedRoute.tsx
import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from "../Authentication/AuthContext";

const ProtectedRoute: React.FC = () => {
  const { user, loading } = useContext(AuthContext) || { user: null, loading: true };

  if (loading) return <div>Loading...</div>;

  return user ? <Outlet /> : <Navigate to="/auth/signin" />;
};

export default ProtectedRoute;
