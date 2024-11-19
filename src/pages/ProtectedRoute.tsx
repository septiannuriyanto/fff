import React, { PropsWithChildren } from 'react';
import Loader from '../common/Loader/Loader';
import { User } from '../types/User';
import { useAuth } from './Authentication/AuthContext';
import { Navigate } from 'react-router-dom';

type ProtectedRouteProps = PropsWithChildren & {
  allowedRoles?: User['role'][] | '*' | 'FUEL' | 'OIL' | 'SUPERVISOR' | 'ADMIN'; // Allow valid options
};

const ALL_ROLES: User['role'][] = [
  'CREATOR',
  'GROUP LEADER',
  'OPERATOR FT',
  'FUELMAN',
  'FUEL AND OIL ADMIN',
  'OILMAN',
];

const FUEL_ROLES: User['role'][] = [
  'CREATOR',
  'GROUP LEADER',
  'OPERATOR FT',
  'FUELMAN',
  'FUEL AND OIL ADMIN',
];

const OIL_ROLES: User['role'][] = [
  'OILMAN',
];

const SUPERVISOR: User['role'][] = [
  'CREATOR',
  'GROUP LEADER',
];

const ADMIN: User['role'][] = [
  'CREATOR',
  'GROUP LEADER',
  'FUEL AND OIL ADMIN'
];

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { currentUser } = useAuth();

  if (currentUser === undefined) {
    return <Loader />;
  }

  if (currentUser === null) {
    return <Navigate to="/auth/signin" replace />;
  }

  // Determine the effective roles based on the `allowedRoles` value
  const effectiveRoles =
    allowedRoles === '*'
      ? ALL_ROLES
      : allowedRoles === 'FUEL'
      ? FUEL_ROLES
      : allowedRoles === 'OIL'
      ? OIL_ROLES
      : allowedRoles === 'SUPERVISOR'
      ? SUPERVISOR
      : allowedRoles === 'ADMIN'
      ? ADMIN
      : allowedRoles;

  // Check if the current user's role is in the effectiveRoles array
  if (effectiveRoles && !effectiveRoles.includes(currentUser!.role)) {
    return <div className="text-lg font-bold text-center">Permission Denied</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
