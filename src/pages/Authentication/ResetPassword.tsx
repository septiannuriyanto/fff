import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TbLock } from 'react-icons/tb';
import { Toaster } from 'react-hot-toast';

const ResetPassword: React.FC = () => {
  const { token } = useParams(); // Get token from URL params
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [repassword, setRePassword] = useState('');
  
  const navigate = useNavigate(); // Use navigate for routing

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    if (repassword && event.target.value !== repassword) {
      setError('Password tidak sama');
    } else {
      setError(null);
    }
  };

  const handleRePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRePassword = event.target.value;
    setRePassword(newRePassword);
    if (newRePassword !== password) {
      setError('Password tidak sama');
    } else {
      setError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError('Invalid or missing token');
      return;
    }
    
    setLoading(true);
    setError(null);

    // Perform your API call here to reset the password using the token
    try {
      // Example API call for password reset (replace with actual API logic)
      // await resetPassword(token, password);

      setFinished(true); // Mark the process as finished
    } catch (error) {
      setError('Something went wrong, please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{
    console.log(token);
    
  },[])

  return (
    <div className="flex items-center align-center justify-center">
      <Toaster />
      <div className="w-full rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark md:w-1/2">
        <div className="flex flex-wrap items-center justify-center">
          <div className="w-3/4 border-stroke dark:border-strokedark">
            <div className="w-full p-4 sm:p-12.5 xl:p-17.5">
              <h2 className="mb-9 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                Reset Password
              </h2>

              {finished ? (
                <div className="flex flex-col items-center justify-center">
                  <h1>Your Account Has Been Reset Successfully</h1>
                  <Link to="/auth/signin" className="underline text-primary" replace>
                    Login Now
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <p>Masukkan Password Baru Untuk Reset Akun</p>

                  <div className="my-4">
                    <div className="relative">
                      <input
                        onChange={handlePasswordChange}
                        type="password"
                        placeholder="Password"
                        className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                      <span className="absolute right-4 top-4">
                        <TbLock />
                      </span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="relative">
                      <input
                        onChange={handleRePasswordChange}
                        type="password"
                        placeholder="Password Lagi"
                        className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                      <span className="absolute right-4 top-4">
                        <TbLock />
                      </span>
                    </div>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
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
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
