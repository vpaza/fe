const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const input = args[0];
const output = args[1];

const inputPath = path.join(__dirname, input);
const outputPath = path.join(__dirname, output);

if (!fs.existsSync(inputPath)) {
  console.error(`Input file ${inputPath} does not exist`);
  process.exit(1);
}

if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

let first = "";
let last = "";
let prefix = "                            ";

fs.appendFileSync(outputPath, `${prefix}; Sector ${input}\n`)

const inputContent = fs.readFileSync(inputPath, 'utf8');
inputContent.split(/\r?\n/).forEach((line) => {
  // Check if line begins with ;
  if (line.startsWith(';')) {
    // Print directly to output file
    fs.appendFileSync(outputPath, line + "\n");
  } else {
    const parts = line.split(" ");
    let coord;

    if (parts[0] > 0) {
      let l = 3-parts[3].length;
      coords = `N${parts[0].padStart(3, "0")}.${parts[1].padStart(2, "0")}.${parts[2].padStart(2, "0")}.${parts[3]}${"0".repeat(l)}`;
    } else {
      let l = 3-parts[3].length;
      coords = `S${Math.abs(parts[0]).toString().padStart(3, "0")}.${parts[1].padStart(2, "0")}.${parts[2].padStart(2, "0")}.${parts[3]}${"0".repeat(l)}`;
    }

    if (parts[4] > 0) {
      let l = 3-parts[7].length;
      coords += ` W${parts[4].padStart(3, "0")}.${parts[5].padStart(2, "0")}.${parts[6].padStart(2, "0")}.${parts[7]}${"0".repeat(l)}`;
    } else {
      let l = 3-parts[7].length;
      coords += ` E${Math.abs(parts[4]).toString().padStart(3, "0")}.${parts[5].padStart(2, "0")}.${parts[6].padStart(2, "0")}.${parts[7]}${"0".repeat(l)}`;
    }

    if (first === "") {
      first = coords;
    }
    if (last !== "") {
      newLine = `${prefix}${last} ${coords}\n`;
      fs.appendFileSync(outputPath, newLine);
    }
    last = coords;
  }
});
fs.appendFileSync(outputPath, `${prefix}${last} ${first}`);