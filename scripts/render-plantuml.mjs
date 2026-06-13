import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import plantumlEncoder from "plantuml-encoder";

const inputPath = process.argv[2] ?? "docs/plantuml/class-diagram-gabungan.puml";
const serverUrl = process.env.PLANTUML_SERVER ?? "https://www.plantuml.com/plantuml";
const formats = ["svg", "png"];

async function render(format, encoded, outputPath) {
  const response = await fetch(`${serverUrl}/${format}/${encoded}`);

  if (!response.ok) {
    throw new Error(`PlantUML server returned ${response.status} for ${format}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}

const source = await fs.readFile(inputPath, "utf8");
const encoded = plantumlEncoder.encode(source);
const parsedPath = path.parse(inputPath);

const outputs = [];
for (const format of formats) {
  const outputPath = path.join(parsedPath.dir, `${parsedPath.name}.${format}`);
  outputs.push(await render(format, encoded, outputPath));
}

console.log(`Rendered ${inputPath}`);
for (const output of outputs) {
  console.log(`- ${output}`);
}
