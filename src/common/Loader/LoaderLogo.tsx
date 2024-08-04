import LogoIcon from '../../images/logo/loco-icon.svg';

const LoaderLogo = () => {
  return (
    <div className="flex flex-col">
      <div className="flex h-125 items-center justify-center bg-white">
        <div className="h-32 w-32 animate-spin rounded-full border-4 border-solid border-black border-t-transparent z-1 absolute m-auto"></div>
        <div className="flex justify-center items-center">

          <img
            className="align-middle h-12 z-99 absolute m-auto"
            src={LogoIcon}
            alt=""
          />

        </div>
      </div>
    </div>
  );
};

export default LoaderLogo;
