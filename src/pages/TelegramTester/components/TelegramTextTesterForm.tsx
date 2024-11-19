import { useState } from "react";
import { sendMessageToTopic } from "../../../services/TelegramSender";

const TelegramSendTextTester = () => {

    const [botId, setBotId] = useState('');
    const [chatId, setChatId] = useState('');
    const [threadId, setThreadId] = useState('');
    const [testMessage, setTestMessage] = useState('');

    const handleChangeBotId=(e:any)=>{
        setBotId(e.target.value);
    }
    
    const handleChangeChatId=(e:any)=>{
        setChatId(e.target.value);
    }
    
    const handleChangethreadId=(e:any)=>{
        setThreadId(e.target.value);
    }
    
    const handleChangeTestMessage=(e:any)=>{
        setTestMessage(e.target.value);
    }

    const handleTriggerMessage = (e:any) => {
        e.preventDefault();
        sendMessageToTopic(testMessage,botId,chatId,threadId)
    }


    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
          <h3 className="font-medium text-black dark:text-white">Text Tester Form</h3>
        </div>
        <form onSubmit={handleTriggerMessage}>
          <div className="p-6.5">
            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">Bot ID</label>
              <input
                onChange={handleChangeBotId}
                type="text"
                placeholder="Bot id"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
  
            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">Chat Id</label>
              <input
              onChange={handleChangeChatId}
                type="text"
                placeholder="Chat Id"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">Thread Id</label>
              <input
              onChange={handleChangethreadId}
                type="text"
                placeholder="Thread Id"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
  
            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">Test Message</label>
              <input
                onChange={handleChangeTestMessage}
                type="text"
                placeholder="Test Message"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
  
            <button type="submit" className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90">
              Send Trigger
            </button>
          </div>
        </form>
      </div>
    );
  };
  
  export default TelegramSendTextTester;
  