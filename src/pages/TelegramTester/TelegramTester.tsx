
import TelegramSendTextTester from './components/TelegramTextTesterForm';
import TelegramSendImageTester from './components/TelegramImageTesterForm';

const TelegramTester = () => {
  return (
    <div className="flex flex-col gap-10">
      <h1>Telegram Tester</h1>
      <TelegramSendTextTester />
      <TelegramSendImageTester/>
    </div>
  );
};

export default TelegramTester;
