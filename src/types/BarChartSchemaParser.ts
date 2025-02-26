
function parseBarChartSchemaToEgi(jsonData: any[]): BarChartSchema[] {
    return jsonData.map((item): BarChartSchema => {
      return {
        desc: item.egi,
        plan_fc: parseFloat(item.plan_fc),
        actual_fc: parseFloat(item.actual_fc),
      };
    });
  }

  function parseBarChartSchemaToCn(jsonData: any[]): BarChartSchema[] {
    return jsonData.map((item): BarChartSchema => {
      return {
        desc: item.cn,
        plan_fc: parseFloat(item.plan_fc),
        actual_fc: parseFloat(item.actual_fc),
      };
    });
  }

  function parseBarChartSchemaToDate(jsonData: any[]): BarChartSchema[] {
    return jsonData.map((item): BarChartSchema => {
      return {
        desc: item.date,
        plan_fc: parseFloat(item.plan_fc),
        actual_fc: parseFloat(item.actual_fc),
      };
    });
  }


  export { parseBarChartSchemaToEgi, parseBarChartSchemaToCn,parseBarChartSchemaToDate }