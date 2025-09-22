// components/AdditiveInput.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { ADDITIVE_PORTION } from '../../../common/Constants/constants';
import { useAuth } from '../../Authentication/AuthContext';

interface AdditiveInputProps {
  summaryData: any;
  tanggal: string;
  onRecordAdded?: () => void;
}

interface AdditiveRecord {
  id: number;
  mr_number: string;
  reserv_number: string;
  record_by: string;
  created_at: string;
}

// Fungsi untuk generate MR Number dengan format GYYMMDD
const generateMRNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // YY
  const month = String(now.getMonth() + 1).padStart(2, '0'); // MM
  const day = String(now.getDate()).padStart(2, '0'); // DD
  
  return `G${year}${month}${day}`;
};

const AdditiveInput: React.FC<AdditiveInputProps> = ({ 
  summaryData, 
  tanggal,
  onRecordAdded 
}) => {
  const [reservNumber, setReservNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRecord, setExistingRecord] = useState<AdditiveRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  // Check apakah sudah ada record untuk tanggal ini
  useEffect(() => {
    const checkExistingRecord = async () => {
      if (!tanggal) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('additive_record')
          .select('id, mr_number, reserv_number, record_by, created_at')
          .eq('ritation_date', tanggal)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error checking existing record:', error);
          setExistingRecord(null);
        } else {
          setExistingRecord(data && data.length > 0 ? data[0] : null);
        }
      } catch (error) {
        console.error('Failed to check existing record:', error);
        setExistingRecord(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingRecord();
  }, [tanggal]);

  // Fungsi untuk submit data ke database
  const submitAdditiveRecord = async (reservationNumber: string) => {
    if (!summaryData || !reservationNumber.trim()) {
      alert('Harap masukkan nomor reservation!');
      return;
    }

    if (!currentUser?.nrp) {
      alert('User tidak teridentifikasi!');
      return;
    }

    setIsSubmitting(true);

    try {
      const recordData = {
        ritation_date: tanggal,
        qty_ritasi: summaryData.daily_freq || 0,
        qty_additive: ((summaryData.daily_qty || 0) / ADDITIVE_PORTION).toFixed(2),
        mr_number: generateMRNumber(),
        record_by: currentUser.nrp,
        reserv_number: reservationNumber.trim()
      };

      const { data, error } = await supabase
        .from('additive_record')
        .insert([recordData])
        .select();

      if (error) {
        throw error;
      }

      // Reset input dan callback
      setReservNumber('');
      onRecordAdded?.();
      
      // Update existing record state
      const newRecord: AdditiveRecord = {
        id: data[0].id,
        mr_number: recordData.mr_number,
        reserv_number: recordData.reserv_number,
        record_by: recordData.record_by,
        created_at: data[0].created_at
      };
      setExistingRecord(newRecord);
      
      alert(`Additive record berhasil disimpan!\nMR Number: ${recordData.mr_number}`);

    } catch (error) {
      console.error('Error saving additive record:', error);
      alert('Gagal menyimpan additive record. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      submitAdditiveRecord(reservNumber);
    }
  };

  // Jika sedang loading
  if (isLoading) {
    return (
      <div className="px-2 py-1 text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  // Jika sudah ada record, tampilkan nomor reserv dengan warna hijau tua bold
  if (existingRecord) {
    return (
      <div className="px-2 py-1 text-center">
        <div className="text-sm font-bold text-green-800">
          {existingRecord.reserv_number}
        </div>
      </div>
    );
  }

  // Jika belum ada record, tampilkan input
  return (
    <input 
      className={`input_additive border rounded-sm px-2 py-1 w-full ${
        isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      placeholder="Input No. Reservation dan Enter.."
      value={reservNumber}
      onChange={(e) => setReservNumber(e.target.value)}
      onKeyDown={handleKeyPress}
      disabled={isSubmitting}
    />
  );
};

export default AdditiveInput;