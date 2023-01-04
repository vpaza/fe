// Config
const ARTCC = "" // ZDV = Denver ARTCC

// ////////////////////////////////////////////////////
// Do not edit below this line unless you know what you are doing

const fs = require("fs")
const path = require("path")
const { parse } = require("csv-parse/sync")
const axios = require("axios")
const mysql = require("mysql2/promise")
const mysqlopts = require(path.join(__dirname, process.argv[2]))
const { XMLParser } = require("fast-xml-parser")
const dtppBase = "https://aeronav.faa.gov/d-tpp/2213/xml_data/d-tpp_Metafile.xml"
let prevCycle = 0

const input = "d-tpp.xml"

const inputPath = path.join(__dirname, input)
let connection

async function main() {
  console.log("Opening MySQL Connection...")
  connection = await mysql.createConnection(mysqlopts)
  console.log("Connection opened!")
  console.log("Checking if update is needed...")
  if (await needsUpdate()) {
    console.log("Update needed")
    console.log("Downloading new metadata...")
    await downloadNewMetadata()
    console.log("Building charts...")
    await buildCharts()
    console.log("Cleaning up old charts...")
    await cleanupOldCharts()
  } else {
    console.log("Update not needed.")
  }
  console.log("Closing MySQL Connection...")
  await connection.end()
  console.log("Connection closed!")
}

if (!fs.existsSync(inputPath)) {
  console.error(`Input file ${inputPath} does not exist`)
  process.exit(1)
}

const needsUpdate = async () => {
  // Lookup to_date in airport_charts table, only need one row
  const [rows, fields] = await connection.execute("SELECT to_date FROM airport_charts LIMIT 1")
  if (rows.length === 0) return true

  // Log the to_date
  console.log(`to_date: ${rows[0].to_date}`)

  // Is to_date today or in the past ignoring time?
  const today = new Date()
  const to_date = new Date(rows[0].to_date)
  return to_date.getFullYear() <= today.getFullYear() && to_date.getMonth() <= today.getMonth() && to_date.getDate() <= today.getDate()
}

const downloadNewMetadata = async () => {
  // Determine next cycle
  let newcycle = 0
  const [rows, fields] = await connection.execute("SELECT cycle FROM airport_charts ORDER BY cycle DESC LIMIT 1")
  if (rows.length === 0) {
    console.log("No previous cycle found, assuming 2213")
    prevCycle = "2212"
    newcycle = "2213"
  } else {
    let cycle = rows[0].cycle.toString()
    console.log("Previous cycle: " + cycle)
    prevCycle = cycle
    newcycle = cycle.substring(0, 2) + (parseInt(cycle.substring(2, 4)) + 1).toString().padStart(2, "0")
    let id = parseInt(cycle.substring(2, 4))

    // If it's Jan, reset to 01 but only if the current id is not 1 (ie late Jan)
    if (id !== 1 && new Date().getMonth() === 0) {
      // We need to set the new cycle to the last 2 digits of the new year and 01
      newcycle = new Date().getFullYear().toString().substring(2, 4) + "01"
    }
  }
  console.log("New cycle: " + newcycle)

  // Download the new metadata
  const url = dtppBase.replace("2213", newcycle)
  console.log(`Downloading new metadata from ${url}`)
  let response
  try {
    response = await axios.get(url)
  } catch (error) {
    console.log("Error downloading new metadata")
    console.log(error)
    process.exit(1)
  }
  const buffer = Buffer.from(response.data, "utf-8")
  fs.writeFileSync("d-tpp.xml", buffer)

  console.log("New metadata downloaded and saved to d-tpp.xml")
}

const cleanupOldCharts = async () => {
  if (prevCycle === 0) {
    console.log("Previous cycle not set, skipping cleanup")
    return
  }

  // Delete all charts with the previous cycle
  await connection.execute("DELETE FROM airport_charts WHERE cycle = ?", [prevCycle])
}

const chartQuery = "INSERT INTO airport_charts (id, airport_id, cycle, from_date, to_date, chart_code, chart_name, chart_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE cycle = ?, from_date = ?, to_date = ?, chart_code = ?, chart_name = ?, chart_url = ?, updated_at = NOW()"
const buildCharts = async () => {
  const parser = new XMLParser({
    ignoreAttributes: false,
  })
  const xml = fs.readFileSync("d-tpp.xml", "utf-8")
  const jObj = parser.parse(xml)

  fs.writeFileSync("tmp.json", JSON.stringify(jObj, null, 2))

  let to_edate = jObj["digital_tpp"]["@_to_edate"]
  let from_edate = jObj["digital_tpp"]["@_from_edate"]
  //         0123456789 1234
  // Convert 0901Z  12/29/22 to 2022-12-29T09:01:00.000Z
  let to_date = `20${to_edate.substring(13, 15)}-${to_edate.substring(7, 9)}-${to_edate.substring(10, 12)} ${to_edate.substring(0, 2)}:${to_edate.substring(2, 4)}:00.000`
  let from_date = `20${from_edate.substring(13, 15)}-${from_edate.substring(7, 9)}-${from_edate.substring(10, 12)} ${from_edate.substring(0, 2)}:${from_edate.substring(2, 4)}:00.000`
  let cycle = jObj["digital_tpp"]["@_cycle"]
  let baseURL = `https://aeronav.faa.gov/d-tpp/${cycle}/`

  const allowedCodes = ["DP", "STAR", "IAP"]

  for (const state of jObj["digital_tpp"]["state_code"]) {
    // check if state["city_name"] is an array
    if (!Array.isArray(state["city_name"])) {
      state["city_name"] = [state["city_name"]]
    }
    for (const city of state["city_name"]) {
      // check if city["airport_name"] is an array
      if (!Array.isArray(city["airport_name"])) {
        city["airport_name"] = [city["airport_name"]]
      }
      for (const airport of city["airport_name"]) {
        let airport_id = airport["@_apt_ident"]
        if (!Array.isArray(airport["record"])) {
          airport["record"] = [airport["record"]]
        }
        for (const chart of airport["record"]) {
          let chart_type = chart["chart_code"]
          if (!allowedCodes.includes(chart_type)) chart_type = "OTHER"
          let chart_url = `${baseURL}${chart["pdf_name"]}`
          await connection.execute(chartQuery, [
            `FAA-${airport_id}-${chart_type}-${chart["chart_name"]}`,
            airport_id,
            cycle,
            from_date,
            to_date,
            chart_type,
            chart["chart_name"],
            chart_url,
            cycle,
            from_date,
            to_date,
            chart_type,
            chart["chart_name"],
            chart_url,
          ])
        }
      }
    }
  }
}

main()