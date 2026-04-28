import type { IconName } from '../components/ui/Icon';

export type ServiceCategory = {
  id: string;
  title: string;
  icon: IconName;
  /** Shown in category grid (Figma: “20 Services”). Replace with API later. */
  serviceCount: number;
};

/** Aligned with [Figma Categories](https://www.figma.com/design/Br4iCmOl4V6OpiGulF8h0Y/LocalLoom?node-id=53-2136) — icon, name, services count. */
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 'plumber', title: 'Plumber', icon: 'work', serviceCount: 20 },
  { id: 'electrician', title: 'Electrician', icon: 'flash', serviceCount: 22 },
  { id: 'ac_repair', title: 'AC Repair', icon: 'time-04', serviceCount: 18 },
  { id: 'services', title: 'Services', icon: 'dashboard-square-02', serviceCount: 24 },
  { id: 'automotive', title: 'Automotive', icon: 'motorbike-02', serviceCount: 16 },
  { id: 'mens_salon', title: "Men's Salon", icon: 'user-03', serviceCount: 20 },
  { id: 'carpenter', title: 'Carpenter', icon: 'pencil-edit-02', serviceCount: 14 },
  { id: 'cleaner', title: 'Cleaner', icon: 'album-02', serviceCount: 19 },
  { id: 'painter', title: 'Painter', icon: 'align-box-top-left', serviceCount: 21 },
];

export function getCategoryById(id: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((c) => c.id === id);
}
