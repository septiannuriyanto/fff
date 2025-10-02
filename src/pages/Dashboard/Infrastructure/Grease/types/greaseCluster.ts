export interface GreaseCluster {
  id: string;
  name: string;
  description?: string;
  view_queue: string;
  sends: string;    // atau bisa string[] kalau nanti diubah jadi array
  receives: string; // atau string[] kalau nanti diubah jadi array
}