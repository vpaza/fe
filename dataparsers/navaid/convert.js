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

const args = process.argv.slice(2)
const input = args[0]

const inputPath = path.join(__dirname, input)
const vorOutput = path.join(__dirname, "vors.xml")
const ndbOutput = path.join(__dirname, "ndbs.xml")

if (!fs.existsSync(inputPath)) {
  console.error(`Input file ${inputPath} does not exist`)
  process.exit(1)
}

if (fs.existsSync(vorOutput)) {
  fs.unlinkSync(vorOutput)
}

if (fs.existsSync(ndbOutput)) {
  fs.unlinkSync(ndbOutput)
}

const vors = {}
const ndbs = {}

// We do not want Marine NDBs
const isNDB = (r) => {
  return r === "NDB" || r === "NDB/DME" || r === "UHF/NDB"
}

const records = parse(fs.readFileSync(inputPath, "utf-8"), {
  columns: true,
  skip_empty_lines: true,
})
records.forEach((r) => {
  if (r["NAV_TYPE"].startsWith("VOR") || isNDB(r["NAV_TYPE"])) {
    const lat = parseFloat(r["LAT_DECIMAL"])
    const lon = parseFloat(r["LONG_DECIMAL"])

    // Is within bounding box?
    if (lat < boundingBox.minLat || lat > boundingBox.maxLat) return
    if (lon < boundingBox.minLon || lon > boundingBox.maxLon) return

    if (!isNDB(r["NAV_TYPE"])) {
      vors[r["NAV_ID"]] = {
        lat: parseFloat(r["LAT_DECIMAL"]),
        lon: parseFloat(r["LONG_DECIMAL"]),
        text: r["NAV_ID"],
      }
    } else {
      ndbs[r["NAV_ID"]] = {
        lat: parseFloat(r["LAT_DECIMAL"]),
        lon: parseFloat(r["LONG_DECIMAL"]),
        text: r["NAV_ID"],
      }
    }
  }
})

fs.appendFileSync(
  vorOutput,
  `        <GeoMapObject Description="VORs" TdmOnly="false">
          <TextDefaults Bcg="15" Filters="14" Size="1" Underline="false" Opaque="false" XOffset="10" YOffset="10" />
          <SymbolDefaults Bcg="10" Filters="10" Style="VOR" Size="1" />
          <Elements>
`
)

fs.appendFileSync(
  ndbOutput,
  `        <GeoMapObject Description="NDBs" TdmOnly="false">
          <TextDefaults Bcg="16" Filters="15" Size="1" Underline="false" Opaque="false" XOffset="10" YOffset="10" />
          <SymbolDefaults Bcg="10" Filters="10" Style="NDB" Size="1" />
          <Elements>
`
)

Object.keys(vors).forEach((vor) => {
  const { lat, lon, text } = vors[vor]

  fs.appendFileSync(
    vorOutput,
    `            <Element xsi:type="Symbol" Filters="" Lat="${lat}" Lon="${lon}" />
            <Element xsi:type="Text" Filters="" Lat="${lat}" Lon="${lon}" Lines="${text}" />
`
  )
})

Object.keys(ndbs).forEach((ndb) => {
  const { lat, lon, text } = ndbs[ndb]

  fs.appendFileSync(
    ndbOutput,
    `            <Element xsi:type="Symbol" Filters="" Lat="${lat}" Lon="${lon}" />
            <Element xsi:type="Text" Filters="" Lat="${lat}" Lon="${lon}" Lines="${text}" />
`
  )
})

fs.appendFileSync(
  vorOutput,
  `          </Elements>
        </GeoMapObject>
`
)

fs.appendFileSync(
  ndbOutput,
  `          </Elements>
        </GeoMapObject>
`
)