import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LogoDark from '../../images/logo/logo-dark.svg';
import Logo from '../../images/logo/logo.svg';
import { supabase } from '../../db/SupabaseClient';
import { useAuth } from './AuthContext';

const SignIn: React.FC = () => {
  const { signIn, currentUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && currentUser) {
      if (currentUser.dept === 'SM') {
        navigate('/dashboard');
      } else if (currentUser.dept === 'PLANT') {
        navigate('/plant-dashboard');
      } else {
        navigate('/dashboard'); // fallback
      }
    }
  }, [currentUser, loading, navigate]);
  
  const [nrp, setNrp] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleNrpChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const newNrp = event.target.value;
    setNrp(newNrp);
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = event.target.value;
    setPassword(newPassword);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!nrp.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }

    if (!signIn) return;

    setIsLoading(true);
    try {
      // 1. Fetch user details by NRP
      const { data, error: queryError } = await supabase
        .from('manpower')
        .select('email, active_date')
        .eq('nrp', nrp)
        .single();

      if (queryError || !data) {
        setError('User not registered or invalid NRP');
        setIsLoading(false);
        return;
      }

      if (!data.active_date) {
        setError('Account is not activated, contact your administrator');
        setIsLoading(false);
        return;
      }

      if (!data.email) {
        setError('User has no email associated with this NRP');
        setIsLoading(false);
        return;
      }

      // 2. Perform sign-in with fetched email
      await signIn(data.email, password, nrp);
      // Redirect handled by useEffect above
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-300/10 rounded-full blur-3xl"></div>
      </div>

      {/* Glassmorphism Card */}
      <div className="relative w-full max-w-md backdrop-blur-2xl bg-white/80 p-8 sm:p-10 rounded-3xl shadow-2xl border border-blue-200/50">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <Link className="mb-6 inline-block transform transition-transform hover:scale-105" to="/">
            <img className="h-10 block dark:hidden" src={Logo} alt="Logo" />
            <img className="h-10 hidden dark:block" src={LogoDark} alt="Logo" />
          </Link>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Welcome Back
          </h2>
          <p className="text-sm text-slate-600 text-center">
            Sign in to FFF Project Dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* NRP Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              NRP
            </label>
            <div className="relative">
              <input
                type="text"
                value={nrp}
                onChange={handleNrpChange}
                placeholder="Enter your NRP"
                className="w-full rounded-xl border border-blue-200 bg-white py-3.5 px-4 text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                onChange={handlePasswordChange}
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-xl border border-blue-200 bg-white py-3.5 px-4 text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div className="flex justify-end mt-2">
              <Link to="/auth/forgotpassword" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-600 shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-red-800">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full relative flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-base font-semibold text-white shadow-lg transition-all duration-300 
              ${isLoading || error 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 hover:shadow-blue-500/50 hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
              }`}
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Signing in...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Don't have an account?{' '}
              <Link 
                to="/auth/signup" 
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-6 text-center w-full">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} FFF Project. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default SignIn;
