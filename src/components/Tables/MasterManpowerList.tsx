import { useEffect, useRef, useState } from 'react';
import ManpowerOne from '../../images/product/product-01.png';
import { Manpower } from '../../types/manpower';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAdd,
  faEdit,
  faExchange,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';
import ManpowerActionButton from './components/ManpowerActionButton';
import DropdownManpowerAction from './components/DropdownManpowerAction';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../../db/SupabaseClient';
import {
  getFileFromUrl,
  profileImageBaseUrl,
  uploadImageGeneral,
} from '../../services/ImageUploader';
import DropZoneMini from '../DropZones/DropZoneMini';
import { getPositionFromPositionCode } from '../../functions/get_nrp';
import Loader from '../../common/Loader/Loader';

const MasterManpowerList = () => {
  
  const navigate = useNavigate();

  const fetchManpower = async () => {
    const { data, error } = await supabase
      .from('manpower')
      .select('*')
      .order('position')
      .order('nama');

    if (error) {
      console.error(error.message);
      toast.error(error.message);
      return;
    }

    // console.log(data);
    // setDataRow(data);
    // setInitialDataRow(data);

    //For Simulation

    const updatedData = await Promise.all(
      data.map(async (item) => ({
        ...item,
        status: 'Onsite',
        nama: item.nama
          .toLowerCase()
          .split(' ')
          .map((word:any) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        image: (await getFileFromUrl(`${profileImageBaseUrl}/${item.nrp}`))
          ? `${profileImageBaseUrl}/${item.nrp}`
          : null,
        position: await getPositionFromPositionCode(item.position)
      })),
    );

    console.log(updatedData);
    setDataRow(updatedData);
    setInitialDataRow(updatedData);
  };

  useEffect(() => {
    fetchManpower();
  }, []);

  const [dataRow, setDataRow] = useState<Manpower[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [initialDataRow, setInitialDataRow] = useState<Manpower[]>([]);

  const handleSearch = (e: any) => {
    e.preventDefault();
    const searchValue = e.target.value; // Get the input value
    setKeyword(searchValue);

    if (searchValue !== '') {
      // Perform a case-insensitive partial match
      const newData = initialDataRow.filter((data) =>
        data.nama.toLowerCase().includes(searchValue.toLowerCase()),
      );
      setDataRow(newData); // Set filtered data
    } else {
      // Reset to original data when search is cleared
      setDataRow(initialDataRow); // Reset to original data
    }
  };

  const handleView = (id: any) => {
    console.log(`Viewing row with id: ${id}`);
    navigate(`/profile/${id}`);
  };

  const handleEdit = (id: any) => {
    console.log(`Editing row with id: ${id}`);
    navigate(`/settings/${id}`);
  };

  const handleDelete = (id: any) => {
    Swal.fire({
      title: 'Remove Manpower?',
      text: 'Tindakan ini tidak dapat dibatalkan!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'OK',
    }).then((result) => {
      if (result.isConfirmed) {
        // Call the delete function
        const updatedRows = dataRow.filter((row) => row.nrp !== id);
        setDataRow(updatedRows);
        // Show success toast
        toast.success('Manpower Removed');
      }
    });
  };

  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const handleSort = (column: any) => {
    const direction =
      sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(direction);

    // Sort your data here based on the column and direction
    const sortedData = [...dataRow].sort((a: any, b: any) => {
      if (direction === 'asc') {
        return a[column] > b[column] ? 1 : -1;
      } else {
        return a[column] < b[column] ? 1 : -1;
      }
    });
    setDataRow(sortedData); // assuming setDataRow is your state updater
  };

  const handleUploadProfileImage = async (e: any, file: File) => {

    const uploadstatus = await uploadImageGeneral(
      file,
      'images',
      `profile/${e}`,
    );
    if (uploadstatus) {
       // Create a new image URL with a cache-busting query parameter
      const timestamp = new Date().getTime();
    const imageUrl = `${profileImageBaseUrl}/${e}?t=${timestamp}`;
      const newDataRow = dataRow.map((row) =>
        row.nrp === e ? { ...row, image: imageUrl } : row,
      );
      setDataRow(newDataRow);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.getAttribute('data-id');
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      console.log('Selected file :', file);
      console.log('Selected id : ', id);
      handleUploadProfileImage(id, file);
      
      // Add your logic here to handle the file and ID
    }
  };

 
  const handleButtonClick = (id: string) => {
    fileInputRef.current?.click(); // Trigger file input click
    fileInputRef.current?.setAttribute('data-id', id); // Store the ID for later use
  };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark justify-between">
      <Toaster />
      <div className="add-menpower flex w-full justify-end my-4 ">
        <Link
          to="#"
          className="mr-4 inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-4 xl:px-4"
        >
          <span>
            <FontAwesomeIcon icon={faAdd}></FontAwesomeIcon>
          </span>
          Add Manpower
        </Link>
      </div>
      <div className="relative text-gray-600">
        <input
          value={keyword}
          onChange={handleSearch}
          type="search"
          name="serch"
          placeholder="Search"
          className="bg-white h-10 px-5 pr-10 rounded-full text-sm focus:outline-none w-full"
        />
        <button type="submit" className="absolute right-0 top-0 mt-3 mr-4">
          <svg
            className="h-4 w-4 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            version="1.1"
            id="Capa_1"
            x="0px"
            y="0px"
            viewBox="0 0 56.966 56.966"
            xmlSpace="preserve"
            width="512px"
            height="512px"
          >
            <path d="M55.146,51.887L41.588,37.786c3.486-4.144,5.396-9.358,5.396-14.786c0-12.682-10.318-23-23-23s-23,10.318-23,23  s10.318,23,23,23c4.761,0,9.298-1.436,13.177-4.162l13.661,14.208c0.571,0.593,1.339,0.92,2.162,0.92  c0.779,0,1.518-0.297,2.079-0.837C56.255,54.982,56.293,53.08,55.146,51.887z M23.984,6c9.374,0,17,7.626,17,17s-7.626,17-17,17  s-17-7.626-17-17S14.61,6,23.984,6z" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-3 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-7 md:px-6 2xl:px-7.5">
        <div
          className="col-span-1 sm:col-span-2 flex items-center"
          onClick={() => handleSort('nama')}
        >
          <p className="font-medium cursor-pointer">Name</p>
        </div>
        <div
          className="col-span-1 flex items-center justify-start sm:flex"
          onClick={() => handleSort('nrp')}
        >
          <p className="font-medium cursor-pointer">NRP/SID</p>
        </div>
        <div
          className="col-span-1 hidden items-center sm:flex"
          onClick={() => handleSort('position')}
        >
          <p className="font-medium cursor-pointer">Role</p>
        </div>
        <div
          className="col-span-1 hidden items-center sm:flex"
          onClick={() => handleSort('join_date')}
        >
          <p className="font-medium cursor-pointer">Join Date</p>
        </div>
        <div
          className="col-span-1 hidden items-center sm:flex"
          onClick={() => handleSort('status')}
        >
          <p className="font-medium cursor-pointer">Status</p>
        </div>
        <div className="col-span-1 flex items-center justify-center">
          <p className="font-medium">Action</p>
        </div>
      </div>

      { dataRow?  dataRow.map((manpower, key) => (
        <div
          className="grid grid-cols-3 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-7 md:px-6 2xl:px-7.5"
          key={key}
        >
          <div className="col-span-1 sm:col-span-2 flex items-center">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className=" flex h-12.5 w-15 rounded-md">
                {manpower.image ? (
                     <button
                     id={manpower.nrp}
                     onClick={() => handleButtonClick(manpower.nrp)} // Pass the ID
                     className="relative flex items-center justify-center"
                   >
                     <div className="absolute flex items-center justify-center transition-opacity duration-300">
                       <FontAwesomeIcon
                         icon={faEdit}
                         className="text-slate-700 z-0"
                       />
                     </div>
                     <img
                       src={manpower.image}
                       alt="ProfileImg"
                       className="z-9 h-full w-full object-contain cursor-pointer hover:opacity-30 hover:z-2 transition-opacity duration-300"
                     />
                     <input
                      id={manpower.nrp}
                       type="file"
                       ref={fileInputRef}
                       onChange={handleFileChange}
                       style={{ display: 'none' }} // Hide the input
                     />
                   </button>
                ) : (
                  <DropZoneMini
                    id={manpower.nrp}
                    onFileUpload={handleUploadProfileImage}
                  ></DropZoneMini>
                )}
              </div>
              <div className="flex flex-col">
                <p className="text-sm text-black dark:text-white">
                  {manpower.nama}
                  <br></br>
                </p>
                <p className="text-sm text-slate-400 dark:text-white">
                  {manpower.email}
                  <br></br>
                </p>
              </div>
            </div>
          </div>
          <div className="col-span-1 flex items-center justify-start sm:flex">
            <p className="text-sm text-black dark:text-white">
              {manpower.nrp}
              <br></br>
              {manpower.sid_code}
            </p>
          </div>
          <div className="col-span-1 hidden items-center sm:flex">
            <p className="text-sm text-black dark:text-white">
              {manpower.position}
            </p>
          </div>

          <div className="col-span-1 hidden items-center sm:flex">
            <p className="text-sm text-black dark:text-white">
              {manpower.join_date}
            </p>
          </div>
          <div className="col-span-1 hidden items-center sm:flex">
            <p
              className={`inline-flex rounded-full bg-opacity-10 py-1 px-3 text-sm font-medium ${
                manpower.status === 'Onsite'
                  ? 'bg-success text-success'
                  : manpower.status === 'Cuti'
                  ? 'bg-danger text-danger'
                  : 'bg-warning text-warning'
              }`}
            >
              {manpower.status}
            </p>
          </div>
          <div className="sm:hidden flex justify-center items-center w-full">
            <DropdownManpowerAction
              rowId="123"
              onView={() => handleView(manpower.nrp)}
              onEdit={() => handleEdit(manpower.nrp)}
              onDelete={() => handleDelete(manpower.nrp)}
            />
          </div>
          <div className="hidden align-middle justify-center items-center sm:flex">
            <ManpowerActionButton
              rowId="123"
              onView={() => handleView(manpower.nrp)}
              onEdit={() => handleEdit(manpower.nrp)}
              onDelete={() => handleDelete(manpower.nrp)}
            />
          </div>
        </div>
      )) : <div className='w-full'>
        <Loader></Loader>
      </div> }
    </div>
  );
};

export default MasterManpowerList;
