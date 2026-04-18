import React from 'react';
import toast from 'react-hot-toast';
import { TbSend } from 'react-icons/tb';
import { useTheme } from '../contexts/ThemeContext';
import { sendMessageToTopic, botToken, superGroupId, sendTelegramMessageViaEdgeFunction } from '../services/TelegramSender';
import { threadIds } from '../pages/TelegramTester/components/TelegramData';

interface TelegramTestButtonProps {
  contextName?: string;
  className?: string;
}

const TelegramTestButton: React.FC<TelegramTestButtonProps> = ({ contextName = 'Unknown', className = '' }) => {
  const { activeTheme } = useTheme();
  const secondaryButtonTheme = activeTheme.button.secondary;
  const tertiaryButtonTheme = activeTheme.button.tertiary;

  const getParams = () => {
    let activeBotToken = botToken;
    let targetChatId = superGroupId;

    if (!activeBotToken) {
      activeBotToken = prompt('VITE_TELEGRAM_BOT_API tidak ditemukan. Masukkan Bot Token Anda:') || '';
    }
    
    if (!targetChatId) {
      targetChatId = prompt('VITE_TELE_FFF_GROUP_ID tidak ditemukan. Masukkan Chat ID / Group ID (e.g. -100xxx):') || '';
    }

    const threadListMsg = threadIds
      .filter(t => t.name)
      .map(t => `${t.id}: ${t.name}`)
      .join('\n');

    const threadId = prompt(`PILIH TOPIK (Masukkan Angka ID):\n\n${threadListMsg}\n\nBiarkan kosong untuk General/ID 1:`, '1') || '1';

    return { activeBotToken, targetChatId, threadId };
  };

  const handleTestDirect = async () => {
    const { activeBotToken, targetChatId, threadId } = getParams();
    if (!activeBotToken || !targetChatId) return;

    try {
      toast.loading('Testing Direct FE...', { id: 'tele-test' });
      await sendMessageToTopic(
        `🔋 *TEST DIRECT FE*\nContext: ${contextName}\nTime: ${new Date().toLocaleString()}`,
        activeBotToken,
        targetChatId,
        threadId
      );
      toast.success('Direct message sent!', { id: 'tele-test' });
    } catch (error) {
      toast.error(`Direct Failed: ${(error as Error).message}`, { id: 'tele-test' });
    }
  };

  const handleTestEdge = async () => {
    const { threadId } = getParams(); // Only need threadId for Edge (chatId is in server secret)
    if (!threadId) return;

    try {
      toast.loading('Testing Via Edge...', { id: 'tele-test' });
      const result = await sendTelegramMessageViaEdgeFunction(
        `🚀 *TEST VIA EDGE*\nContext: ${contextName}\nTime: ${new Date().toLocaleString()}`,
        threadId
      );
      if (result.success) {
        toast.success('Edge message sent!', { id: 'tele-test' });
      } else {
        toast.error(`Edge Failed: ${result.error}`, { id: 'tele-test' });
      }
    } catch (error) {
      toast.error(`Edge Failed: ${(error as Error).message}`, { id: 'tele-test' });
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleTestDirect}
        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-opacity"
        style={{
          backgroundColor: tertiaryButtonTheme.color,
          color: tertiaryButtonTheme.textColor,
          borderRadius: tertiaryButtonTheme.borderRadius,
          border: `${tertiaryButtonTheme.borderWidth} ${tertiaryButtonTheme.border} ${tertiaryButtonTheme.borderColor}`,
        }}
      >
        <TbSend size={14} />
        Test Direct
      </button>

      <button
        type="button"
        onClick={handleTestEdge}
        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-opacity"
        style={{
          backgroundColor: secondaryButtonTheme.color,
          color: secondaryButtonTheme.textColor,
          borderRadius: secondaryButtonTheme.borderRadius,
          border: `${secondaryButtonTheme.borderWidth} ${secondaryButtonTheme.border} ${secondaryButtonTheme.borderColor}`,
        }}
      >
        <TbSend size={14} />
        Test Edge
      </button>
    </div>
  );
};

export default TelegramTestButton;
