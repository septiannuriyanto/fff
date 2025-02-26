import { useState } from 'react';
import SelectPeriode from './SelectPeriode';
import DropZone from '../../../../../components/DropZones/DropZone';
import { getYear } from 'date-fns';
import { supabase } from '../../../../../db/SupabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import DropZoneReusable from '../../../../../components/DropZones/DropZoneReusable';
import { uploadImageGeneral } from '../../../../../services/ImageUploader';

interface RitationPlanData{
  period:number;
  plan_fuel_ob:number;
  plan_fuel_coal:number;
  doc_url:string;
}

interface RitationPoData{
  period:number;
  po_number:string;
  po_qty:string
  doc_url:string;
}

interface RitationPlanInputProps{
  onPreview:(file:File) =>void;
}

const RitationPlanInput:React.FC<RitationPlanInputProps>=({ onPreview }) => {
  const [period, setPeriod] = useState('');
  const [planOb, setPlanOb] = useState('');
  const [planCoal, setPlanCoal] = useState('');
  const [poNo, setPoNo] = useState('');
  const [qtyPo, setQtyPo] = useState('');

  const [docRequest, setDocRequest] = useState<File | null>(null);
  const [docPo, setDocPo] = useState<File | null>(null);


  const handleSelect = (e: any) => {
    setPeriod(e);
  };

  const handleChangePlanOb = (e: any) => {
    setPlanOb(e.target.value);
  };
  const handleChangePlanCoal = (e: any) => {
    setPlanCoal(e.target.value);
  };
  const handleChangePONo = (e: any) => {
    setPoNo(e.target.value);
  };
  const handleChangePoQty = (e: any) => {
    setQtyPo(e.target.value);
  };

  const handleUploadDocRequest = async (file: File) => {
    setDocRequest(file);
    onPreview(file);
    console.log(file);
    
  }
  const handleUploadDocPO = async (file: File) => {
    setDocPo(file);
    onPreview(file);
    console.log(file);
  }


  const handleSubmit = async(e:any) =>{
    e.preventDefault()

    if(!period){
      toast.error('Mohon Lengkapi Data !')
      return;
    }

    const year = period.toString().substring(0, 4);
    const reqUrl = `https://fylkjewedppsariokvvl.supabase.co/storage/v1/object/public/documents/plan_order_fuel/${year}/${period}/ba-request`;
    const poUrl = `https://fylkjewedppsariokvvl.supabase.co/storage/v1/object/public/documents/po_fuel/${year}/${period}/po-request`;
  

   if(docRequest && planCoal && planOb){
    const dataRitasi = {
      period: parseInt(period),
      plan_fuel_ob: parseInt(planOb),
      plan_fuel_coal: parseInt(planCoal),
      doc_url:reqUrl
    }
    console.log(dataRitasi);
    const uploadStatus = await uploadImageGeneral(docRequest, 'documents', `plan_order_fuel/${year}/${period}/ba-request`)
    if(!uploadStatus){
      return;
    }

    const  { data, error } = await supabase.from('plan_order').insert(dataRitasi);
    if(error){
      toast.error(`Error Inserting Plan Qty :\n${error.message}`, )
      return;
    }
    toast.success(`Success Inserting Plan Qty`, )
    setDocRequest(null);
   }

    if(docPo && qtyPo && poNo){
      
    const dataPO = {
      period: parseInt(period),
      po_number: poNo,
      po_qty: parseInt(qtyPo),
      doc_url: poUrl,
    }

    console.log(dataPO);

    const uploadStatus = await uploadImageGeneral(docPo, 'documents', `po_fuel/${year}/${period}/po-request`)
    if(!uploadStatus){
      return;
    }
      const  { data, error } = await supabase.from('po_fuel').insert(dataPO);
      if(error){
        toast.error(`Error Inserting PO Qty :\n${error.message}`, )
        return;
      }
      toast.success(`Success Inserting PO Data`, );
      setDocPo(null)
    }


   




    clearForm();
  }

  const clearForm = ()=>{
    setPeriod('')
    setPlanOb('')
    setPlanCoal('')
    setPoNo('')
    setQtyPo('')
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <Toaster></Toaster>
      <div className="border-b border-stroke py-1 px-6.5 dark:border-strokedark">
        <h3 className="font-medium text-black dark:text-white">
          Input New Ritation Plan
        </h3>
      </div>
      <form action="submit">
        <div className="p-6.5">
          <SelectPeriode value={period} onSelect={handleSelect} />
          <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
            <div className="w-full xl:w-1/2">
          
                <label className="mb-2.5 block text-black dark:text-white">
                  Plan Qty (OB)<span className="text-meta-1">*</span>
                </label>
                <input
                onChange={handleChangePlanOb}
                value={planOb}
                  type="number"
                  placeholder="Enter Plan Qty"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
           
            </div>
            <div className="w-full xl:w-1/2">
              <label className="mb-2.5 block text-black dark:text-white">
                Plan Qty (Coal)<span className="text-meta-1">*</span>
              </label>
              <input
              onChange={handleChangePlanCoal}
              value={planCoal}
                type="number"
                placeholder="Enter Plan Qty"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
          </div>



          <div className="upload__file gap-2 mb-8">
            <DropZoneReusable
            fileTypes='.pdf, .jpeg, .jpg, .png'
            id='file_ba'
            file={docRequest}
            onFileUpload={handleUploadDocRequest}
            title="" />

<div className="mt-10 mb-4 flex flex-col gap-6 xl:flex-row">
            <div className="w-full xl:w-1/2">
              <label className="mb-2.5 block text-black dark:text-white">
                No PO<span className="text-meta-1">*</span>
              </label>
              <input
              onChange={handleChangePONo}
              value={poNo}
                type="text"
                placeholder="Enter PO Number"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
            <div className="w-full xl:w-1/2">
              <label className="mb-2.5 block text-black dark:text-white">
                Qty PO<span className="text-meta-1">*</span>
              </label>
              <input
              onChange={handleChangePoQty}
              value={qtyPo}
                type="number"
                placeholder="Enter PO Qty"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
          </div>

            <DropZoneReusable
            fileTypes='.pdf, .jpeg, .jpg, .png'
            id='file_po'
            file={docPo}
            onFileUpload={handleUploadDocPO}
            title="" />
          </div>
          <button
          onClick={handleSubmit}
          className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default RitationPlanInput;
