import LogoIcon from '../../images/logo/logo-icon.svg';

const Loader = ({ className }: { className?: string }) => {
  const containerClass = className || "flex h-screen items-center justify-center bg-white";

  return (
    <div className={containerClass}>
      <div className="h-32 w-32 animate-spin rounded-full border-4 border-solid border-black border-t-transparent z-1 absolute"></div>
      <div className="flex justify-center items-center relative h-full w-full">

        <img
          className="align-middle h-12 z-99 absolute inset-0 m-auto"
          src={LogoIcon}
          alt=""
        />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 text-center w-full">
          <h1 className='font-bold text-black'>Fuel Feasibility for Fleet</h1>
          {/* <h4>{title || 'Now Loading....'}</h4> */}
        </div>

      </div>
    </div>
  );
};

export default Loader;
