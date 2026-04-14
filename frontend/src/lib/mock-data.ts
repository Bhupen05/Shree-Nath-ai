export const salesTrend = [
  { day: "Day 1", sales: 12000 },
  { day: "Day 5", sales: 18000 },
  { day: "Day 10", sales: 15500 },
  { day: "Day 15", sales: 22000 },
  { day: "Day 20", sales: 19800 },
  { day: "Day 25", sales: 24000 },
  { day: "Day 30", sales: 26500 }
];

export const roleMatrix = [
  { permission: "View Dashboard & KPIs", Admin: "Y", Manager: "Y", Billing: "Y", Warehouse: "Y" },
  { permission: "Add / Edit Products", Admin: "Y", Manager: "Y", Billing: "N", Warehouse: "N" },
  { permission: "Add Stock (IN)", Admin: "Y", Manager: "Y", Billing: "N", Warehouse: "Y" },
  { permission: "Create Sales Bills", Admin: "Y", Manager: "Y", Billing: "Y", Warehouse: "N" },
  { permission: "Manage Employees", Admin: "Y", Manager: "N", Billing: "N", Warehouse: "N" },
  { permission: "View Activity Logs", Admin: "Y", Manager: "Y", Billing: "N", Warehouse: "N" }
];

export const reminderSchedule = [
  { trigger: "Due date - 3 days", channel: "WhatsApp + Email", note: "Advance reminder at 10 AM" },
  { trigger: "Due date", channel: "SMS + WhatsApp", note: "Payment due today at 9 AM" },
  { trigger: "Due date + 1 day", channel: "SMS + Email", note: "Overdue notice at 10 AM" },
  { trigger: "Due date + 7 days", channel: "WhatsApp + Email", note: "Final overdue notice" }
];
