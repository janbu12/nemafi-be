const fs = require('fs');

let content = fs.readFileSync('scripts/generate-ui-mockups.mjs', 'utf8');

const regex = /function generateSemanticNetworkSvg\(\) \{[\s\S]*?function generateSemanticNetworkAdminSvg\(\) \{[\s\S]*?return svg;\n\}/m;

const replacement = \
function createRadialNetworkSVG(title, centerX, centerY, centerRadius, centerNode, peripherals) {
  const svgW = 1000;
  const svgH = 1000;
  let svg = \\\<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="\\\" height="\\\" viewBox="0 0 \\\ \\\">
  <rect width="\\\" height="\\\" fill="\\\"/>
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 2 L 8 5 L 0 8 Z" fill="#111111"/></marker></defs>
  <text x="\\\" y="\\\" font-family="Inter, Poppins, Arial, sans-serif" font-size="22" font-weight="700" fill="#111111" text-anchor="middle">\\\</text>
\\\;

  const radius = 320; 
  const nodeRadius = 45;

  svg += \\\<circle cx="\\\" cy="\\\" r="\\\" fill="#ffffff" stroke="#111111" stroke-width="1.5"/>\\\;
  svg += \\\<text x="\\\" y="\\\" font-family="Inter, Poppins, Arial, sans-serif" font-size="20" font-weight="700" fill="#111111" text-anchor="middle">\\\</text>\\\;

  const angleStep = (2 * Math.PI) / peripherals.length;
  for (let i = 0; i < peripherals.length; i++) {
    const p = peripherals[i];
    const angle = i * angleStep - Math.PI / 2; 
    const nx = centerX + radius * Math.cos(angle);
    const ny = centerY + radius * Math.sin(angle);
    
    const dx = nx - centerX;
    const dy = ny - centerY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const ux = dx / dist; 
    const uy = dy / dist;
    const px = -uy; 
    const py = ux;
    
    const offset = 8;
    const startX1 = centerX + ux * centerRadius + px * offset;
    const startY1 = centerY + uy * centerRadius + py * offset;
    const endX1 = nx - ux * nodeRadius + px * offset;
    const endY1 = ny - uy * nodeRadius + py * offset;
    
    const startX2 = nx - ux * nodeRadius - px * offset;
    const startY2 = ny - uy * nodeRadius - py * offset;
    const endX2 = centerX + ux * centerRadius - px * offset;
    const endY2 = centerY + uy * centerRadius - py * offset;

    svg += \\\<path d="M \\\ \\\ L \\\ \\\" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>\\\;
    svg += \\\<path d="M \\\ \\\ L \\\ \\\" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>\\\;

    svg += \\\<circle cx="\\\" cy="\\\" r="\\\" fill="#ffffff" stroke="#111111" stroke-width="1.5"/>\\\;
    svg += \\\<text x="\\\" y="\\\" font-family="Inter, Poppins, Arial, sans-serif" font-size="18" font-weight="700" fill="#111111" text-anchor="middle">\\\</text>\\\;
    
    if (p.msgs && p.msgs.length > 0) {
      const sx = nx + ux * nodeRadius + px * 12;
      const sy = ny + uy * nodeRadius + py * 12;
      const ex = nx + ux * nodeRadius - px * 12;
      const ey = ny + uy * nodeRadius - py * 12;
      
      const c1x = nx + ux * (nodeRadius + 60) + px * 50;
      const c1y = ny + uy * (nodeRadius + 60) + py * 50;
      const c2x = nx + ux * (nodeRadius + 60) - px * 50;
      const c2y = ny + uy * (nodeRadius + 60) - py * 50;
      
      svg += \\\<path d="M \\\ \\\ C \\\ \\\, \\\ \\\, \\\ \\\" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>\\\;
      
      const tx = nx + ux * (nodeRadius + 85);
      const ty = ny + uy * (nodeRadius + 85);
      svg += \\\<text x="\\\" y="\\\" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">\\\</text>\\\;
    }
  }

  if (centerNode.msgs && centerNode.msgs.length > 0) {
    const nx = centerX, ny = centerY;
    const sx = nx + 20, sy = ny - centerRadius;
    const ex = nx - 20, ey = ny - centerRadius;
    const c1x = nx + 70, c1y = ny - centerRadius - 70;
    const c2x = nx - 70, c2y = ny - centerRadius - 70;
    
    svg += \\\<path d="M \\\ \\\ C \\\ \\\, \\\ \\\, \\\ \\\" stroke="#111111" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>\\\;
    svg += \\\<text x="\\\" y="\\\" font-family="Inter, Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">\\\</text>\\\;
  }

  svg += \\\</svg>\\\;
  return svg;
}

function generateSemanticNetworkSvg() {
  return createRadialNetworkSVG(
    "Gambar 3.183 Jaringan Semantik Pelanggan", 500, 450, 70, 
    { id: "TA03", msgs: [] },
    [
      { id: "TA01", msgs: ["P01"] },
      { id: "TA02", msgs: ["P02", "P07"] },
      { id: "TA04", msgs: ["P03", "P09", "P15", "P17"] },
      { id: "TA05", msgs: ["P16"] },
      { id: "TA06", msgs: ["P06", "P11", "P12", "P13"] }
    ]
  );
}

function generateSemanticNetworkTeknisiSvg() {
  return createRadialNetworkSVG(
    "Gambar 3.184 Jaringan Semantik Teknisi", 500, 450, 70, 
    { id: "TA07", msgs: [] },
    [
      { id: "TA01", msgs: ["P01"] },
      { id: "TA06", msgs: ["P06", "P11", "P12", "P13"] },
      { id: "TA08", msgs: ["P24", "P25"] },
      { id: "TA09", msgs: [] },
      { id: "TA10", msgs: ["P10", "P26", "P27", "P28"] }
    ]
  );
}

function generateSemanticNetworkAdminSvg() {
  return createRadialNetworkSVG(
    "Gambar 3.185 Jaringan Semantik Admin", 500, 450, 70, 
    { id: "TA11", msgs: [] },
    [
      { id: "TA01", msgs: ["P01"] },
      { id: "TA06", msgs: ["P04", "P05", "P06", "P11", "P12", "P13"] },
      { id: "TA12", msgs: ["P08", "P20"] },
      { id: "TA13", msgs: [] },
      { id: "TA14", msgs: ["P14", "P18"] },
      { id: "TA15", msgs: [] },
      { id: "TA16", msgs: ["P19", "P22"] },
      { id: "TA17", msgs: ["P23"] },
      { id: "TA18", msgs: [] },
      { id: "TA19", msgs: [] },
      { id: "TA20", msgs: ["P21"] },
      { id: "TA21", msgs: [] },
      { id: "TA22", msgs: [] }
    ]
  );
}
\;

content = content.replace(regex, replacement);

fs.writeFileSync('scripts/generate-ui-mockups.mjs', content, 'utf8');
console.log('Script replaced successfully.');
