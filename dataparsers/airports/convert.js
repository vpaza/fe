// Config

// Bounding Box defines the area to include in the output
const boundingBox = {
  minLat: 50.0,
  maxLat: 90.0,
  minLon: -180.0,
  maxLon: -126.0,
}

// ////////////////////////////////////////////////////
// Do not edit below this line unless you know what you are doing

const fs = require("fs")
const path = require("path")
const { parse } = require("csv-parse/sync")

const input = "APT_BASE.csv"

const inputPath = path.join(__dirname, input)
const outputPath = path.join(__dirname, "airports.xml")

if (!fs.existsSync(inputPath)) {
  console.error(`Input file ${inputPath} does not exist`)
  process.exit(1)
}

if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath)
}

const airports = {}

const records = parse(fs.readFileSync(inputPath, "utf-8"), {
  columns: true,
  skip_empty_lines: true,
})
records.forEach((r) => {
  // We only want ICAO airports
  if (r["ICAO_ID"] === "") return

  const lat = parseFloat(r["LAT_DECIMAL"])
  const lon = parseFloat(r["LONG_DECIMAL"])

  // Is within bounding box?
  if (lat < boundingBox.minLat || lat > boundingBox.maxLat) return
  if (lon < boundingBox.minLon || lon > boundingBox.maxLon) return

  const id = r["ICAO_ID"]

  airports[id] = {
    lat: lat,
    lon: lon,
  }
})

fs.appendFileSync(
  outputPath,
  `        <GeoMapObject Description="Airports" TdmOnly="false">
          <TextDefaults Bcg="17" Filters="16" Size="1" Underline="false" Opaque="false" XOffset="0" YOffset="0" />
          <SymbolDefaults Bcg="13" Filters="13" Style="Airport" Size="1" />
          <Elements>
`
)

Object.keys(airports).forEach((id) => {
  const { lat, lon } = airports[id]

  fs.appendFileSync(
    outputPath,
    `            <Element xsi:type="Symbol" Filters="" Lat="${lat}" Lon="${lon}" />
            <Element xsi:type="Text" Filters="" Lat="${lat}" Lon="${lon}" Lines="${id}" />
`
  )
})

fs.appendFileSync(
  outputPath,
  `          </Elements>
        </GeoMapObject>
`
)
