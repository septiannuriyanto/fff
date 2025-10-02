import React from "react";

interface ExclusiveWidgetProps {
  onAddTank?: () => void;
  onAddCluster?: () => void;
  onAddConsumer?: () => void;
}

const ControlButtons: React.FC<ExclusiveWidgetProps> = ({
  onAddTank,
  onAddCluster,
  onAddConsumer,
}) => {
  return (
    <div className="flex justify-end gap-2 mb-4">
      <button
        onClick={onAddTank}
        className="border border-blue-500 text-blue-500 px-3 py-1 rounded hover:bg-blue-50"
      >
        + Add Grease Tank
      </button>
      <button
        onClick={onAddCluster}
        className="border border-green-500 text-green-500 px-3 py-1 rounded hover:bg-green-50"
      >
        + Add Cluster
      </button>
      <button
        onClick={onAddConsumer}
        className="border border-purple-500 text-purple-500 px-3 py-1 rounded hover:bg-purple-50"
      >
        + Add Consumer Unit
      </button>
    </div>
  );
};

export default ControlButtons;
