import { Routes, Route } from 'react-router-dom';
import DefaultLayout from './layout/DefaultLayout'; // Default layout
import ProtectedRoute from './pages/ProtectedRoute'; // Protected routes handler
import PageTitle from './components/PageTitle'; // Page title component
import routes from './routes'; // Externalized routes configuration
import { Toaster } from 'react-hot-toast';

const App = () => {
  return (
    <>
      <Toaster 
        position="top-center" 
        reverseOrder={false} 
        containerStyle={{ zIndex: 9999999 }}
      />
      <Routes>
        {routes.map(({ path, component, title, allowedRoles, isPublic }: any) => {
          // Landing page remains outside the main layout
          if (path === '/') {
            return (
              <Route
                key={path}
                path={path}
                element={component}
              />
            );
          }
          return (
            <Route
              key={path}
              path={path}
              element={
                <DefaultLayout>
                  {title && !isPublic ? (
                    <ProtectedRoute allowedRoles={allowedRoles}>
                      <>
                        <PageTitle title={title} />
                        {component}
                      </>
                    </ProtectedRoute>
                  ) : (
                    <>
                      {title && <PageTitle title={title} />}
                      {component}
                    </>
                  )}
                </DefaultLayout>
              }
            />
          );
        })}
      </Routes>
    </>
  );
};

export default App;
