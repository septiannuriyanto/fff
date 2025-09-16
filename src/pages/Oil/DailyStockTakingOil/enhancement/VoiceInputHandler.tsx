// components/voice/VoiceInputHandler.tsx
import React, { useEffect } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { parseWithOpenRouter } from "./parseWithOpenRouter";
import { fallbackParser } from "./fallbackParser";

interface Props {
  onParsed: (value: { tank?: string | null; material?: string | null; tinggi?: number | null; raw: string }) => void;
}

const VoiceInputHandler: React.FC<Props> = ({ onParsed }) => {
  const { transcript, listening, setListening } = useSpeechRecognition();

  useEffect(() => {
    const processText = async () => {
      if (!transcript) return;
      const result = await parseWithOpenRouter(transcript);
      const final = result ?? fallbackParser(transcript);
      onParsed({ ...final, raw: transcript });
    };
    processText();
  }, [transcript]);

  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={() => setListening(!listening)}
        className={`px-3 py-1 rounded ${listening ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}
      >
        {listening ? "Stop Voice" : "Start Voice"}
      </button>
      <span className="text-sm text-gray-600">{transcript}</span>
    </div>
  );
};

export default VoiceInputHandler;
