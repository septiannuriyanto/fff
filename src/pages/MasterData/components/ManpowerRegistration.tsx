import { useState } from 'react';
import LabeledInput from '../../../components/LabeledInput';
import LabeledDateInput from '../../../components/LabeledDateInput';
import { supabase } from '../../../db/SupabaseClient';
import LabeledComboBox from '../../../components/LabeledCombobox';
import positionOptions from '../../../common/Constants/positions';

const ManpowerRegistration = () => {
  const [nama, setNama] = useState<string>('');
  const changeNama = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNama(e.target.value);
    console.log(nama);
  };

  const [nrp, setNrp] = useState<string>('');
  const changeNrp = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNrp(e.target.value);
    console.log(nrp);
  };
  const [position, setPosition] = useState<string>('');
  const changePosition = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPosition(e.target.value);
    console.log(position);
    }
  const [email, setEmail] = useState<string>('');
  const changeEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    console.log(email);
  };
  const [phone, setPhone] = useState<string>('');
  const changePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    console.log(phone);
  };
  const [sid, setSID] = useState<string>('');
  const changeSID = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSID(e.target.value);
    console.log(sid);
  };

  const [dateErrorMessage, setDateErrorMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const handleDateChange = (date: Date | null) => {
    setStartDate(date);
    setDateErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!nrp || !nama || !sid || !email || !position || !startDate) {
      alert('Please fill all required fields.');
      return;
    }

    const { error } = await supabase.from('manpower').insert({
      nrp,
      nama,
      sid_code: sid,
      sid_expired: null, // Or you can add a DatePicker if you want to include this
      contract_date: null, // Same here if needed
      position: parseInt(position), // assuming you store position as an integer FK
      email,
      off_day: null, // You can add this if needed
      join_date: startDate,
      active_date: null, // controlled by another module as you mentioned
      reset_token: null, // optional
      no_hp: phone,
    });

    if (error) {
      console.error('Error inserting manpower:', error.message);
      alert('Insert failed: ' + error.message);
    } else {
      alert('Manpower successfully registered!');
      // Optional: Reset form
      setNama('');
      setNrp('');
      setSID('');
      setEmail('');
      setPosition('');
      setPhone('');
      setStartDate(null);
    }
  };

  return (
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Manpower Registration
              </h2>

              <div className="main-content  w-full">
                <LabeledInput
                  required
                  label="Nama"
                  type="text"
                  value={nama}
                  onChange={changeNama}
                  placeholder="Masukkan Nama"
                />

                <LabeledInput
                  required
                  label="NRP"
                  type="text"
                  value={nrp}
                  onChange={changeNrp}
                  placeholder="Masukkan NRP"
                />
                <LabeledInput
                  required
                  label="SID"
                  type="text"
                  value={sid}
                  onChange={changeSID}
                  placeholder="Masukkan Kode SID"
                />

                <LabeledInput
                  required
                  label="Email"
                  type="email"
                  value={email}
                  onChange={changeEmail}
                  placeholder="Masukkan Email"
                />
                <LabeledComboBox
                  required
                  label="Position"
                  value={position}
                  onChange={changePosition}
                  options={positionOptions}
                />

                <LabeledInput
                  required
                  label="Phone"
                  type="text"
                  value={phone}
                  onChange={changePhone}
                  placeholder="Masukkan No Telepon"
                />

                <LabeledDateInput
                  label="Join Date"
                  value={startDate}
                  onChange={handleDateChange}
                  required
                />

                <button
                  className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  onClick={handleSubmit}
                >
                  Submit
                </button>
                {dateErrorMessage && (
                  <p className="text-red-500 mt-2">{dateErrorMessage}</p>
                )}
                <div className="mt-4"></div>
                <h3 className="text-lg font-bold">Preview</h3>
                <p>
                  <strong>Nama:</strong> {nama}
                </p>
                <p>
                  <strong>NRP:</strong> {nrp}
                </p>
                <p>
                  <strong>SID:</strong> {sid}
                </p>
                <p>
                  <strong>Email:</strong> {email}
                </p>
                <p>
                  <strong>Position:</strong> {position}
                </p>
                <p>
                  <strong>Phone:</strong> {phone}
                </p>
                <p>
                  <strong>Join Date:</strong> {startDate?.toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ManpowerRegistration;
