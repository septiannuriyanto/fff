import React, { useState, useEffect } from 'react';
import { supabase } from '../../db/SupabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import LogoDark from '../../images/logo/logo-dark.svg';
import Logo from '../../images/logo/logo.svg';
import { useAuth } from './AuthContext';

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, loading, navigate]);
  
  const [nrp, setNrp] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isDisabled, setIsDisabled] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({
    nrp: '',
    namaLengkap: '',
    email: '',
    password: '',
  });

  const handleNrpChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nrpValue = event.target.value;
    setNrp(nrpValue);

    const { data, error } = await supabase
      .from('manpower')
      .select('nama')
      .eq('nrp', nrpValue)
      .single();

    if (error) {
      setError('User tidak valid');
      setIsDisabled(false);
      setNamaLengkap('');
      console.error('Error fetching data:', error.message);
      return;
    }

    if (data) {
      setNamaLengkap(data.nama);
      setIsDisabled(true);
      setError('');
    } else {
      setIsDisabled(false);
      setNamaLengkap('');
    }
  };

  const validateForm = () => {
    const errors = {
      nrp: '',
      namaLengkap: '',
      email: '',
      password: '',
    };
    let isValid = true;

    if (!nrp) {
      errors.nrp = 'NRP is required';
      isValid = false;
    }
    if (!namaLengkap) {
      errors.namaLengkap = 'Nama Lengkap is required';
      isValid = false;
    }
    if (!email) {
      errors.email = 'Email is required';
      isValid = false;
    }
    if (!password) {
      errors.password = 'Password is required';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (error) {
      return;
    }

    const {error: signupError } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (signupError) {
      if (signupError?.status === 429) {
        setError('Too many requests. Please try again later.');
      } else {
        setError(signupError.message);
      }
    } else {
      try {
        const { data, error: updateError } = await supabase
          .from('manpower')
          .update({ email: email })
          .eq('nrp', nrp);

        if (updateError) {
          console.error('Error updating manpower table:', updateError);
        } else {
          console.log('Manpower table updated successfully:', data);
        }
      } catch (error) {
        console.error('Error updating manpower table:', error);
      }
      
      console.log('Signup berhasil ');
      setNrp('');
      setNamaLengkap('');
      setEmail('');
      setPassword('');
      setIsDisabled(false);
      setError('');
      setFormErrors({
        nrp: '',
        namaLengkap: '',
        email: '',
        password: '',
      });
      alert('Signup berhasil. Silahkan buka email anda untuk konfirmasi pendaftaran sebelum melakukan sign in.')
      navigate('/auth/signin');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100 py-12">
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
            <img className="h-12 block dark:hidden drop-shadow-lg" src={Logo} alt="Logo" />
            <img className="h-12 hidden dark:block drop-shadow-lg" src={LogoDark} alt="Logo" />
          </Link>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Create Account
          </h2>
          <p className="text-sm text-slate-600 text-center">
            Sign up to join FFF Project
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* NRP Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              NRP
            </label>
            <input
              type="text"
              value={nrp}
              onChange={handleNrpChange}
              placeholder="e.g., BGTA123456 (without 'p')"
              className="w-full rounded-xl border border-blue-200 bg-white py-3 px-4 text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
            {formErrors.nrp && (
              <p className="mt-1 text-sm text-red-400">{formErrors.nrp}</p>
            )}
            {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
          </div>

          {/* Nama Lengkap Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <input
              disabled={isDisabled}
              type="text"
              placeholder="Enter NRP and wait for name to appear"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              className="w-full rounded-xl border border-blue-200 bg-white py-3 px-4 text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {formErrors.namaLengkap && (
              <p className="mt-1 text-sm text-red-400">{formErrors.namaLengkap}</p>
            )}
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="your.email@example.com"
              className="w-full rounded-xl border border-blue-200 bg-white py-3 px-4 text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-400">{formErrors.email}</p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Create a strong password"
              className="w-full rounded-xl border border-blue-200 bg-white py-3 px-4 text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
            {formErrors.password && (
              <p className="mt-1 text-sm text-red-400">{formErrors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-6 py-3.5 px-4 border border-transparent rounded-xl text-base font-semibold text-white shadow-lg transition-all duration-300 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 hover:shadow-blue-500/50 hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Create Account
          </button>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/auth/signin" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Sign in
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

export default SignUp;
