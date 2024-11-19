import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../db/SupabaseClient';
import { TbUserCheck } from 'react-icons/tb';
import getEmailFromNrp from '../../functions/getEmailFromNrp';
import toast, { Toaster } from 'react-hot-toast';



const ForgotPassword: React.FC = () => {
  const [nrp, setNrp] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();

  const handleNrpChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNrp(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      // Get the email for the given NRP
      const email = await getEmailFromNrp(nrp);

      if (!email) {
        setError('NRP not found or no email associated with this NRP.');
        setLoading(false);
        return;
      }

      // Send the reset password email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

      if (resetError) {
        setError('Failed to send reset email. Please try again.');
        console.error('Supabase error:', resetError);
      } else {
        setMessage('Password reset email sent successfully. Please check your inbox.');
        toast.success('Password reset email sent successfully. Please check your inbox.')
        navigate('/auth/signin', { replace : true })
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <Toaster/>
      <div className="w-full rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark md:w-1/2">
        <div className="flex flex-wrap items-center justify-center">
          <div className="w-3/4 border-stroke dark:border-strokedark">
            <div className="w-full p-4 sm:p-12.5 xl:p-17.5">
              <h2 className="mb-9 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                Forgot Password
              </h2>

              <form onSubmit={handleSubmit}>
                <p>Anda akan menerima konfirmasi melalui email yang terdaftar di perusahaan</p>
                <div className="my-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={nrp}
                      onChange={handleNrpChange}
                      placeholder="Masukkan NRP anda"
                      className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                    <span className="absolute right-4 top-4">
                      <TbUserCheck />
                    </span>
                  </div>
                  {error && <p style={{ color: 'red' }}>{error}</p>}
                  {message && <p style={{ color: 'green' }}>{message}</p>}
                </div>

                <div className="mb-5">
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-primary bg-primary p-4 text-white transition hover:bg-opacity-90"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Submit'}
                  </button>
                </div>

                <div className="mt-6 text-center">
                  <p>
                    Belum Punya Akun ?{' '}
                    <Link to="/auth/signup" className="text-primary">
                      Daftar
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
