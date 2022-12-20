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

const args = process.argv.slice(2)
const input = args[0]

const inputPath = path.join(__dirname, input)
const fixOutput = path.join(__dirname, "fixes.xml")
const airwayOutput = path.join(__dirname, "airways.xml")

if (!fs.existsSync(inputPath)) {
  console.error(`Input file ${inputPath} does not exist`)
  process.exit(1)
}

if (fs.existsSync(fixOutput)) {
  fs.unlinkSync(fixOutput)
}

if (fs.existsSync(airwayOutput)) {
  fs.unlinkSync(airwayOutput)
}

const hiInt = {}
const loInt = {}
const hiAirways = {}
const loAirways = {}

const DMStoDD = (dms) => {
  let parts = dms.split("-")
  let neg = false
  if (parts[2].match(/[SW]$/)) {
    neg = true
  }
  parts[2] = parts[2].replace("S", "")
  parts[2] = parts[2].replace("W", "")
  parts[2] = parts[2].replace("N", "")
  parts[2] = parts[2].replace("E", "")

  let dd = parseFloat(parts[0]) + (parseFloat(parts[1]) / 60) + parseFloat((parts[2]) / 3600)
  if (neg) dd = dd * -1
  return dd
}

const lines = fs.readFileSync(inputPath, "utf-8").split(/\r?\n/)
lines.forEach((line) => {
  // Skip if line is blank
  if (line.length === 0) return

  // Only interested in AWY2 lines
  if (!line.startsWith("AWY2")) return

  const desig = line.substring(4, 9).trim()
  const name = line.substring(15, 45).trim()
  const type = line.substring(45, 45+19).trim()
  const isFix = line.substring(64, 64+15).trim()
  const navaid_ident = line.substring(116, 120).trim()

  if (type === "") return

  const lat = DMStoDD(line.substring(83, 83+14).trim())
  const lon = DMStoDD(line.substring(97, 97+14).trim())

  if (lat < boundingBox.minLat || lat > boundingBox.maxLat) return
  if (lon < boundingBox.minLon || lon > boundingBox.maxLon) return

  if (desig.match(/^[QJ]/)) {
    if (!hiAirways[desig]) {
      hiAirways[desig] = [];
    }

    hiAirways[desig].push({
      lat,
      lon,
    })

    if (isFix === "FIX") {
      hiInt[name] = {
        lat,
        lon,
      }
    }
  } else {
    if (!loAirways[desig]) {
      loAirways[desig] = [];
    }

    loAirways[desig].push({
      lat,
      lon,
    })

    if (isFix === "FIX") {
      loInt[name] = {
        lat,
        lon,
      }
    }
  }
})

// High airways first

fs.appendFileSync(airwayOutput, `        <GeoMapObject Description="HI AWY" TdmOnly="false">
          <LineDefaults Bcg="8" Filters="8" Style="LongDashed" Thickness="1" />
          <Elements>
`)

Object.keys(hiAirways).forEach((desig) => {
  let lastpoint = null
  hiAirways[desig].forEach((point) => {
    if (lastpoint) {
      fs.appendFileSync(
        airwayOutput,
        `            <Element xsi:type="Line" Filters="" StartLat="${lastpoint.lat}" StartLon="${lastpoint.lon}" EndLat="${point.lat}" EndLon="${point.lon}" /> <!-- ${desig} -->\n`
      )
    }
    lastpoint = point
  })
})

// Close high airways and start low airways

fs.appendFileSync(
  airwayOutput,
  `          </Elements>
        </GeoMapObject>
        <GeoMapObject Description="LO AWY" TdmOnly="false">
          <LineDefaults Bcg="9" Filters="9" Style="ShortDashed" Thickness="1" />
          <Elements>
`
)

Object.keys(loAirways).forEach((desig) => {
  let lastpoint = null
  loAirways[desig].forEach((point) => {
    if (lastpoint) {
      fs.appendFileSync(
        airwayOutput,
        `            <Element xsi:type="Line" Filters="" StartLat="${lastpoint.lat}" StartLon="${lastpoint.lon}" EndLat="${point.lat}" EndLon="${point.lon}" /> <!-- ${desig} -->\n`
      )
    }
    lastpoint = point
  })
})

fs.appendFileSync(
  airwayOutput,
  `          </Elements>
        </GeoMapObject>
`
)

// Now for the intersections

fs.appendFileSync(fixOutput, `        <GeoMapObject Description="Object High (Waypoints)" TdmOnly="false">
          <TextDefaults Bcg="8" Filters="8" Size="1" Underline="false" Opaque="false" XOffset="10" YOffset="10" />
          <SymbolDefaults Bcg="8" Filters="8" Style="AirwayIntersections" Size="1" />
          <Elements>
`)

Object.keys(hiInt).forEach((name) => {
  fs.appendFileSync(
    fixOutput,
    `            <Element xsi:type="Symbol" Filters="" Lat="${hiInt[name].lat}" Lon="${hiInt[name].lon}" /> <!-- ${name} -->\n`,
  )
})

fs.appendFileSync(
  fixOutput,
  `          </Elements>
        </GeoMapObject>
        <GeoMapObject Description="Object Low (Waypoints)" TdmOnly="false">
          <TextDefaults Bcg="9" Filters="9" Size="1" Underline="false" Opaque="false" XOffset="10" YOffset="10" />
          <SymbolDefaults Bcg="9" Filters="9" Style="AirwayIntersections" Size="1" />
          <Elements>
`)

Object.keys(loInt).forEach((name) => {
  fs.appendFileSync(
    fixOutput,
    `            <Element xsi:type="Symbol" Filters="" Lat="${loInt[name].lat}" Lon="${loInt[name].lon}" /> <!-- ${name} -->\n`,
  )
})

fs.appendFileSync(
  fixOutput,
  `          </Elements>
        </GeoMapObject>
`)
