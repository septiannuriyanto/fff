import React from 'react';
import formatIDNumber from '../functions/formatIdNumber';

interface SummaryPanelProps {
  unit?: string;
  operator?: string;
  fuelman?: string;
  beforeRear?: number;
  beforeFront?: number;
  afterRear?: number;
  afterFront?: number;
  flowmeterBefore?: number;
  flowmeterAfter?: number;
  qtyTeraBefore?: number;
  qtyTeraAfter?: number;
  qtyByTera?: number;
  qtyByFlowmeter?: number;
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({
  unit,
  operator,
  fuelman,
  beforeRear = 0,
  beforeFront = 0,
  afterRear = 0,
  afterFront = 0,
  flowmeterBefore = 0,
  flowmeterAfter = 0,
  qtyTeraBefore = 0,
  qtyTeraAfter = 0,
}) => {
  const teraBeforeAvg = (beforeRear + beforeFront) / 2;
  const teraAfterAvg = (afterRear + afterFront) / 2;

  const qtyByTera = qtyTeraAfter - qtyTeraBefore;
  const qtyByFlowmeter = flowmeterAfter - flowmeterBefore;

  return (
    <div className="my-4 p-4 border rounded bg-gray-50 dark:bg-gray-800 mb-4 grid grid-cols-2 gap-4">
        <h3 className="col-span-2 text-center font-bold mb-2">Summary</h3>
      {/* Unit / Operator / Fuelman */}
      <div>
        <h4 className="font-bold mb-1">Unit / Operator / Fuelman</h4>
        <p>Unit : {unit || '-'}</p>
        <p>Operator : {operator || '-'}</p>
        <p>Fuelman : {fuelman || '-'}</p>
      </div>

      {/* Before */}
      <div>
        <h4 className="font-bold mb-1">Before</h4>
        <p>Tera Belakang : {beforeRear}</p>
        <p>Tera Depan : {beforeFront}</p>
        <p>Tera Avg : {teraBeforeAvg}</p>
      </div>

      {/* After */}
      <div>
        <h4 className="font-bold mb-1">After</h4>
        <p>Tera Belakang : {afterRear}</p>
        <p>Tera Depan : {afterFront}</p>
        <p>Tera Avg : {teraAfterAvg}</p>
      </div>

      {/* Result */}
      <div>
        <h4 className="font-bold mb-1">Result</h4>
        <p>Qty By Tera : {formatIDNumber(qtyByTera)} L</p>
        <p>Qty By Flowmeter : {formatIDNumber(qtyByFlowmeter * 10)} L</p>
      </div>
    </div>
  );
};

export default SummaryPanel;
