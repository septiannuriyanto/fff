import { useEffect } from "react";
import SelectGroupOne from "../../components/Forms/SelectGroup/SelectGroupOne";
import SelectGroupTwo from "../../components/Forms/SelectGroup/SelectGroupTwo";
import CheckboxOne from "../../components/Checkboxes/CheckboxOne";
import CheckboxTwo from "../../components/Checkboxes/CheckboxTwo";
import CheckboxThree from "../../components/Checkboxes/CheckboxThree";
import CheckboxFour from "../../components/Checkboxes/CheckboxFour";
import CheckboxFive from "../../components/Checkboxes/CheckboxFive";
import MapOne from "../../components/Maps/MapOne";
import SwitcherOne from "../../components/Switchers/SwitcherOne";
import SwitcherTwo from "../../components/Switchers/SwitcherTwo";
import SwitcherFour from "../../components/Switchers/SwitcherFour";
import SwitcherThree from "../../components/Switchers/SwitcherThree";
import TableOne from "../../components/Tables/TableOne";
import TableThree from "../../components/Tables/TableThree";
import TableTwo from "../../components/Tables/TableTwo";
import Calendar from "../Calendar";
import Profile from "../Profile";
import FormElements from "../Form/FormElements";
import FormLayout from "../Form/FormLayout";
import Tables from "../Tables";
import Settings from "../Settings";
import Chart from "../Chart";
import Alerts from "../UiElements/Alerts";
import Buttons from "../UiElements/Buttons";
import DropdownDefault from 
"../../components/Dropdowns/DropdownDefault";
import DropdownMessage from "../../components/Header/DropdownMessage";
import DropdownNotification from "../../components/Header/DropdownNotification";
import DropdownUser from "../../components/Header/DropdownUser";


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
              <SwitcherFour></SwitcherFour>
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
