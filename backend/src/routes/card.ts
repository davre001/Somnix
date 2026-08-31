import { Router } from "express";
import sharp from "sharp";

export const cardRouter = Router();

cardRouter.get("/:marketId/:side", async (req, res) => {
  const { marketId, side } = req.params;
  const label = side === "green" ? "Green" : "Red";
  const background = side === "green" ? "#0f2e1a" : "#2e0f0f";

  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${background}" />
      <text x="600" y="300" font-size="64" fill="white" font-family="sans-serif" text-anchor="middle">I locked ${label}</text>
      <text x="600" y="370" font-size="32" fill="white" fill-opacity="0.7" font-family="sans-serif" text-anchor="middle">${marketId}</text>
    </svg>
  `;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  res.setHeader("Content-Type", "image/png");
  res.send(png);
});
