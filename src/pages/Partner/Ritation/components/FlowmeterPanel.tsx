import React from "react";
import ReusableSwitcher from "../../../../components/Switchers/SwitcherFour";

interface FlowmeterPanelProps {
  flowmeterBefore: string;
  flowmeterAfter: string;
  useDekaliter: boolean;
  onChange: (
    field: "flowmeterBefore" | "flowmeterAfter" | "useDekaliter",
    value: string | boolean
  ) => void;
}

// helper untuk format angka ke format Indonesia
const formatIDNumber = (num: number) => {
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const FlowmeterPanel: React.FC<FlowmeterPanelProps> = ({
  flowmeterBefore,
  flowmeterAfter,
  useDekaliter,
  onChange,
}) => {
  const before = Number(flowmeterBefore);
  const after = Number(flowmeterAfter);

  const bothFilled =
    flowmeterBefore !== "" &&
    flowmeterAfter !== "" &&
    !isNaN(before) &&
    !isNaN(after);

  const diff = after - before;

  return (
    <div className="border rounded p-4">
      <h3 className="text-center font-bold mb-2">Flowmeter</h3>

      <div className="flex justify-center mb-4">
        <ReusableSwitcher
          textTrue="Dekaliter"
          textFalse="Liter"
          onChange={(state: boolean) => onChange("useDekaliter", state)}
          value={useDekaliter}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">Flowmeter Before</label>
          <input
            type="number"
            value={flowmeterBefore}
            onChange={(e) => onChange("flowmeterBefore", e.target.value)}
            className="border rounded p-2 w-full"
          />
        </div>
        <div>
          <label className="block mb-1">Flowmeter After</label>
          <input
            type="number"
            value={flowmeterAfter}
            onChange={(e) => onChange("flowmeterAfter", e.target.value)}
            className="border rounded p-2 w-full"
          />
        </div>
      </div>

      {bothFilled && (
        <div
          className={`mt-4 text-center font-bold text-xl ${
            diff < 0 ? "text-red-600" : "text-green-600"
          }`}
        >
          Selisih: {formatIDNumber(diff)}
          {useDekaliter ? " DL" : " L"}
        </div>
      )}
    </div>
  );
};

export default FlowmeterPanel;
