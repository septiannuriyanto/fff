
const botToken = import.meta.env.VITE_TELEGRAM_BOT_API;
const superGroupId = import.meta.env.VITE_TELE_FFF_GROUP_ID; // Or use the chat ID if it's private
const chatId = import.meta.env.VITE_TELEGRAM_CHANNEL_ID; // Or use the chat ID if it's private


const sendTelegramNotification = async (message:string) => {

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Error sending message: ${response.statusText}`);
      }
  
      console.log('Notification sent successfully');
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };


  const sendMessageToChannel = async (message:any) => {
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_API;
    const chatId = import.meta.env.VITE_TELEGRAM_CHANNEL_ID; // Or use the chat ID if it's private
  
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
    const params = {
      chat_id: chatId,
      text: message,
    };
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
  
      const data = await response.json();
  
      if (!data.ok) {
        throw new Error(`Error sending message: ${data.description}`);
      }
  
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const sendMessageToTopic = async (message: string, botToken:string, chatId:string, threadId:string) => {
    
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
    const params = {
      chat_id: chatId,
      message_thread_id: threadId,
      text: message,
    };
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
  
      const data = await response.json();
  
      if (!data.ok) {
        throw new Error(`Error sending message: ${data.description}`);
      }
  
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error:', error);
    }
  };


  const sendImageToTopic = async (imageUrl: string, caption: string, botToken:string, chatId:string, threadId:string) => {

  
    const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  
    const params = {
      chat_id: chatId,
      message_thread_id: threadId,
      photo: imageUrl, // URL of the image or a file_id if previously uploaded
      caption: caption, // Optional caption for the image
    };
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
  
      const data = await response.json();
  
      if (!data.ok) {
        throw new Error(`Error sending image: ${data.description}`);
      }
  
      console.log('Image sent successfully');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const sendImageToTopicWithFormData = async (imageFile: File, caption: string, botToken:string, chatId:string, threadId:string) => {
    const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  
    // Create a new FormData instance
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('message_thread_id', threadId); // Optional for topic-specific messages
    formData.append('photo', imageFile); // The image file itself
    formData.append('caption', caption); // Optional caption
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData, // No need for headers, fetch automatically sets them for FormData
      });
  
      const data = await response.json();
  
      if (!data.ok) {
        throw new Error(`Error sending image: ${data.description}`);
      }
  
      console.log('Image sent successfully');
    } catch (error) {
      console.error('Error:', error);
    }


    //sample of usage
    // const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    //   const file = event.target.files?.[0];
    //   if (file) {
    //     await sendImageToTopicWithFormData(file, 'Here is an image for the topic!');
    //   }
    // };
  };
  
  
  

  export { sendTelegramNotification, sendMessageToChannel, sendMessageToTopic , sendImageToTopic, sendImageToTopicWithFormData, botToken, chatId, superGroupId}
  