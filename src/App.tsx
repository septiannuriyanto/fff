import { Routes, Route } from 'react-router-dom';
import DefaultLayout from './layout/DefaultLayout'; // Default layout
import ProtectedRoute from './pages/ProtectedRoute'; // Protected routes handler
import PageTitle from './components/PageTitle'; // Page title component
import routes from './routes'; // Externalized routes configuration
import { Toaster } from 'react-hot-toast';

const App = () => {
  return (
    <DefaultLayout>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        {routes.map(({ path, component, title, allowedRoles }) => (
          <Route
            key={path}
            path={path}
            element={
              title ? (
                <ProtectedRoute allowedRoles={allowedRoles}>
                  <>
                    <PageTitle title={title} />
                    {component}
                  </>
                </ProtectedRoute>
              ) : (
                component
              )
            }
          />
        ))}
      </Routes>
    </DefaultLayout>
  );
};

export default App;
