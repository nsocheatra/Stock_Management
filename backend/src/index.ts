import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db.js";

import authRoutes from "./routes/auth.js";
import productsRoutes from "./routes/products.js";
import variantsRoutes from "./routes/variants.js";
import batchesRoutes from "./routes/batches.js";
import locationsRoutes from "./routes/locations.js";
import stockRoutes from "./routes/stock.js";
import suppliersRoutes from "./routes/suppliers.js";
import customersRoutes from "./routes/customers.js";
import salesRoutes from "./routes/sales.js";
import debtsRoutes from "./routes/debts.js";
import cashFlowRoutes from "./routes/cash-flow.js";
import auditsRoutes from "./routes/audits.js";
import ordersRoutes from "./routes/orders.js";
import deliveryRoutes from "./routes/delivery.js";
import promotionsRoutes from "./routes/promotions.js";
import membershipRoutes from "./routes/membership.js";
import notificationsRoutes from "./routes/notifications.js";
import settingsRoutes from "./routes/settings.js";
import receiptsRoutes from "./routes/receipts.js";
import telegramRoutes from "./routes/telegram.js";
import uploadRoutes from "./routes/upload.js";
import adminRoutes from "./routes/admin.js";
import reportsRoutes from "./routes/reports.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/variants", variantsRoutes);
app.use("/api/batches", batchesRoutes);
app.use("/api/locations", locationsRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/debts", debtsRoutes);
app.use("/api/cash-flow", cashFlowRoutes);
app.use("/api/audits", auditsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/promotions", promotionsRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/receipts", receiptsRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

async function start() {
  await db.waitReady();
  app.listen(PORT, () => {
    console.log(`[backend] Server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
