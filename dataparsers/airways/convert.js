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

const input = "AWY.txt"
const ATSinput = "ATS.txt"

const inputPath = path.join(__dirname, input)
const ATSinputPath = path.join(__dirname, ATSinput)
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

const toRadians = (degrees) => {
  return degrees * Math.PI / 180
}

const toDegrees = (radians) => {
  return radians * 180 / Math.PI
}

const getBearing = (point1, point2) => {
  lat1 = toRadians(point1.lat)
  lat2 = toRadians(point2.lat)
  lon1 = toRadians(point1.lon)
  lon2 = toRadians(point2.lon)

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  const brng = toDegrees(Math.atan2(y, x))
  return (brng + 360) % 360
}

// Distance in nautical miles
function createCoord(coord, bearing, distance) {
  let radius = 6371e3 //meters
  let angDist = distance / radius // angular distance in radians
  let brng = toRadians(bearing);
  let lat1 = toRadians(coord[1])
  let lon1 = toRadians(coord[0])

  let lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angDist) + Math.cos(lat1) * Math.sin(angDist) * Math.cos(brng)
  )

  let lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(angDist) * Math.cos(lat1),
      Math.cos(angDist) - Math.sin(lat1) * Math.sin(lat2)
    )

  lon2 = ((lon2 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI // normalise to -180..+180°

  return {lon: toDegrees(lon2), lat: toDegrees(lat2)}
}

let lines = fs.readFileSync(inputPath, "utf-8").split(/\r?\n/)
lines.forEach((line) => {
  // Skip if line is blank
  if (line.length === 0) return

  // Only interested in AWY2 lines
  if (!line.startsWith("AWY2")) return

  const desig = line.substring(4, 9).trim()
  const name = line.substring(15, 45).trim()
  const seq = line.substring(10, 10 + 4).trim()
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
      seq,
      name,
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
      seq,
      name,
    })

    if (isFix === "FIX") {
      loInt[name] = {
        lat,
        lon,
      }
    }
  }
})

// Read ATS routes and add to High Airways
lines = fs.readFileSync(ATSinputPath, "utf-8").split(/\r?\n/)
lines.forEach((line) => {
  // Skip line if blank
  if (line.length === 0) return

  // Only interested in ATS2 lines
  if (!line.startsWith("ATS2")) return

  const desig = line.substring(6, 6+12).trim()
  const seq = line.substring(21, 21 + 3).trim()
  const name = line.substring(25, 25+40).trim()
  const isFix = line.substring(90, 90+15).trim()
  const lat = DMStoDD(line.substring(109, 109+14).trim())
  const lon = DMStoDD(line.substring(123, 123+14).trim())

  // Check if in bounding box
  if (lat < boundingBox.minLat || lat > boundingBox.maxLat || lon < boundingBox.minLon || lon > boundingBox.maxLon) {
    return
  }

  if (!hiAirways[desig]) {
    hiAirways[desig] = [];
  }

  hiAirways[desig].push({
    lat,
    lon,
    seq,
    name,
  })

  if (isFix === "FIX") {
    hiInt[name] = {
      lat,
      lon,
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
    if (lastpoint && 1 === Math.abs(point.seq - lastpoint.seq)) {
      startPoint = createCoord(
        [lastpoint.lon, lastpoint.lat],
        getBearing(lastpoint, point),
        5 * 1852
      )
      endPoint = createCoord(
        [point.lon, point.lat],
        getBearing(point, lastpoint),
        5 * 1852
      )
      fs.appendFileSync(
        airwayOutput,
        `            <Element xsi:type="Line" Filters="" StartLat="${startPoint.lat}" StartLon="${startPoint.lon}" EndLat="${endPoint.lat}" EndLon="${endPoint.lon}" /> <!-- ${desig}: ${lastpoint.name}-${point.name} -->\n`
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
    if (lastpoint && 1 === Math.abs(point.seq - lastpoint.seq)) {
      startPoint = createCoord(
        [lastpoint.lon, lastpoint.lat],
        getBearing(lastpoint, point),
        5 * 1852
      )
      endPoint = createCoord(
        [point.lon, point.lat],
        getBearing(point, lastpoint),
        5 * 1852
      )
      fs.appendFileSync(
        airwayOutput,
        `            <Element xsi:type="Line" Filters="" StartLat="${startPoint.lat}" StartLon="${startPoint.lon}" EndLat="${endPoint.lat}" EndLon="${endPoint.lon}" /> <!-- ${desig}: ${lastpoint.name}-${point.name} -->\n`
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
