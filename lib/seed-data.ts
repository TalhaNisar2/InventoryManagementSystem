import { Category, Product, Supplier, Transaction } from "./types";

export const seedCategories: Category[] = [
  { id: "cat-electronics", name: "Electronics", description: "Cables, peripherals, and small electronics", color: "#C97A24" },
  { id: "cat-office", name: "Office Supplies", description: "Stationery and desk essentials", color: "#1F9D6C" },
  { id: "cat-packaging", name: "Packaging & Shipping", description: "Boxes, tape, and mailers", color: "#3B6EA5" },
  { id: "cat-furniture", name: "Furniture", description: "Desks, chairs, and storage units", color: "#8A5518" },
  { id: "cat-tools", name: "Tools & Hardware", description: "Hand tools and fixings", color: "#B4860B" },
  { id: "cat-cleaning", name: "Cleaning Supplies", description: "Facility and janitorial stock", color: "#6B7080" },
];

export const seedSuppliers: Supplier[] = [
  { id: "sup-northline", name: "Northline Distribution", contactName: "Priya Kaur", email: "priya@northline.co", phone: "+1 (312) 555-0148", address: "4400 Freight Rd, Chicago, IL", leadTimeDays: 5 },
  { id: "sup-harborgoods", name: "Harbor Goods Co.", contactName: "Marcus Webb", email: "marcus@harborgoods.com", phone: "+1 (206) 555-0173", address: "12 Pier Avenue, Seattle, WA", leadTimeDays: 8 },
  { id: "sup-atlas", name: "Atlas Supply Partners", contactName: "Elena Rossi", email: "elena@atlassupply.com", phone: "+1 (404) 555-0129", address: "890 Commerce Blvd, Atlanta, GA", leadTimeDays: 4 },
  { id: "sup-primefab", name: "PrimeFab Industrial", contactName: "Tomás Alvarez", email: "tomas@primefab.io", phone: "+1 (713) 555-0192", address: "77 Foundry St, Houston, TX", leadTimeDays: 10 },
  { id: "sup-brightpack", name: "Brightpack Materials", contactName: "Sana Malik", email: "sana@brightpack.com", phone: "+1 (615) 555-0116", address: "230 Industrial Loop, Nashville, TN", leadTimeDays: 6 },
];

export const seedProducts: Product[] = [
  { id: "p-001", sku: "ELX-1001", name: "USB-C Braided Cable 6ft", categoryId: "cat-electronics", supplierId: "sup-northline", unit: "pcs", costPrice: 3.2, sellPrice: 8.99, quantity: 412, totalReceived: 412, reorderLevel: 120, location: "A1-03", createdAt: "2026-04-12" },
  { id: "p-002", sku: "ELX-1002", name: "Wireless Mouse M2", categoryId: "cat-electronics", supplierId: "sup-northline", unit: "pcs", costPrice: 6.5, sellPrice: 16.5, quantity: 58, totalReceived: 58, reorderLevel: 75, location: "A1-07", createdAt: "2026-04-12" },
  { id: "p-003", sku: "ELX-1003", name: "65W GaN Charger", categoryId: "cat-electronics", supplierId: "sup-atlas", unit: "pcs", costPrice: 11.4, sellPrice: 27.99, quantity: 0, totalReceived: 0, reorderLevel: 60, location: "A1-11", createdAt: "2026-05-02" },
  { id: "p-004", sku: "ELX-1004", name: "Bluetooth Speaker Mini", categoryId: "cat-electronics", supplierId: "sup-atlas", unit: "pcs", costPrice: 9.8, sellPrice: 24.0, quantity: 143, totalReceived: 143, reorderLevel: 50, location: "A1-14", createdAt: "2026-05-02" },
  { id: "p-005", sku: "ELX-1005", name: "HDMI 2.1 Cable 2m", categoryId: "cat-electronics", supplierId: "sup-northline", unit: "pcs", costPrice: 2.9, sellPrice: 9.5, quantity: 267, totalReceived: 267, reorderLevel: 100, location: "A1-05", createdAt: "2026-03-20" },
  { id: "p-006", sku: "ELX-1006", name: "Webcam 1080p", categoryId: "cat-electronics", supplierId: "sup-atlas", unit: "pcs", costPrice: 14.2, sellPrice: 34.99, quantity: 21, totalReceived: 21, reorderLevel: 40, location: "A1-18", createdAt: "2026-06-01" },
  { id: "p-007", sku: "OFC-2001", name: "A4 Copy Paper Ream", categoryId: "cat-office", supplierId: "sup-brightpack", unit: "ream", costPrice: 3.1, sellPrice: 6.75, quantity: 890, totalReceived: 890, reorderLevel: 200, location: "B2-02", createdAt: "2026-02-14" },
  { id: "p-008", sku: "OFC-2002", name: "Gel Pens Assorted (12pk)", categoryId: "cat-office", supplierId: "sup-brightpack", unit: "pack", costPrice: 1.8, sellPrice: 4.5, quantity: 176, totalReceived: 176, reorderLevel: 80, location: "B2-05", createdAt: "2026-02-14" },
  { id: "p-009", sku: "OFC-2003", name: "Lever Arch Binder 3in", categoryId: "cat-office", supplierId: "sup-atlas", unit: "pcs", costPrice: 2.4, sellPrice: 5.99, quantity: 64, totalReceived: 64, reorderLevel: 70, location: "B2-08", createdAt: "2026-03-01" },
  { id: "p-010", sku: "OFC-2004", name: "Sticky Notes Cube", categoryId: "cat-office", supplierId: "sup-brightpack", unit: "pcs", costPrice: 1.1, sellPrice: 3.25, quantity: 312, totalReceived: 312, reorderLevel: 100, location: "B2-01", createdAt: "2026-02-14" },
  { id: "p-011", sku: "OFC-2005", name: "Desktop Stapler Heavy Duty", categoryId: "cat-office", supplierId: "sup-atlas", unit: "pcs", costPrice: 4.6, sellPrice: 11.0, quantity: 12, totalReceived: 12, reorderLevel: 30, location: "B2-11", createdAt: "2026-04-22" },
  { id: "p-012", sku: "PKG-3001", name: "Corrugated Box 12x12x12", categoryId: "cat-packaging", supplierId: "sup-brightpack", unit: "pcs", costPrice: 0.85, sellPrice: 2.1, quantity: 1240, totalReceived: 1240, reorderLevel: 300, location: "C1-01", createdAt: "2026-01-18" },
  { id: "p-013", sku: "PKG-3002", name: "Bubble Wrap Roll 100ft", categoryId: "cat-packaging", supplierId: "sup-brightpack", unit: "roll", costPrice: 9.2, sellPrice: 19.99, quantity: 38, totalReceived: 38, reorderLevel: 45, location: "C1-06", createdAt: "2026-01-18" },
  { id: "p-014", sku: "PKG-3003", name: "Packing Tape Clear (6pk)", categoryId: "cat-packaging", supplierId: "sup-harborgoods", unit: "pack", costPrice: 5.4, sellPrice: 12.5, quantity: 205, totalReceived: 205, reorderLevel: 90, location: "C1-03", createdAt: "2026-01-30" },
  { id: "p-015", sku: "PKG-3004", name: "Poly Mailer 10x13 (100pk)", categoryId: "cat-packaging", supplierId: "sup-harborgoods", unit: "pack", costPrice: 8.1, sellPrice: 17.25, quantity: 0, totalReceived: 0, reorderLevel: 40, location: "C1-09", createdAt: "2026-01-30" },
  { id: "p-016", sku: "FUR-4001", name: "Adjustable Standing Desk", categoryId: "cat-furniture", supplierId: "sup-primefab", unit: "pcs", costPrice: 142.0, sellPrice: 289.0, quantity: 9, totalReceived: 9, reorderLevel: 12, location: "D3-01", createdAt: "2026-05-15" },
  { id: "p-017", sku: "FUR-4002", name: "Ergonomic Task Chair", categoryId: "cat-furniture", supplierId: "sup-primefab", unit: "pcs", costPrice: 88.0, sellPrice: 179.0, quantity: 16, totalReceived: 16, reorderLevel: 15, location: "D3-04", createdAt: "2026-05-15" },
  { id: "p-018", sku: "FUR-4003", name: "3-Tier Storage Shelf", categoryId: "cat-furniture", supplierId: "sup-primefab", unit: "pcs", costPrice: 41.5, sellPrice: 89.0, quantity: 27, totalReceived: 27, reorderLevel: 20, location: "D3-08", createdAt: "2026-06-10" },
  { id: "p-019", sku: "TLS-5001", name: "Cordless Drill Driver 18V", categoryId: "cat-tools", supplierId: "sup-primefab", unit: "pcs", costPrice: 34.0, sellPrice: 74.99, quantity: 22, totalReceived: 22, reorderLevel: 18, location: "E2-02", createdAt: "2026-04-04" },
  { id: "p-020", sku: "TLS-5002", name: "Hex Key Set 26pc", categoryId: "cat-tools", supplierId: "sup-atlas", unit: "set", costPrice: 6.8, sellPrice: 15.99, quantity: 71, totalReceived: 71, reorderLevel: 35, location: "E2-05", createdAt: "2026-04-04" },
  { id: "p-021", sku: "TLS-5003", name: "Assorted Screw Kit 500pc", categoryId: "cat-tools", supplierId: "sup-atlas", unit: "kit", costPrice: 8.4, sellPrice: 18.5, quantity: 48, totalReceived: 48, reorderLevel: 30, location: "E2-07", createdAt: "2026-04-04" },
  { id: "p-022", sku: "TLS-5004", name: "Measuring Tape 25ft", categoryId: "cat-tools", supplierId: "sup-atlas", unit: "pcs", costPrice: 3.9, sellPrice: 9.25, quantity: 5, totalReceived: 5, reorderLevel: 25, location: "E2-09", createdAt: "2026-04-20" },
  { id: "p-023", sku: "CLN-6001", name: "Multi-Surface Cleaner 32oz", categoryId: "cat-cleaning", supplierId: "sup-harborgoods", unit: "bottle", costPrice: 2.3, sellPrice: 5.5, quantity: 156, totalReceived: 156, reorderLevel: 70, location: "F1-01", createdAt: "2026-03-08" },
  { id: "p-024", sku: "CLN-6002", name: "Microfiber Cloths (20pk)", categoryId: "cat-cleaning", supplierId: "sup-harborgoods", unit: "pack", costPrice: 4.7, sellPrice: 10.99, quantity: 88, totalReceived: 88, reorderLevel: 50, location: "F1-04", createdAt: "2026-03-08" },
  { id: "p-025", sku: "CLN-6003", name: "Industrial Trash Bags (50pk)", categoryId: "cat-cleaning", supplierId: "sup-harborgoods", unit: "pack", costPrice: 6.1, sellPrice: 13.75, quantity: 33, totalReceived: 33, reorderLevel: 40, location: "F1-07", createdAt: "2026-03-08" },
  { id: "p-026", sku: "CLN-6004", name: "Disinfectant Wipes (3pk)", categoryId: "cat-cleaning", supplierId: "sup-harborgoods", unit: "pack", costPrice: 5.9, sellPrice: 12.0, quantity: 0, totalReceived: 0, reorderLevel: 60, location: "F1-09", createdAt: "2026-03-22" },
  { id: "p-027", sku: "ELX-1007", name: "27in USB-C Monitor", categoryId: "cat-electronics", supplierId: "sup-atlas", unit: "pcs", costPrice: 118.0, sellPrice: 249.0, quantity: 14, totalReceived: 14, reorderLevel: 10, location: "A1-20", createdAt: "2026-06-18" },
  { id: "p-028", sku: "OFC-2006", name: "Whiteboard Markers (8pk)", categoryId: "cat-office", supplierId: "sup-brightpack", unit: "pack", costPrice: 2.6, sellPrice: 6.25, quantity: 97, totalReceived: 97, reorderLevel: 45, location: "B2-13", createdAt: "2026-05-28" },
];

// Deterministic pseudo-random generator so seed data is identical on
// server and client, avoiding hydration mismatches.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSeedTransactions(): Transaction[] {
  const rand = mulberry32(20260922);
  const baseDate = new Date("2026-09-22T09:00:00Z");
  const transactions: Transaction[] = [];
  const notesIn = ["Purchase order received", "Restock delivery", "Supplier shipment", "Returned to stock"];
  const notesOut = ["Customer order fulfilled", "Bulk order shipped", "Retail pickup", "Online order packed"];
  const notesAdj = ["Cycle count correction", "Damaged stock write-off", "Warehouse transfer"];

  let counter = 1;
  for (let day = 44; day >= 0; day--) {
    const eventsToday = 1 + Math.floor(rand() * 3);
    for (let e = 0; e < eventsToday; e++) {
      const product = seedProducts[Math.floor(rand() * seedProducts.length)];
      const roll = rand();
      const type: Transaction["type"] = roll < 0.55 ? "out" : roll < 0.88 ? "in" : "adjustment";
      const quantity =
        type === "in" ? 20 + Math.floor(rand() * 180) : type === "out" ? 1 + Math.floor(rand() * 40) : 1 + Math.floor(rand() * 15);
      const note = type === "in" ? notesIn[Math.floor(rand() * notesIn.length)] : type === "out" ? notesOut[Math.floor(rand() * notesOut.length)] : notesAdj[Math.floor(rand() * notesAdj.length)];
      const date = new Date(baseDate);
      date.setUTCDate(date.getUTCDate() - day);
      date.setUTCHours(8 + Math.floor(rand() * 9), Math.floor(rand() * 60));
      transactions.push({
        id: `t-${String(counter).padStart(4, "0")}`,
        productId: product.id,
        type,
        quantity,
        note,
        reference: `${type === "in" ? "PO" : type === "out" ? "SO" : "ADJ"}-${20260900 + counter}`,
        date: date.toISOString(),
      });
      counter++;
    }
  }
  return transactions.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const seedTransactions: Transaction[] = buildSeedTransactions();
