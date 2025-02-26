import React from 'react'
import A4Page from '../../../common/Export/A4Page'
import Logo from '../../../images/logo/company_logo.png'

type Props = {}

const BastOliPage1 = (props: Props) => {

 const district = 'BRCG';
 const tanggal = '01 Oktober 2024'



  return (
    <A4Page
    
    header={
        <div className='flex flex-row header w-full h-32 justify-between text-xs px-4 pt-10 pl-10 pr-10'>
            <div className='   header__left flex flex-row align-middle items-center h-20 gap-2'>
                <img className='h-16 w-16' src={Logo}></img>
            <div className='flex flex-col gap-1'>
            <p>PT. Pamapersada Nusantara</p>
            <p>Jobsite BRCG</p>
            <p>Sm Department</p>
            </div>
            </div>
            <h1>PAMA/SMDV/F-011</h1>
        </div>
    }
    >
        <div className="title__text mt-10 w-full text-center font-bold text-title-sm text-black">
        <h1>Formulir Stock Taking Pelumas & Additive</h1>
        </div>

        <div className="subtitle">
            <p>District <span className='ml-4'>: {district}</span> </p>
            <p>Tanggal <span className='ml-4'>: {tanggal}</span> </p>
        </div>
      </A4Page>
  )
}

export default BastOliPage1