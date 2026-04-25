const SCALE = 6;
const COLS = 32;
const ROWS = 32;

function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randFloat(rng, min, max) {
  return rng() * (max - min) + min;
}

function chance(rng, probability) {
  return rng() < probability;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function lerpColor(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t,
  });
}

function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = COLS * SCALE;
  canvas.height = ROWS * SCALE;
  canvas.className = "pixel-art";
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

function px(ctx, x, y, color, w = 1, h = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(x) * SCALE,
    Math.round(y) * SCALE,
    Math.round(w) * SCALE,
    Math.round(h) * SCALE,
  );
  ctx.restore();
}

function fillGradient(ctx, top, bottom) {
  for (let y = 0; y < ROWS; y++) {
    const t = y / Math.max(ROWS - 1, 1);
    px(ctx, 0, y, lerpColor(top, bottom, t), COLS, 1);
  }
}

function starfield(ctx, rng, count, palette) {
  for (let i = 0; i < count; i++) {
    px(
      ctx,
      randInt(rng, 0, COLS - 1),
      randInt(rng, 0, ROWS - 1),
      palette[i % palette.length],
      1,
      1,
      rng() * 0.8 + 0.2,
    );
  }
}

function ring(ctx, cx, cy, radius, color, alpha = 1) {
  const points = [];
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 18) {
    points.push({
      x: Math.round(cx + Math.cos(angle) * radius),
      y: Math.round(cy + Math.sin(angle) * radius),
    });
  }
  for (const point of points) {
    px(ctx, point.x, point.y, color, 1, 1, alpha);
  }
}

function circleFill(ctx, cx, cy, radius, color, alpha = 1) {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y <= radius * radius) {
        px(ctx, cx + x, cy + y, color, 1, 1, alpha);
      }
    }
  }
}

function horizontalBand(ctx, baseY, amplitude, freq, phase, color) {
  for (let x = 0; x < COLS; x++) {
    const yOffset = Math.round(Math.sin((x + phase) * freq) * amplitude);
    px(ctx, x, baseY + yOffset, color, 1, ROWS - (baseY + yOffset));
  }
}

function drawHudFrame(ctx, titleColor) {
  px(ctx, 0, 0, "#080c18", COLS, ROWS);
  px(ctx, 1, 1, "#263258", COLS - 2, ROWS - 2);
  px(ctx, 2, 2, "#0d1328", COLS - 4, ROWS - 4);
  px(ctx, 2, 2, titleColor, COLS - 4, 1, 0.18);
  px(ctx, 2, ROWS - 3, titleColor, COLS - 4, 1, 0.18);
}

function drawPlanet(ctx, type, seed) {
  const rng = mulberry32(seed);
  drawHudFrame(ctx, "#2de5d4");

  switch (type) {
    case "terran":
      fillGradient(ctx, "#13356a", "#4aa3d9");
      horizontalBand(ctx, 18, 1, 0.35, randFloat(rng, 0, 10), "#3db46a");
      horizontalBand(ctx, 22, 1, 0.28, randFloat(rng, 0, 10), "#246c48");
      for (let i = 0; i < 5; i++) {
        const bx = randInt(rng, 4, 26);
        const bh = randInt(rng, 3, 8);
        px(ctx, bx, 31 - bh, "#12213c", 2, bh);
        if (chance(rng, 0.5)) px(ctx, bx + 1, 31 - bh - 1, "#eaf6ff");
      }
      break;
    case "mining":
      fillGradient(ctx, "#26120b", "#6a3421");
      horizontalBand(ctx, 19, 2, 0.45, randFloat(rng, 0, 5), "#4b2c1f");
      horizontalBand(ctx, 23, 2, 0.34, randFloat(rng, 0, 5), "#322017");
      for (let i = 0; i < 3; i++) {
        const x = 5 + i * 8 + randInt(rng, -1, 1);
        px(ctx, x, 18, "#171113", 1, 9);
        px(ctx, x - 1, 18, "#171113", 3, 1);
        px(ctx, x + 1, 16, "#ff7a39", 1, 1);
      }
      for (let i = 0; i < 3; i++) {
        px(
          ctx,
          randInt(rng, 4, 27),
          randInt(rng, 21, 28),
          "#ff6b2e",
          randInt(rng, 2, 4),
          1,
          0.7,
        );
      }
      break;
    case "agricultural":
      fillGradient(ctx, "#6f4f19", "#a6cf53");
      horizontalBand(ctx, 17, 1, 0.25, randFloat(rng, 0, 8), "#87ba43");
      horizontalBand(ctx, 21, 2, 0.2, randFloat(rng, 0, 8), "#5d9534");
      for (let i = 0; i < 2; i++) {
        const x = 8 + i * 10;
        px(ctx, x, 24, "#4d2b17", 3, 5);
        px(ctx, x - 1, 23, "#7c5024", 5, 1);
      }
      for (let i = 0; i < 12; i++) {
        px(
          ctx,
          randInt(rng, 3, 28),
          randInt(rng, 19, 29),
          "#e8d86a",
          1,
          1,
          0.8,
        );
      }
      break;
    case "industrial":
      fillGradient(ctx, "#1a1f30", "#4e5568");
      px(ctx, 0, 22, "#202430", COLS, 10);
      for (let i = 0; i < 4; i++) {
        const x = 4 + i * 6 + randInt(rng, -1, 1);
        const h = randInt(rng, 5, 9);
        px(ctx, x, 31 - h, "#121722", 4, h);
      }
      for (let i = 0; i < 3; i++) {
        const x = 6 + i * 9 + randInt(rng, -1, 1);
        px(ctx, x, 16, "#10141e", 1, 10);
        px(ctx, x - 1, 14, "#79839a", 3, 1, 0.35);
        px(ctx, x, 13, "#ff8c4b", 1, 1, 0.8);
      }
      break;
    case "hubStation":
      fillGradient(ctx, "#03050a", "#0a1433");
      starfield(ctx, rng, 22, ["#f5f9ff", "#8ce8ff"]);
      ring(ctx, 16, 16, 5, "#b6d0e8", 0.85);
      ring(ctx, 16, 16, 8, "#5ee9da", 0.5);
      px(ctx, 12, 15, "#9fb7ca", 8, 2);
      px(ctx, 15, 12, "#9fb7ca", 2, 8);
      px(ctx, 15, 15, "#ffffff", 2, 2);
      break;
    case "resort":
      fillGradient(ctx, "#1f5c89", "#6fe0f2");
      px(ctx, 0, 21, "#12a2c2", COLS, 11);
      px(ctx, 0, 24, "#0b84a4", COLS, 8, 0.7);
      for (let i = 0; i < 3; i++) {
        const x = 7 + i * 7;
        circleFill(ctx, x, 20, 2, "#ffb6e8", 0.9);
        px(ctx, x - 2, 20, "#5e2557", 5, 2, 0.8);
      }
      for (let i = 0; i < 10; i++) {
        px(
          ctx,
          randInt(rng, 3, 28),
          randInt(rng, 18, 29),
          chance(rng, 0.5) ? "#ffd66d" : "#ff8ed0",
          1,
          1,
          0.8,
        );
      }
      break;
    case "research":
      fillGradient(ctx, "#150d33", "#12304b");
      for (let i = 0; i < 4; i++) {
        px(ctx, 0, 10 + i * 3, "#67e8f9", COLS, 1, 0.15);
      }
      for (let i = 0; i < 3; i++) {
        const x = 8 + i * 8;
        px(ctx, x, 21, "#211634", 1, 8);
        px(ctx, x - 2, 21, "#211634", 5, 1);
        px(ctx, x, 18, "#67e8f9", 1, 1);
        px(ctx, x - 1, 19, "#67e8f9", 3, 1, 0.5);
      }
      break;
  }
}

function drawShip(ctx, shipClass, seed) {
  const rng = mulberry32(seed);
  drawHudFrame(ctx, "#2de5d4");
  fillGradient(ctx, "#03050a", "#11182a");
  starfield(ctx, rng, 14, ["#eef5ff", "#7fdfff"]);

  const accent = {
    cargoShuttle: "#2de5d4",
    passengerShuttle: "#f0ca68",
    mixedHauler: "#7ed2ff",
    fastCourier: "#ff69c9",
    bulkFreighter: "#ff9b54",
    starLiner: "#76f7ce",
    megaHauler: "#e19a6b",
    luxuryLiner: "#d9a7ff",
  }[shipClass];

  const body = "#6f7d94";
  const dark = "#475367";
  const light = "#bcd2ec";
  const y = 16;

  switch (shipClass) {
    case "cargoShuttle":
      px(ctx, 8, y - 2, body, 10, 4);
      px(ctx, 18, y - 1, dark, 4, 2);
      px(ctx, 6, y - 1, accent, 2, 2);
      break;
    case "passengerShuttle":
      px(ctx, 7, y - 1, body, 13, 3);
      px(ctx, 20, y, dark, 3, 1);
      px(ctx, 11, y - 2, light, 5, 1, 0.7);
      px(ctx, 5, y, accent, 2, 1);
      break;
    case "mixedHauler":
      px(ctx, 8, y - 2, body, 12, 4);
      px(ctx, 20, y - 1, dark, 3, 2);
      px(ctx, 10, y - 4, dark, 3, 2);
      px(ctx, 10, y + 2, dark, 3, 2);
      px(ctx, 6, y, accent, 2, 1);
      break;
    case "fastCourier":
      px(ctx, 10, y - 1, body, 10, 2);
      px(ctx, 20, y - 2, dark, 3, 4);
      px(ctx, 7, y - 3, dark, 3, 2);
      px(ctx, 7, y + 1, dark, 3, 2);
      px(ctx, 5, y, accent, 2, 1);
      break;
    case "bulkFreighter":
      px(ctx, 6, y - 3, body, 16, 6);
      px(ctx, 22, y - 2, dark, 3, 4);
      px(ctx, 15, y - 5, dark, 4, 2);
      px(ctx, 4, y - 1, accent, 2, 2);
      break;
    case "starLiner":
      px(ctx, 6, y - 2, body, 16, 4);
      px(ctx, 22, y - 1, dark, 3, 2);
      px(ctx, 9, y - 4, dark, 4, 2);
      px(ctx, 9, y + 2, dark, 4, 2);
      for (let x = 11; x <= 18; x += 2) px(ctx, x, y - 1, light);
      px(ctx, 4, y, accent, 2, 1);
      break;
    case "megaHauler":
      px(ctx, 4, y - 4, body, 19, 8);
      px(ctx, 23, y - 2, dark, 3, 4);
      px(ctx, 7, y - 6, dark, 5, 2);
      px(ctx, 7, y + 4, dark, 5, 2);
      px(ctx, 2, y - 1, accent, 2, 2);
      break;
    case "luxuryLiner":
      px(ctx, 5, y - 2, body, 17, 4);
      px(ctx, 22, y - 1, dark, 3, 2);
      px(ctx, 8, y - 5, dark, 4, 3);
      px(ctx, 8, y + 2, dark, 4, 3);
      for (let x = 10; x <= 19; x += 2) px(ctx, x, y - 1, light, 1, 1, 0.8);
      px(ctx, 3, y, accent, 2, 1);
      break;
  }

  px(ctx, 2, y, accent, 2, 1, 0.4);
  px(ctx, 1, y, accent, 1, 1, 0.2);
}

function drawSystem(ctx, name, starColor, planetCount, seed) {
  const rng = mulberry32(seed);
  drawHudFrame(ctx, "#2de5d4");
  fillGradient(ctx, "#020307", "#071328");
  starfield(ctx, rng, 20, ["#ffffff", "#8bdfff", "#ffd5a0"]);
  circleFill(ctx, 16, 16, 3, starColor, 1);
  circleFill(ctx, 16, 16, 5, starColor, 0.22);
  for (let i = 0; i < planetCount; i++) {
    const radius = 6 + i * 3;
    ring(ctx, 16, 16, radius, "#6a7692", 0.35);
    const angle = randFloat(rng, 0, Math.PI * 2);
    px(
      ctx,
      16 + Math.round(Math.cos(angle) * radius),
      16 + Math.round(Math.sin(angle) * radius),
      lerpColor("#4d8de6", "#f2c46b", rng()),
      1,
      1,
      0.95,
    );
  }
  px(ctx, 3, 26, "#0b1224", 26, 3);
  for (let i = 0; i < Math.min(name.length, 12); i++) {
    px(ctx, 5 + i * 2, 27, i % 2 === 0 ? "#d6e6ff" : "#6bd9ff");
  }
}

function drawEvent(ctx, category, seed) {
  const rng = mulberry32(seed);
  const palette = {
    market: ["#0d2b1e", "#143f28", "#2de58c"],
    hazard: ["#300d10", "#48161a", "#ff6b3d"],
    opportunity: ["#2c2408", "#4b3d10", "#ffd36c"],
    flavor: ["#1b1038", "#2a1751", "#b37dff"],
  }[category];

  drawHudFrame(ctx, palette[2]);
  fillGradient(ctx, palette[0], palette[1]);

  if (category === "market") {
    for (let i = 0; i < 3; i++) {
      let x = 5;
      let y = 22 - i * 4;
      while (x < 27) {
        const nx = x + 4;
        const ny = y + randInt(rng, -2, 2);
        px(ctx, x, y, palette[2], 1, 1, 0.7);
        px(ctx, x + 1, y, palette[2], 1, 1, 0.45);
        x = nx;
        y = ny;
      }
    }
  } else if (category === "hazard") {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const x = 16 + Math.round(Math.cos(angle) * randInt(rng, 4, 9));
      const y = 16 + Math.round(Math.sin(angle) * randInt(rng, 4, 9));
      px(ctx, x, y, i % 2 === 0 ? "#ffb069" : palette[2], 2, 2, 0.85);
    }
    circleFill(ctx, 16, 16, 3, "#ffd3a0", 0.8);
  } else if (category === "opportunity") {
    const points = [
      [16, 7],
      [18, 13],
      [24, 13],
      [19, 17],
      [21, 24],
      [16, 20],
      [11, 24],
      [13, 17],
      [8, 13],
      [14, 13],
    ];
    for (const [x, y] of points) px(ctx, x, y, palette[2], 2, 2, 0.9);
  } else {
    for (let i = 0; i < 18; i++) {
      px(
        ctx,
        8 + Math.floor(i / 2),
        10 + Math.round(Math.sin(i / 2) * 4),
        palette[2],
        1,
        1,
        0.7,
      );
      px(
        ctx,
        16 + Math.round(Math.cos(i / 3) * 6),
        16 + Math.round(Math.sin(i / 3) * 6),
        "#6be7ff",
        1,
        1,
        0.4,
      );
    }
  }
}

function drawAlien(ctx, role, seed) {
  const rng = mulberry32(seed);
  const schemes = {
    broker: {
      bgTop: "#132143",
      bgBottom: "#08111e",
      skin: "#6be7ff",
      dark: "#17475f",
      accent: "#ffd98a",
      eye: "#dffcff",
    },
    miner: {
      bgTop: "#2a1711",
      bgBottom: "#0f0907",
      skin: "#8b7d76",
      dark: "#332722",
      accent: "#ff9656",
      eye: "#ffe0bf",
    },
    researcher: {
      bgTop: "#201644",
      bgBottom: "#09101f",
      skin: "#9ad6ff",
      dark: "#26316f",
      accent: "#b57cff",
      eye: "#ffffff",
    },
    concierge: {
      bgTop: "#173350",
      bgBottom: "#09111b",
      skin: "#74dccd",
      dark: "#205564",
      accent: "#ff80d3",
      eye: "#fff7ff",
    },
    enforcer: {
      bgTop: "#14261a",
      bgBottom: "#08100b",
      skin: "#70b75c",
      dark: "#274123",
      accent: "#ff6666",
      eye: "#f1ffae",
    },
  }[role];

  drawHudFrame(ctx, schemes.accent);
  fillGradient(ctx, schemes.bgTop, schemes.bgBottom);
  ring(ctx, 16, 14, 11, schemes.accent, 0.2);
  ring(ctx, 16, 14, 8, "#2de5d4", 0.2);

  px(ctx, 8, 23, schemes.dark, 16, 7);
  px(ctx, 11, 19, schemes.dark, 10, 5);
  px(ctx, 12, 8, schemes.skin, 8, 10);
  px(ctx, 11, 10, schemes.skin, 10, 6);
  px(ctx, 10, 12, schemes.skin, 12, 4);
  px(ctx, 12, 7, schemes.skin, 2, 1);
  px(ctx, 18, 7, schemes.skin, 2, 1);

  if (role === "broker") {
    px(ctx, 11, 6, schemes.accent, 3, 1);
    px(ctx, 18, 6, schemes.accent, 3, 1);
    px(ctx, 14, 4, schemes.accent, 4, 1);
  } else if (role === "miner") {
    px(ctx, 10, 6, schemes.dark, 3, 2);
    px(ctx, 19, 6, schemes.dark, 3, 2);
    px(ctx, 13, 4, schemes.dark, 2, 2);
    px(ctx, 17, 4, schemes.dark, 2, 2);
  } else if (role === "researcher") {
    px(ctx, 13, 5, schemes.accent, 1, 2);
    px(ctx, 18, 5, schemes.accent, 1, 2);
    ring(ctx, 16, 21, 4, schemes.accent, 0.4);
  } else if (role === "concierge") {
    px(ctx, 9, 8, schemes.accent, 2, 1);
    px(ctx, 21, 8, schemes.accent, 2, 1);
    px(ctx, 8, 9, schemes.accent, 1, 2);
    px(ctx, 23, 9, schemes.accent, 1, 2);
  } else if (role === "enforcer") {
    px(ctx, 10, 7, schemes.dark, 3, 2);
    px(ctx, 19, 7, schemes.dark, 3, 2);
    px(ctx, 12, 5, schemes.dark, 8, 1);
  }

  px(ctx, 13, 11, "#091018", 2, 2);
  px(ctx, 18, 11, "#091018", 2, 2);
  px(ctx, 13, 11, schemes.eye, 1, 1, 0.9);
  px(ctx, 19, 11, schemes.eye, 1, 1, 0.9);
  px(ctx, 14, 14, schemes.dark, 4, 1);
  px(ctx, 14, 16, schemes.dark, 4, 1, 0.7);
  px(ctx, 14, 23, schemes.accent, 4, 1, 0.55);

  if (role === "broker") {
    px(ctx, 12, 20, "#0f1d2c", 8, 2);
  } else if (role === "miner") {
    px(ctx, 11, 20, "#1a1412", 10, 3);
  } else if (role === "researcher") {
    px(ctx, 12, 20, "#10173d", 8, 2);
  } else if (role === "concierge") {
    px(ctx, 12, 20, "#143544", 8, 2);
  } else if (role === "enforcer") {
    px(ctx, 11, 20, "#101b11", 10, 3);
  }
}

function makeCard(kind, title, tag, description, drawFn) {
  const card = document.createElement("article");
  card.className = "card";

  const { canvas } = createCanvas();
  drawFn(canvas.getContext("2d"));

  const media = document.createElement("div");
  media.className = "media";
  media.appendChild(canvas);

  const copy = document.createElement("div");
  copy.className = "copy";
  copy.innerHTML = `
		<span class="tag">${tag}</span>
		<h3>${title}</h3>
		<p>${description}</p>
	`;

  const actions = document.createElement("div");
  actions.className = "actions";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Save PNG";
  button.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${kind}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    a.click();
  });

  actions.appendChild(button);
  copy.appendChild(actions);
  card.appendChild(media);
  card.appendChild(copy);
  return card;
}

const sections = [
  {
    title: "Alien portraits",
    subtitle:
      "Talking-head concepts for menus, contacts, advisors, and event popups.",
    items: [
      [
        "alien",
        "Lumari Broker",
        "Trade / Diplomacy",
        "Executive-grade negotiator for contracts and market intel.",
        (ctx) => drawAlien(ctx, "broker", hashString("lumari")),
      ],
      [
        "alien",
        "Grukk Foreman",
        "Mining / Industry",
        "Resource-world contractor with heavy freight energy.",
        (ctx) => drawAlien(ctx, "miner", hashString("grukk")),
      ],
      [
        "alien",
        "Velis Archivist",
        "Research / Analytics",
        "Scholar contact for forecasts, science, and premium data.",
        (ctx) => drawAlien(ctx, "researcher", hashString("velis")),
      ],
      [
        "alien",
        "Selyth Host",
        "Resort / Passenger",
        "Luxury-facing contact for hospitality and passenger markets.",
        (ctx) => drawAlien(ctx, "concierge", hashString("selyth")),
      ],
      [
        "alien",
        "Threx Marshal",
        "Security / Routes",
        "Authority figure for inspections, hazards, and blockade events.",
        (ctx) => drawAlien(ctx, "enforcer", hashString("threx")),
      ],
    ],
  },
  {
    title: "Planet thumbnails",
    subtitle: "One thumbnail language for every planet type in the simulation.",
    items: [
      [
        "planet",
        "Terran",
        "Planet / Terran",
        "Blue skies, green land bands, and a skyline hint.",
        (ctx) => drawPlanet(ctx, "terran", hashString("planet-terran")),
      ],
      [
        "planet",
        "Industrial",
        "Planet / Industrial",
        "Factories, stacks, haze, and steel-blue grime.",
        (ctx) => drawPlanet(ctx, "industrial", hashString("planet-industrial")),
      ],
      [
        "planet",
        "Mining",
        "Planet / Mining",
        "Ore veins, rigs, and jagged terrain silhouettes.",
        (ctx) => drawPlanet(ctx, "mining", hashString("planet-mining")),
      ],
      [
        "planet",
        "Agricultural",
        "Planet / Agricultural",
        "Rolling fields with warm harvest tones.",
        (ctx) => drawPlanet(ctx, "agricultural", hashString("planet-agri")),
      ],
      [
        "planet",
        "Hub Station",
        "Planet / Hub Station",
        "Geometric orbital hub iconography in deep space.",
        (ctx) => drawPlanet(ctx, "hubStation", hashString("planet-hub")),
      ],
      [
        "planet",
        "Resort",
        "Planet / Resort",
        "Water, domes, and festival lighting.",
        (ctx) => drawPlanet(ctx, "resort", hashString("planet-resort")),
      ],
      [
        "planet",
        "Research",
        "Planet / Research",
        "Dishes and data bands for tech-forward worlds.",
        (ctx) => drawPlanet(ctx, "research", hashString("planet-research")),
      ],
    ],
  },
  {
    title: "Ship thumbnails",
    subtitle:
      "Compact fleet silhouettes for sidebars, tables, and route assignment UI.",
    items: [
      [
        "ship",
        "Cargo Shuttle",
        "Ship",
        "Starter cargo workhorse.",
        (ctx) => drawShip(ctx, "cargoShuttle", hashString("cargoShuttle")),
      ],
      [
        "ship",
        "Passenger Shuttle",
        "Ship",
        "Budget passenger mover.",
        (ctx) =>
          drawShip(ctx, "passengerShuttle", hashString("passengerShuttle")),
      ],
      [
        "ship",
        "Mixed Hauler",
        "Ship",
        "Balanced utilitarian silhouette.",
        (ctx) => drawShip(ctx, "mixedHauler", hashString("mixedHauler")),
      ],
      [
        "ship",
        "Fast Courier",
        "Ship",
        "Thin dart built for speed.",
        (ctx) => drawShip(ctx, "fastCourier", hashString("fastCourier")),
      ],
      [
        "ship",
        "Bulk Freighter",
        "Ship",
        "Chunky heavy-capacity freighter.",
        (ctx) => drawShip(ctx, "bulkFreighter", hashString("bulkFreighter")),
      ],
      [
        "ship",
        "Star Liner",
        "Ship",
        "Passenger luxury without going fully opulent.",
        (ctx) => drawShip(ctx, "starLiner", hashString("starLiner")),
      ],
      [
        "ship",
        "Mega Hauler",
        "Ship",
        "Industrial brick with engines.",
        (ctx) => drawShip(ctx, "megaHauler", hashString("megaHauler")),
      ],
      [
        "ship",
        "Luxury Liner",
        "Ship",
        "Premium passenger brand silhouette.",
        (ctx) => drawShip(ctx, "luxuryLiner", hashString("luxuryLiner")),
      ],
    ],
  },
  {
    title: "Systems & event icons",
    subtitle:
      "Strategic map thumbnails and category cards for reports and alerts.",
    items: [
      [
        "system",
        "Amber Trade Star",
        "System",
        "Warm merchant hub system sample.",
        (ctx) =>
          drawSystem(
            ctx,
            "Amber Trade Star",
            "#ffcc6a",
            4,
            hashString("amber-system"),
          ),
      ],
      [
        "system",
        "Blue Giant",
        "System",
        "Cool-toned high-tech system sample.",
        (ctx) =>
          drawSystem(ctx, "Blue Giant", "#76d0ff", 5, hashString("blue-giant")),
      ],
      [
        "system",
        "Red Dwarf",
        "System",
        "More dangerous frontier system sample.",
        (ctx) =>
          drawSystem(ctx, "Red Dwarf", "#ff8460", 3, hashString("red-dwarf")),
      ],
      [
        "event",
        "Market",
        "Event",
        "Charts, trends, and trade shifts.",
        (ctx) => drawEvent(ctx, "market", hashString("event-market")),
      ],
      [
        "event",
        "Hazard",
        "Event",
        "Explosions, disruptions, and expensive surprises.",
        (ctx) => drawEvent(ctx, "hazard", hashString("event-hazard")),
      ],
      [
        "event",
        "Opportunity",
        "Event",
        "Golden moments worth taking a risk on.",
        (ctx) => drawEvent(ctx, "opportunity", hashString("event-opportunity")),
      ],
      [
        "event",
        "Flavor",
        "Event",
        "Ambient galactic color and softer narrative beats.",
        (ctx) => drawEvent(ctx, "flavor", hashString("event-flavor")),
      ],
    ],
  },
];

function renderPage() {
  const app = document.querySelector("#app");
  for (const section of sections) {
    const sectionEl = document.createElement("section");
    sectionEl.className = "section";
    sectionEl.innerHTML = `
			<div class="section-heading">
				<h2>${section.title}</h2>
				<p>${section.subtitle}</p>
			</div>
			<div class="grid"></div>
		`;
    const grid = sectionEl.querySelector(".grid");
    for (const [kind, title, tag, description, drawFn] of section.items) {
      grid.appendChild(makeCard(kind, title, tag, description, drawFn));
    }
    app.appendChild(sectionEl);
  }
}

renderPage();
