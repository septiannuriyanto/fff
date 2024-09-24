const sendTelegramNotification = async (message:string) => {
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_API;
    const chatId = import.meta.env.VITE_TELEGRAM_CHANNEL_ID; // Or use the chat ID if it's private
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

  export { sendTelegramNotification, sendMessageToChannel }
  