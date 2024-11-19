import { Routes, Route } from 'react-router-dom';
import DefaultLayout from './layout/DefaultLayout'; // Default layout
import ProtectedRoute from './pages/ProtectedRoute'; // Protected routes handler
import PageTitle from './components/PageTitle'; // Page title component
import routes from './routes'; // Externalized routes configuration

const App = () => {
  return (
    <DefaultLayout>
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
