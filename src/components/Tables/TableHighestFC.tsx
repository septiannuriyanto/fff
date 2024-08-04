import { TOPFCMODEL } from '../../types/topfcmodel';
import Dozer from '../../images/icon/bulldozer.svg'
import Exca from '../../images/icon/excavator.svg'
import Dumptruck from '../../images/icon/dumptruck.svg'

const topFcData: TOPFCMODEL[] = [
  {
  logo: Dozer,
  cn: 'DZ431',
  egi: 'D375A6R',
  class: 'SUPPORT',
  lossgainpercent: 4,
  lossdollar: 270,
  },
  {
  logo: Exca,
  cn: 'EX1765',
  egi: 'PC2000SP11',
  class: 'PRODUCTION',
  lossgainpercent: 6.9,
  lossdollar: 410,
  },
  {
  logo: Dozer,
  cn: 'DZ1152',
  egi: 'D155A6R',
  class: 'SUPPORT',
  lossgainpercent: 6.9,
  lossdollar: 410,
  },
 {
  logo: Dumptruck,
  cn: 'DT3197',
  egi: 'HD7857',
  class: 'HAULER',
  lossgainpercent: 3.54,
  lossdollar: 310,
  },
];

const TableHighestFC = () => {
  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
        Top Highest Fuel Consumption
      </h4>

      <div className="flex flex-col">
        <div className="grid grid-cols-3 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-5">
          <div className="p-2.5 xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              CN
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              EGI
            </h5>
          </div>
          
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Class
            </h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Loss/Gain %
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Loss $ / hour
            </h5>
          </div>
        </div>

        {topFcData.map((data, key) => (
          <div
            className={`grid grid-cols-3 sm:grid-cols-5 ${
              key === topFcData.length - 1
                ? ''
                : 'border-b border-stroke dark:border-strokedark'
            }`}
            key={key}
          >
            <div className="flex items-center gap-3 p-2.5 xl:p-5">
              <div className="hidden flex-shrink-0">
                <img src={data.logo} className='h-6 ' alt="Brand" />
              </div>
              <p className=" text-black font-bold dark:text-white sm:block">
                {data.cn}
              </p>
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-black dark:text-white">{data.egi}</p>
            </div>



            <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
              <p className="text-black dark:text-white">{data.class}</p>
            </div>

            <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
              <p className="text-meta-1">{data.lossgainpercent}%</p>
            </div>
                        <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-meta-1">${data.lossdollar}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableHighestFC;
