import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LogoDark from '../../images/logo/logo-dark.svg';
import Logo from '../../images/logo/logo.svg';
import { supabase } from '../../db/SupabaseClient';
import { useAuth } from './AuthContext';

const SignIn: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  
  const [nrp, setNrp] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeDate, setActiveDate] = useState<Date | null>(null);
  const [password, setPassword] = useState<string>('');
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleNrpChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const newNrp = event.target.value;
    setNrp(newNrp);

    if (newNrp.trim() === '') {
      setEmail(null);
      // Don't show error immediately while typing, only if empty on submit or distinct check?
      // Original logic showed error immediately if empty, but let's keep it clean.
      return;
    }

    // Debouncing could be good here, but for now sticking to original immediate lookup pattern
    // but maybe wrapped in a closer check to avoid spamming supabase?
    // The original code queried on every keystroke! To match functionality but be safer,
    // I will keep it simple but handle the async properly.
    
    try {
      const { data, error: queryError } = await supabase
        .from('manpower')
        .select('email, active_date')
        .eq('nrp', newNrp)
        .single();

      if (queryError && queryError.code !== 'PGRST116') {
         // Ignore "row not found" error while typing, just handle data check
         console.error(queryError);
      }

      if (!data) {
        // If simply not found yet (maybe incomplete NRP), we don't necessarily error out heavily UX-wise
        // But original code set error "User not registered". 
        // We will reset email to null to indicate invalid user for now.
        setEmail(null);
        return;
      }

      if (!data.active_date) {
        setError('Account is not activated, contact your administrator');
        return;
      }

      if (data.email) {
        setEmail(data.email);
        setActiveDate(data.active_date);
        setError(null);
      }
    } catch (err) {
      console.error(err);
      setEmail(null);
      setActiveDate(null);
      // Don't show generic error on every keystroke
    }
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

    if (!email) {
      setError('User not registered or invalid NRP');
      return;
    }

    if (!signIn) return;

    setIsLoading(true);
    try {
      await signIn(email, password, nrp);
      navigate(0);
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-boxdark-2 px-4 sm:px-6 lg:px-8 font-inter">
      <div className="w-full max-w-[400px] bg-white dark:bg-boxdark rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-10 border border-gray-100 dark:border-strokedark/50">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Link className="mb-6 inline-block transform transition-transform hover:scale-105" to="/">
            <img className="h-10 block dark:hidden" src={Logo} alt="Logo" />
            <img className="h-10 hidden dark:block" src={LogoDark} alt="Logo" />
          </Link>
          <h2 className="text-xl font-semibold text-[#111827] dark:text-white mb-2">
            Sign in to FFF
          </h2>
          <p className="text-sm text-[#6b7280] dark:text-gray-400 text-center">
            Welcome back! Please enter your details.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* NRP Input */}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] dark:text-gray-300 mb-1.5 ml-1">
              NRP
            </label>
            <div className="relative">
              <input
                type="text"
                value={nrp}
                onChange={handleNrpChange}
                placeholder="Enter your NRP"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-[15px] text-[#111827] outline-none transition-all duration-200 focus:border-primary focus:bg-white focus:ring-[3px] focus:ring-primary/10 dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
             <div className="flex items-center justify-between mb-1.5 ml-1">
              <label className="block text-[13px] font-medium text-[#374151] dark:text-gray-300">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                onChange={handlePasswordChange}
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-[15px] text-[#111827] outline-none transition-all duration-200 focus:border-primary focus:bg-white focus:ring-[3px] focus:ring-primary/10 dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary placeholder:text-gray-400"
              />
            </div>
            <div className="flex justify-end mt-2">
                 <Link to="/auth/forgotpassword" className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </Link>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <p className="text-[13px] font-medium text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full relative flex justify-center py-3 px-4 border border-transparent rounded-xl text-[15px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-200 
              ${isLoading || error 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-primary hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]'
              }`}
          >
            {isLoading ? (
               <div className="flex items-center gap-2">
                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              Don't have an account?{' '}
              <Link 
                to="/auth/signup" 
                className="font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
      
      {/* Footer / Copyright - Optional but nice for "Clerk" vibe */}
      <div className="absolute bottom-6 text-center w-full">
         <p className="text-xs text-gray-400 dark:text-gray-600">
          © {new Date().getFullYear()} FFF Project. All rights reserved.
         </p>
      </div>
    </div>
  );
};

export default SignIn;
