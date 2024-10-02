import React from 'react';

interface PDFModalProps {

    isOpen:boolean,
    onRequestClose:() => void,
    filePath:string

}

const PdfModal:React.FC<PDFModalProps>=({ isOpen, onRequestClose, filePath }) => {
  if (!isOpen) return null;

  const pdfUrl = `${filePath}`;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    width: '80%',
    maxWidth: '600px',
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>PDF Viewer</h2>
        <iframe
          src={pdfUrl}
          width="100%"
          height="600px"
          title="PDF Viewer"
          style={{ border: 'none' }}
        />
        <button onClick={onRequestClose} style={styles.closeButton}>Close</button>
      </div>
    </div>
  );
};

const styles = {
  closeButton: {
    marginTop: '10px',
    padding: '10px 20px',
    background: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default PdfModal;
