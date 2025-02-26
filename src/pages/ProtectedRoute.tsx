import React, { PropsWithChildren } from 'react';
import Loader from '../common/Loader/Loader';
import { User } from '../types/User';
import { useAuth } from './Authentication/AuthContext';
import { Navigate } from 'react-router-dom';

type ProtectedRouteProps = PropsWithChildren & {
  allowedRoles?: User['role'][]; // Accept an array of roles
};

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { currentUser } = useAuth();

  // Wait for authentication to load
  if (currentUser === undefined) {
    return <Loader />;
  }

  // Redirect to sign-in page if no user is authenticated
  if (currentUser === null) {
    return <Navigate to="/auth/signin" replace />;
  }

  // Check if the user's role is allowed
  if (
    allowedRoles &&
    !allowedRoles.includes(currentUser.role!)
  ) {
    return <div className="text-lg font-bold text-center">Permission Denied</div>;
  }

  // Render the protected content if access is granted
  return <>{children}</>;
};

export default ProtectedRoute;
