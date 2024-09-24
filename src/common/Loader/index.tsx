import LogoIcon from '../../images/logo/logo-icon.svg';

const Loader = (title:any) => {
  return (
    <div className="flex flex-col">
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-32 w-32 animate-spin rounded-full border-4 border-solid border-black border-t-transparent z-1 absolute m-auto"></div>
        <div className="flex justify-center items-center">

          <img
            className="align-middle h-12 z-99 absolute m-auto"
            src={LogoIcon}
            alt=""
          />

          <div className="relative top-25 text-center">
            <h1 className='font-bold text-black'>Fuel Feasibility for Fleet</h1>
            <h4>{title || 'Now Loading....'}</h4>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Loader;
