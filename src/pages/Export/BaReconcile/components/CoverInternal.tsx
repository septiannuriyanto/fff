import React from 'react';
import A4Page from '../../../../common/Export/A4Page';
import CompanyLogo from '../../../../images/logo/company_logo.png';

interface CoverInternalProps {
  title: string;
  periode: string;
}

const CoverInternal: React.FC<CoverInternalProps> = ({ title, periode }) => {
  return (
    <A4Page>
      <div className="flex flex-col h-full justify-between items-center align-middle text-center font-bold text-black">
        <div className="flex flex-col header gap-2">
        <h1 className='text-title-lg'>{title}</h1>
        <h1 className='text-title-sm'> Periode : {periode}</h1>
        </div>
        <div className='logo-pama h-64 w-64  flex object-contain'>
          <img src={CompanyLogo} alt="Company Logo" />
        </div>
        <div className="footer gap-0">
        <h1>PT. Pamapersada Nusantara</h1>
        <h1>Jobsite BRCG</h1>
        <h1>Supply Management Department</h1>
        </div>
      </div>
    </A4Page>
  );
};

export default CoverInternal;
