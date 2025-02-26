import { useState } from "react";
import { sendImageToTopicWithFormData, sendMessageToTopic } from "../../../services/TelegramSender";
import DropZone from "../../../components/DropZones/DropZone";

const TelegramSendImageTester = () => {

    const [botId, setBotId] = useState('');
    const [chatId, setChatId] = useState('');
    const [threadId, setThreadId] = useState('');
    const [imageCaption, setImageCaption] = useState('');
    const [testImage, setTestImage] = useState<File | null>(
      null,
    );

    const handleChangeBotId=(e:any)=>{
        setBotId(e.target.value);
    }
    
    const handleChangeChatId=(e:any)=>{
        setChatId(e.target.value);
    }
    
    const handleChangethreadId=(e:any)=>{
        setThreadId(e.target.value);
    }
    
    const handleChangeImageCaption=(e:any)=>{
      setImageCaption(e.target.value);
    }

    const handleUploadImage = async (file: File)=>{
          setTestImage(file);
    }

    const handleTriggerMessage = async(e:any) => {
      e.preventDefault();
      await sendImageToTopicWithFormData(testImage!, imageCaption, botId, chatId, threadId);
  }



      // const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    //   const file = event.target.files?.[0];
    //   if (file) {
    //     await sendImageToTopicWithFormData(file, 'Here is an image for the topic!');
    //   }
    // };

    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
          <h3 className="font-medium text-black dark:text-white">Image Tester Form</h3>
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

            <div className="py-8">
            {testImage ? (
                <div className="file-preview1">
                  <h2>Uploaded File:</h2>
                  <div className="upload-image-container relative">
                    {' '}
                    {/* Add relative positioning here */}

                    <img
                      src={URL.createObjectURL(testImage)}
                      alt="Flowmeter Before"
                      className="upload-image h-32 w-32 object-contain bg-slate-700 mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <DropZone
                    title="Upload Test Image"
                    id="testImage"
                    onFileUpload={handleUploadImage}
                  />
                </div>
              )}
            </div>
  
            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">Image Caption</label>
              <input
                onChange={handleChangeImageCaption}
                type="text"
                placeholder="Image Caption"
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
  
  export default TelegramSendImageTester;
  