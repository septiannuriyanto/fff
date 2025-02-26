import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import userThree from '../images/user/user-03.png';
import { useEffect, useState } from 'react';
import { Manpower } from '../types/manpower';
import { supabase } from '../db/SupabaseClient';
import toast from 'react-hot-toast';
import { getFileFromUrl, profileImageBaseUrl } from '../services/ImageUploader';
import { getPositionFromPositionCode } from '../functions/get_nrp';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faMailBulk, faUser, faUserCheck, faUserGroup, faUserLock } from '@fortawesome/free-solid-svg-icons';
import DropZoneMini from '../components/DropZones/DropZoneMini';

const Settings = () => {


  const [profileData, setProfileData] = useState<Manpower>();

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const fetchSingleProfile = async () => {
    const { data, error } = await supabase
      .from('manpower')
      .select('*')
      .eq('nrp', id);

    if (error) {
      console.error(error.message);
      toast.error(error.message);
      return;
    }

    const updatedData = await Promise.all(
      data.map(async (item) => ({
        ...item,
        status: 'Onsite',
        nama: item.nama
          .toLowerCase()
          .split(' ')
          .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        image: (await getFileFromUrl(`${profileImageBaseUrl}/${item.nrp}`))
          ? `${profileImageBaseUrl}/${item.nrp}`
          : null,
        position: await getPositionFromPositionCode(item.position),
      })),
    );

    console.log(updatedData);
    setProfileData(updatedData[0] as Manpower);
  };

  useEffect(() => {
    fetchSingleProfile();
  }, []);

  const handleCancel = (e:any) => {
    e.preventDefault();
    navigate('/master/manpower')
  }
  const handleSubmit = async(e:any) => {
    
  }

  
  return (
    <>
      <div className="mx-auto max-w-full">
        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-5 xl:col-span-3">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Personal Information
                </h3>
              </div>
              <div className="p-7">
                <form action="#">
                  <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                    <div className='w-full'>
                    <div className="mb-4 flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full">
                      { profileData?.image ? <img src={profileData?.image} alt="User" /> : <DropZoneMini/> }
                      
                    </div>
                    <div>
                      <span className="mb-1.5 text-black dark:text-white">
                        Edit your photo
                      </span>
                      <span className="flex gap-2.5">
                        <button className="text-sm hover:text-primary">
                          Delete
                        </button>
                        <button className="text-sm hover:text-primary">
                          Update
                        </button>
                      </span>
                    </div>
                  </div>
                    </div>
                    <div className="w-full ">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="fullName"
                      >
                        Full Name
                      </label>
                      <div className="relative">
                        <span className="absolute left-4.5 top-4">
                          <FontAwesomeIcon icon={faUser}></FontAwesomeIcon>
                        </span>
                        <input
                        value={profileData?.nama}
                          className="w-full rounded border border-stroke bg-gray py-3 pl-11.5 pr-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="fullName"
                          id="fullName"
                          placeholder="Devid Jhon"
                          defaultValue="Devid Jhon"
                        />
                      </div>
                    </div>

                   
                  </div>
                  <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="fullName"
                      >
                        NRP
                      </label>
                      <div className="relative">
                        <span className="absolute left-4.5 top-4">
                         <FontAwesomeIcon icon={faUserCheck} ></FontAwesomeIcon>
                        </span>
                        <input
                        value={profileData?.nrp}
                          className="w-full rounded border border-stroke bg-gray py-3 pl-11.5 pr-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="fullName"
                          id="fullName"
                          placeholder="Devid Jhon"
                          defaultValue="Devid Jhon"
                        />
                      </div>
                    </div>

                    <div className="w-full sm:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="fullName"
                      >
                        SID
                      </label>
                      <div className="relative">
                        <span className="absolute left-4.5 top-4">
                         <FontAwesomeIcon icon={faUserLock} ></FontAwesomeIcon>
                        </span>
                        <input
                        value={profileData?.sid_code}
                          className="w-full rounded border border-stroke bg-gray py-3 pl-11.5 pr-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="fullName"
                          id="fullName"
                          placeholder="Devid Jhon"
                          defaultValue="Devid Jhon"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-5.5">
                    <label
                      className="mb-3 block text-sm font-medium text-black dark:text-white"
                      htmlFor="emailAddress"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-4.5 top-4">
                        <FontAwesomeIcon icon={faEnvelope}></FontAwesomeIcon>
                      </span>
                      <input
                      value={profileData?.email}
                        className="w-full rounded border border-stroke bg-gray py-3 pl-11.5 pr-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                        type="email"
                        name="emailAddress"
                        id="emailAddress"
                        placeholder="Input Email Address"
                        defaultValue=""
                      />
                    </div>
                  </div>

                  

                  

                  <div className="flex justify-end gap-4.5">
                    <button
                    onClick={handleCancel}
                      className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      type="submit"
                    >
                      Cancel
                    </button>
                    <button
                    onClick={handleSubmit}
                      className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                      type="submit"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
};

export default Settings;
