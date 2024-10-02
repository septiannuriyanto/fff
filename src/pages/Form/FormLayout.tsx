import { Link } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import SelectGroupOne from '../../components/Forms/SelectGroup/SelectGroupOne';
import ContactForm from './components/ContactForm';
import SignInForm from './components/SignInForm';
import SignUpForm from './components/SignUpForm';

const FormLayout = () => {
  return (
    <>
      <Breadcrumb pageName="Form Layout" />

      <div className="grid grid-cols-1 gap-9 sm:grid-cols-2">
        <div className="flex flex-col gap-9">
          {/* <!-- Contact Form --> */}
          <ContactForm/>
        </div>

        <div className="flex flex-col gap-9">
          {/* <!-- Sign In Form --> */}
        <SignInForm/>

          {/* <!-- Sign Up Form --> */}
        <SignUpForm/>
        </div>
      </div>
    </>
  );
};

export default FormLayout;
