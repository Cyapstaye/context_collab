import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

export const settingsRouter = Router();

const DESIGN_KEY = "design-settings";
const ADMIN_EMAIL = "livetobe@naver.com";

export const DEFAULT_DESIGN_SETTINGS = {
  defaultBorderWidth: 1,
  defaultBorderColor: "#374151",
  defaultFontWeight: 300,
  selectedBorderWidth: 2,
  selectedBorderColor: "#374151",
  selectedFontWeight: 500,
  arcGap: 4,
  arcDotSize: 8,
  arcAngleStep: 18,
  edgeFontSize: 11,
  edgeOpacity: 0.55,
};

// GET /api/v1/settings/design — public
settingsRouter.get("/design", async (_req, res) => {
  const config = await prisma.appConfig.findUnique({
    where: { key: DESIGN_KEY },
  });
  if (!config) {
    res.json({ data: DEFAULT_DESIGN_SETTINGS });
    return;
  }
  try {
    // Merge with defaults so any fields added after initial DB save are present
    const merged = { ...DEFAULT_DESIGN_SETTINGS, ...JSON.parse(config.value) };
    res.json({ data: merged });
  } catch {
    res.json({ data: DEFAULT_DESIGN_SETTINGS });
  }
});

// PATCH /api/v1/settings/design — admin only
settingsRouter.patch("/design", requireAuth, async (req, res) => {
  if (req.user?.email !== ADMIN_EMAIL) {
    res
      .status(403)
      .json({ error: "Forbidden", message: "Not authorized", statusCode: 403 });
    return;
  }

  const settings = req.body;
  await prisma.appConfig.upsert({
    where: { key: DESIGN_KEY },
    update: { value: JSON.stringify(settings) },
    create: { key: DESIGN_KEY, value: JSON.stringify(settings) },
  });

  res.json({ data: settings });
});
