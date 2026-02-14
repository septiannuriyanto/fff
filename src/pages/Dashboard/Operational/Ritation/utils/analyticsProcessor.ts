import { formatDateForSupabase } from "../../../../../Utils/DateUtility";

export const processAnalytics = (
  analytics: any,
  selectedDate: Date,
  planQty: number
) => {
  const { daily_actuals, daily_reconciles, last_ritation_date } = analytics;

  const daysInMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
    0
  ).getDate();

  const allDates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    allDates.push(
      formatDateForSupabase(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d)
      ) || ""
    );
  }

  const actualMap: Record<string, number> = {};
  const reconcileMap: Record<string, number> = {};

  allDates.forEach((d) => {
    actualMap[d] = 0;
    reconcileMap[d] = 0;
  });

  daily_actuals?.forEach((i: any) => {
    actualMap[i.date.split("T")[0]] = i.qty;
  });

  daily_reconciles?.forEach((i: any) => {
    reconcileMap[i.date.split("T")[0]] = i.qty;
  });

  return {
    actualMap,
    reconcileMap,
    lastDate: last_ritation_date,
  };
};
