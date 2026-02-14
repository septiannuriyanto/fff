import { useEffect, useState } from "react";
import { supabase } from "../../../../../db/SupabaseClient";

export const useRitationMonthly = (monthPeriod: string) => {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);

  const fetchMonthly = async () => {
    if (!monthPeriod) return;

    setLoading(true);

    const [year, month] = monthPeriod.split("-");
    const periodNum = parseInt(`${year}${month}`);
    const prefix = `G${(parseInt(year) % 100)
      .toString()
      .padStart(2, "0")}${month}%`;

    const { data, error } = await supabase.rpc(
      "rpc_get_ritation_dashboard_analytics",
      {
        p_prefix: prefix,
        p_period: periodNum,
      }
    );

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setAnalytics(data);

    const avg = data.total_actual_qty / (data.total_actual_count || 1);

    setMetrics({
      avgRitasiPerDay: avg,
      progress:
        (data.total_actual_qty / (data.plan_qty || 1)) * 100,
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchMonthly();
  }, [monthPeriod]);

  return { analytics, metrics, loading, refetch: fetchMonthly };
};
