import emailjs from 'emailjs-com';

const sendEmail = (name:string, pdfBase64:any) => {
  const templateParams = {
    to_name: name,
    from_name: 'FAO Section / SM Department BRCG',
    message: `Surat Cuti Sdr/i : ${name}`,
    attachment: `data:application/pdf;base64,${pdfBase64}`,  // Base64 PDF string
  };

  emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams, 'YOUR_USER_ID')
    .then((response) => {
      console.log('Email sent successfully:', response);
    })
    .catch((error) => {
      console.error('Error sending email:', error);
    });
};
