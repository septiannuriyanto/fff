import { Navigate } from 'react-router-dom';
import { useAuth } from '../pages/Authentication/AuthContext';
import Loader from '../common/Loader/Loader';

const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { authToken, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  if (authToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PublicRoute;
