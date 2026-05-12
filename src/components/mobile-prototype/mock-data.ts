export type Tone = "blue" | "orange" | "green" | "purple" | "red" | "pink";
export type StatIconName =
  | "badge-check"
  | "box"
  | "briefcase"
  | "clock"
  | "dollar"
  | "package-check"
  | "truck"
  | "x-circle";

export interface MobileStat {
  label: string;
  value: string;
  helper: string;
  tone: Tone;
  iconName: StatIconName;
}

export interface ProductLine {
  name: string;
  detail: string;
  amount?: string;
  image?: string;
  tone?: Tone;
}

export interface CustomerOrder {
  id: string;
  store: string;
  items: string;
  time: string;
  amount: string;
  payment: string;
  status: "Pending" | "Confirmed" | "In Transit" | "Delivered";
  products: ProductLine[];
  primaryAction: string;
}

export interface DeliveryItem {
  id: string;
  store: string;
  items: string;
  amount: string;
  status: "Pending" | "In Transit" | "Completed" | "Failed";
  statusText: string;
  time: string;
  driver: string;
  rating: string;
  eta?: string;
}

export const dashboardStats: MobileStat[] = [
  {
    label: "New Orders",
    value: "24",
    helper: "18% vs last week",
    tone: "blue",
    iconName: "briefcase",
  },
  {
    label: "Pending Deliveries",
    value: "8",
    helper: "12% vs last week",
    tone: "green",
    iconName: "truck",
  },
  {
    label: "Low Stock",
    value: "12",
    helper: "View items",
    tone: "orange",
    iconName: "box",
  },
];

export const topProducts: ProductLine[] = [
  {
    name: "Biscuit Pack",
    detail: "54 packs",
    amount: "$4.23K",
    tone: "orange",
  },
  {
    name: "Soft Drinks",
    detail: "24 bottles",
    amount: "$18.00",
    image: "/product-icons/fanta-orange-50cl.webp",
    tone: "red",
  },
  {
    name: "Cooking Oil",
    detail: "5L",
    amount: "$18.00",
    tone: "orange",
  },
];

export const lowStockAlerts: ProductLine[] = [
  { name: "Rice 5kg", detail: "8 Left", tone: "orange" },
  { name: "Corn Flakes", detail: "12 Left", tone: "orange" },
  { name: "Sugar 2kg", detail: "6 Left", tone: "blue" },
];

export const orderStats: MobileStat[] = [
  { label: "Pending", value: "12", helper: "20% vs last week", tone: "orange", iconName: "clock" },
  { label: "Confirmed", value: "18", helper: "12% vs last week", tone: "green", iconName: "badge-check" },
  { label: "In Transit", value: "7", helper: "8% vs last week", tone: "blue", iconName: "truck" },
  { label: "Delivered", value: "24", helper: "15% vs last week", tone: "purple", iconName: "package-check" },
];

export const customerOrders: CustomerOrder[] = [
  {
    id: "#3291",
    store: "Mama Kada Store",
    items: "2 items",
    time: "Today, 09:42",
    amount: "$86.50",
    payment: "Cash on Delivery",
    status: "Pending",
    products: [
      { name: "Coca-Cola Case", detail: "Case", image: "/product-icons/fanta-orange-50cl.webp" },
      { name: "Rice 5kg", detail: "Bag", tone: "orange" },
    ],
    primaryAction: "Confirm Order",
  },
  {
    id: "#3287",
    store: "Kwetu Butik",
    items: "3 items",
    time: "Today, 08:10",
    amount: "$124.00",
    payment: "Paid Online",
    status: "Confirmed",
    products: [
      { name: "Sardines Cans", detail: "Cans", tone: "red" },
      { name: "Cooking Oil", detail: "Oil", tone: "orange" },
    ],
    primaryAction: "Prepare Order",
  },
  {
    id: "#3279",
    store: "Kimia Mart",
    items: "2 items",
    time: "Yesterday, 18:25",
    amount: "$65.50",
    payment: "Paid Online",
    status: "In Transit",
    products: [
      { name: "Washing Powder", detail: "Pack", tone: "blue" },
      { name: "Sugar 2kg", detail: "Bag", tone: "blue" },
    ],
    primaryAction: "Track Order",
  },
  {
    id: "#3272",
    store: "Patrice Mini Market",
    items: "4 items",
    time: "Yesterday, 14:03",
    amount: "$42.75",
    payment: "Cash on Delivery",
    status: "Delivered",
    products: [
      { name: "Soft Drinks", detail: "Bottles", image: "/product-icons/fanta-orange-50cl.webp" },
      { name: "Biscuit Pack", detail: "Pack", tone: "orange" },
    ],
    primaryAction: "Completed",
  },
];

export const deliveryStats: MobileStat[] = [
  { label: "Pending", value: "15", helper: "Awaiting pickup", tone: "orange", iconName: "box" },
  { label: "In Transit", value: "8", helper: "On the way", tone: "blue", iconName: "truck" },
  { label: "Completed", value: "32", helper: "This week", tone: "green", iconName: "badge-check" },
  { label: "Failed", value: "2", helper: "This week", tone: "pink", iconName: "x-circle" },
];

export const deliveries: DeliveryItem[] = [
  {
    id: "#3291",
    store: "Mama Kada Store",
    items: "2 items",
    amount: "$86.50",
    status: "Pending",
    statusText: "Awaiting Pickup",
    time: "Today, 09:42",
    driver: "Driver Paul",
    rating: "4.8",
  },
  {
    id: "#3287",
    store: "Kwetu Butik",
    items: "3 items",
    amount: "$124.00",
    status: "In Transit",
    statusText: "On the Way",
    time: "Today, 08:10",
    driver: "Driver Sarah",
    rating: "4.9",
    eta: "15 mins",
  },
  {
    id: "#3279",
    store: "Kimia Mart",
    items: "2 items",
    amount: "$65.50",
    status: "In Transit",
    statusText: "On the Way",
    time: "Yesterday, 18:25",
    driver: "Driver Ali",
    rating: "4.7",
    eta: "30 mins",
  },
  {
    id: "#3272",
    store: "Patrice Mini Market",
    items: "4 items",
    amount: "$42.75",
    status: "Completed",
    statusText: "Delivered",
    time: "Yesterday, 14:03",
    driver: "Driver John",
    rating: "5.0",
  },
  {
    id: "#3265",
    store: "Tosha Store",
    items: "1 item",
    amount: "$28.00",
    status: "Failed",
    statusText: "Delivery Failed",
    time: "Yesterday, 10:11",
    driver: "Driver Mike",
    rating: "4.2",
  },
];
