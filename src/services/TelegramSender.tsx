const sendTelegramNotification = async (message:string) => {
    const botToken = '7123885507:AAGr1FsbwtIicTZRfiU7F8mMtwjbazs3ESQ';
    const chatId = 'YOUR_CHAT_ID';
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
    const botToken = '7123885507:AAGr1FsbwtIicTZRfiU7F8mMtwjbazs3ESQ';
    const chatId = '@fffprojectbrcg'; // Or use the chat ID if it's private
  
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
  