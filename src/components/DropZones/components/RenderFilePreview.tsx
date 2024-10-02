import AudioIcon from './filetype/audio-document-svgrepo-com.svg';
import CsvIcon from './filetype/csv-document-svgrepo-com.svg';
import ExcelIcon from './filetype/excel-document-svgrepo-com.svg';
import Mp4Icon from './filetype/mp4-document-svgrepo-com.svg';
import PdfIcon from './filetype/pdf-document-svgrepo-com.svg';
import PptIcon from './filetype/ppt-document-svgrepo-com.svg';
import TxtIcon from './filetype/txt-document-svgrepo-com.svg';
import WordIcon from './filetype/word-document-svgrepo-com.svg';
import ZipIcon from './filetype/zip-document-svgrepo-com.svg';
import ImageIcon from './filetype/image-document-svgrepo-com.svg';
import UnknownIcon from './filetype/unknown-document-svgrepo-com.svg';

const renderFilePreview = (file: File) => {
  const fileType = file.type;
  if (fileType.includes('image')) {
    return <img src={ImageIcon} className="w-16 h-16 mb-4" alt="Image Icon" />;
  } else if (fileType.includes('application/pdf')) {
    return <img src={PdfIcon} className="w-16 h-16 mb-4" alt="PDF Icon" />;
  } else if (fileType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
    return <img src={WordIcon} className="w-16 h-16 mb-4" alt="Word Icon" />;
  } else if (fileType.includes('spreadsheet')) {
    return <img src={ExcelIcon} className="w-16 h-16 mb-4" alt="Excel Icon" />;
  } else if (fileType.includes('presentation')) {
    return <img src={PptIcon} className="w-16 h-16 mb-4" alt="PowerPoint Icon" />;
  } else if (fileType.includes('audio/')) {
    return <img src={AudioIcon} className="w-16 h-16 mb-4" alt="Audio Icon" />;
  } else if (fileType.includes('text/csv')) {
    return <img src={CsvIcon} className="w-16 h-16 mb-4" alt="CSV Icon" />;
  } else if (fileType.includes('video/mp4')) {
    return <img src={Mp4Icon} className="w-16 h-16 mb-4" alt="MP4 Icon" />;
  } else if (fileType.includes('text/plain')) {
    return <img src={TxtIcon} className="w-16 h-16 mb-4" alt="Text Icon" />;
  } 
  else if (fileType.includes('zip')) {
    return <img src={ZipIcon} className="w-16 h-16 mb-4" alt="Zip Icon" />;
  } 
  else {
    return <img src={UnknownIcon} className="w-16 h-16 mb-4" alt="Unknown Icon" />;
  } 
};

export { renderFilePreview };
