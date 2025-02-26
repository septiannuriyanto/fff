import { AgGridReact } from 'ag-grid-react';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import ActionCellRenderer from './ActionCellRenderer';
import HardcopyLeaveLetterTemplate from './HardcopyLeaveLetterTemplate';
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import { useReactToPrint } from 'react-to-print';
import emailjs from 'emailjs-com';

const LeaveList = () => {

  const gridRef = useRef();
  const autoSizeStrategy = {
    type: 'fitCellContents',
  };
  const defaultColDef = {
    editable: true,
    filter: true, // Enable filtering on all columns
    sortable: true, // Enable sorting
  };

  const [rowData, setRowData] = useState<any[]>([]);
  const [gridApi, setGridApi] = useState<any>(null);
  const [showLetter, setShowLetter] = useState<boolean>(false);
  const [reportNumber, setReportNumber] = useState<string>('');
  const [reportDetailPrint, setReportDetailPrint] = useState<any>(null);
  const componentRef = useRef(null);

  useEffect(() => {
    async function fetchLeaveData() {
      const { data, error } = await supabase
        .rpc('get_leave_data');
    
      if (error) {
        console.error('Error fetching data:', error);
        return;
      }
    
      console.log('Fetched data:', data);
      setRowData(data)
      return data;
    }

    fetchLeaveData();

  }, []);

  
 const onGridReady = (params: any) => {
    setGridApi(params.api);
  };



  const handleApprove = async(paramdata: any) => {
    console.log('Approve action for:', paramdata);
    if(paramdata.approvaldate){
      return;
    }
    
    updateDateInSupabase(paramdata.id, new Date())
  };

  const updateDateInSupabase = async (id:number, date:Date) => {
    // Convert JavaScript Date object to ISO 8601 string
    const dateString = date.toISOString();
  
    // Update record in Supabase
    const { data, error } = await supabase
      .from('leave')
      .update({ approved_date: dateString }) // Replace `date_end` with the actual column name
      .eq('id', id); // Update the record with the specified ID
  
    if (error) {
      console.error('Error updating record:', error);
    } else {
      console.log('Record updated successfully:', data);
      alert('Approval Successful!')
    }
  };

  const handleMail = async (paramdata: any) => {
    const nrp = paramdata.nrp;

    const { data, error } = await supabase
      .from('manpower')
      .select('email')
      .eq('nrp', nrp);
    if (error) {
      console.error('Error fetching email:', error);
      return;
    }

    if(!paramdata.approvaldate){
        alert('Pengajuan cuti anda belum approved');
        return;
    }

    const email = data[0].email;
    if(email){
        sendEmail(email)
    }
    else{
        alert('Anda belum mendaftarkan email')
    }

    console.log(paramdata);
    setReportDetailPrint(paramdata);
    setShowLetter(true);
    setTimeout(() => {
      
    }, 1000);
    downloadReport(paramdata.id);

    // console.log('Mail action for:', props.data);
  };

  function sendEmail(email:string){

    console.log(email);
    
  }

  const handleSendEmail = async (pdfBlob:any) => {
    const formData = new FormData();
    formData.append('file', pdfBlob, 'document.pdf');
    
    const templateParams = {
      to_email: 'recipient@example.com',
      subject: 'PDF Attachment',
      message: 'Please find the attached PDF document.',
    };

    try {
      const response = await emailjs.sendForm('your_service_id', 'your_template_id', formData, 'your_user_id');
      console.log('Email sent successfully:', response);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };



  const handleMore = () => {
    // console.log('More action for:', props.data);
  };


  const fetchReportItems = async(props:string) => {
    console.log(props);
    
  };

  const prepareReport = async (number:string) => {
    setReportNumber(number);
    const detailReport = await fetchReportItems(number);
    setReportDetailPrint(detailReport)
    setShowLetter(true)
    setTimeout(() => {
    }, 1000);
  }

  const downloadReport = async (number:string) => {
    const getTargetElement = () => document.getElementById("output-report");
    const options = {
      filename: `Surat Cuti ${number }.pdf`,
      // default is `save`
      method: 'save',
      // default is Resolution.MEDIUM = 3, which should be enough, higher values
      // increases the image quality but also the size of the PDF, so be careful
      // using values higher than 10 when having multiple pages generated, it
      // might cause the page to crash or hang.
      resolution: Resolution.HIGH,
      page: {
        // margin is in MM, default is Margin.NONE = 0
        margin: Margin.SMALL,
        // default is 'A4'
        format: 'A4',
        // default is 'portrait'
        orientation: 'portrait',
      },
      canvas: {
        // default is 'image/jpeg' for better size performance
        mimeType: 'image/jpeg',
        qualityRatio: 1
      },
      // Customize any value passed to the jsPDF instance and html2canvas
      // function. You probably will not need this and things can break, 
      // so use with caution.
      overrides: {
        // see https://artskydj.github.io/jsPDF/docs/jsPDF.html for more options
        pdf: {
          compress: true
        },
        // see https://html2canvas.hertzen.com/configuration for more options
        canvas: {
          useCORS: true
        }
      },
    };
    setTimeout(() => {
      generatePDF(getTargetElement, options)
    }, 1000);

    setTimeout(() => {
      setShowLetter(false);
    }, 1000);

  }


  const handlePrint = (paramdata: any) => {
    console.log('Print action for:', paramdata);
    if(!paramdata.approvaldate){
        alert('Pengajuan cuti anda belum approved');
        return;
    }

    // printReport();
  };

  const printReport = async () => {

    prepareReport(reportDetailPrint.id);
    setTimeout(() => {
      useReactToPrint ({
        content: () => componentRef.current,
      });
      setShowLetter(false)
    }, 1000);


  }


  const fullColumns = [
    { headerName: 'id', field: 'id' },
    { headerName: 'NRP', field: 'nrp' },
    { headerName: 'Nama', field: 'nama' },
    { headerName: 'Date Start', field: 'date_start' },
    { headerName: 'Date End', field: 'date_end' },
    { headerName: 'Create Date', field: 'createdate' },
    { headerName: 'Approval Date', field: 'approvaldate' },
    { headerName: 'Remark', field: 'remark' },
    { headerName: 'Closed', field: 'closed' , editable: false},
    { headerName: 'Action', field: 'action' , cellRenderer: 'actionCellRenderer', width: 150, cellRendererParams: {
      onApprove: handleApprove,
      onMail: handleMail,
      onPrint: handlePrint,
      onMore: handleMore,
    }},
  ];
  return (
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Daftar Karyawan Cuti
              </h2>

              <div className="main-screen h-100 w-full ">
                <div className="ag-theme-quartz-auto-dark h-100 w-full mb-6">
                  <AgGridReact
                    ref={gridRef}
                    columnDefs={fullColumns}
                    onGridReady={onGridReady}
                    rowData={rowData}
                    defaultColDef={defaultColDef}
                    components={{
                      actionCellRenderer: ActionCellRenderer // Register the custom cell renderer
                    }}
                  />
                </div>
                {!showLetter? <div/> : <div className="hardcopy__template mt-10">
                  <HardcopyLeaveLetterTemplate detail={reportDetailPrint} ref={componentRef} />
                </div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeaveList;
