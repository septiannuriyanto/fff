import { useEffect } from "react";
import DropdownDefault from "../../../components/Dropdowns/DropdownDefault";
import DropdownMessage from "../../../components/Header/DropdownMessage";
import { Settings } from "lucide-react";
import { Calendar } from "rsuite";
import CheckboxFive from "../../../components/Checkboxes/CheckboxFive";
import CheckboxFour from "../../../components/Checkboxes/CheckboxFour";
import CheckboxOne from "../../../components/Checkboxes/CheckboxOne";
import CheckboxThree from "../../../components/Checkboxes/CheckboxThree";
import CheckboxTwo from "../../../components/Checkboxes/CheckboxTwo";
import SelectGroupTwo from "../../../components/Forms/SelectGroup/SelectGroupTwo";
import DropdownNotification from "../../../components/Header/DropdownNotification";
import DropdownUser from "../../../components/Header/DropdownUser";
import MapOne from "../../../components/Maps/MapOne";
import SwitcherFour from "../../../components/Switchers/SwitcherFour";
import SwitcherOne from "../../../components/Switchers/SwitcherOne";
import SwitcherThree from "../../../components/Switchers/SwitcherThree";
import SwitcherTwo from "../../../components/Switchers/SwitcherTwo";
import TableOne from "../../../components/Tables/TableOne";
import TableThree from "../../../components/Tables/TableThree";
import TableTwo from "../../../components/Tables/TableTwo";
import Chart from "../../Chart";
import FormElements from "../../Form/FormElements";
import Profile from "../../Profile";
import Tables from "../../Tables";
import Alerts from "../../UiElements/Alerts";
import Buttons from "../../UiElements/Buttons";



const ComponentLibrary = () => {

useEffect(()=>{},[


]);


  return (
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
            <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
            Component Library
              </h2>


              <div className="main-content h-100 w-full flex flex-col gap-4">
              <DropdownDefault></DropdownDefault>
              <DropdownMessage></DropdownMessage>
              <DropdownNotification></DropdownNotification>
              <DropdownUser></DropdownUser>
              
              <SelectGroupTwo></SelectGroupTwo>
              <CheckboxOne></CheckboxOne>
              <CheckboxTwo></CheckboxTwo>
              <CheckboxThree></CheckboxThree>
              <CheckboxFour></CheckboxFour>
              <CheckboxFive></CheckboxFive>
              <MapOne></MapOne>
              <SwitcherOne></SwitcherOne>
              <SwitcherTwo></SwitcherTwo>
              <SwitcherThree></SwitcherThree>
              <SwitcherFour value></SwitcherFour>
              <TableOne></TableOne>
              <TableTwo></TableTwo>
              <TableThree></TableThree>
              <Calendar></Calendar>
              <Profile></Profile>
              <FormElements></FormElements>
            
              <Tables></Tables>
              <Settings></Settings>
              <Chart></Chart>
              <Alerts></Alerts>
              <Buttons></Buttons>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ComponentLibrary;
