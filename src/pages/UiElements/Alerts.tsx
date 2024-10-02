import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import AlertError from './Alerts/AlertError';
import AlertSuccess from './Alerts/AlertSuccess';
import AlertWarning from './Alerts/AlertWarning';

const Alerts = () => {
  return (
    <>
      <Breadcrumb pageName="Alerts" />

      <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark md:p-6 xl:p-9">
        <div className="flex flex-col gap-7.5">
          {/* <!-- Alerts Item --> */}
          <AlertWarning/>
          {/* <!-- Alerts Item --> */}
          <AlertSuccess/>
          {/* <!-- Alerts Item --> */}
          <AlertError/>

        </div>
      </div>
    </>
  );
};

export default Alerts;
