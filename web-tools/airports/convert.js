// Config
const ARTCC = "" // ZDV = Denver ARTCC
// ////////////////////////////////////////////////////
// Do not edit below this line unless you know what you are doing

const fs = require("fs")
const path = require("path")
const { parse } = require("csv-parse/sync")
const mysql = require("mysql2/promise")
const mysqlopts = require(path.join(__dirname, process.argv[2]))

const input = "APT_BASE.csv"
const atcInput = "ATC_BASE.csv"


const inputPath = path.join(__dirname, input)
const ATCinputPath = path.join(__dirname, atcInput)
let connection

async function main() {
  console.log("Opening MySQL Connection...")
  connection = await mysql.createConnection(mysqlopts)
  console.log("Connection opened!")
  console.log("Building airports...")
  await buildAirports()
  console.log("Done building airports!")
  console.log("Building ATC...")
  await buildATC()
  console.log("Done building ATC!")
  console.log("Closing MySQL Connection...")
  await connection.end()
  console.log("Connection closed!")
}

if (!fs.existsSync(inputPath)) {
  console.error(`Input file ${inputPath} does not exist`)
  process.exit(1)
}

const airports = []

const airportQuery = "INSERT INTO airports(id, icao, state, city, name, artcc, status, twr_type_code, elevation, latitude, longitude, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) " + 
  "ON DUPLICATE KEY UPDATE icao = ?, state = ?, city = ?, name = ?, artcc = ?, status = ?, twr_type_code = ?, elevation = ?, latitude = ?, longitude = ?, updated_at = NOW()"
const buildAirports = async () => {
  const records = parse(fs.readFileSync(inputPath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
  })
  await Promise.all(
    records.map(async (r) => {
      // We only want airports in the defined ARTCC
      if (ARTCC !== "" && r["RESP_ARTCC_ID"] !== ARTCC) return

      // We only want ICAO airports
      if (r["ICAO_ID"] === "") return

      const lat = parseFloat(r["LAT_DECIMAL"])
      const lon = parseFloat(r["LONG_DECIMAL"])
      
      airports.push(r["ARPT_ID"])

      await connection.execute(airportQuery, [
        r["ARPT_ID"],
        r["ICAO_ID"],
        r["STATE_CODE"],
        r["CITY"],
        r["ARPT_NAME"],
        r["RESP_ARTCC_ID"],
        r["ARPT_STATUS"],
        r["TWR_TYPE_CODE"],
        r["ELEV"],
        lat,
        lon,
        r["ICAO_ID"],
        r["STATE_CODE"],
        r["CITY"],
        r["ARPT_NAME"],
        r["RESP_ARTCC_ID"],
        r["ARPT_STATUS"],
        r["TWR_TYPE_CODE"],
        r["ELEV"],
        lat,
        lon,
      ])
    })
  )
}

const airportATCQuery =
  "INSERT INTO airport_atcs(id, facility_type, twr_operator_code, twr_call, twr_hrs, primary_apch_radio_call, apch_p_provider, apch_p_prov_type_cd, " +
  "secondary_apch_radio_call, apch_s_provider, apch_s_prov_type_cd, primary_dep_radio_call, dep_p_provider, dep_p_prov_type_cd, secondary_dep_radio_call, dep_s_provider, dep_s_prov_type_cd, " +
  "created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE " +
  "facility_type = ?, twr_operator_code = ?, twr_call = ?, twr_hrs = ?, primary_apch_radio_call = ?, apch_p_provider = ?, apch_p_prov_type_cd = ?, " +
  "secondary_apch_radio_call = ?, apch_s_provider = ?, apch_s_prov_type_cd = ?, primary_dep_radio_call = ?, dep_p_provider = ?, dep_p_prov_type_cd = ?, secondary_dep_radio_call = ?, dep_s_provider = ?, dep_s_prov_type_cd = ?, " +
  "updated_at = NOW()"
const buildATC = async() => {
  const records = parse(fs.readFileSync(ATCinputPath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
  })
  await Promise.all(
    records.map(async (r) => {
      // Only want airports we caught in buildAirports
      if (!airports.includes(r["FACILITY_ID"])) return

      await connection.execute(airportATCQuery, [
        r["FACILITY_ID"],
        r["FACILITY_TYPE"],
        r["TWR_OPERATOR_CODE"],
        r["TWR_CALL"],
        r["TWR_HRS"],
        r["PRIMARY_APCH_RADIO_CALL"],
        r["APCH_P_PROVIDER"],
        r["APCH_P_PROV_TYPE_CD"],
        r["SECONDARY_APCH_RADIO_CALL"],
        r["APCH_S_PROVIDER"],
        r["APCH_S_PROV_TYPE_CD"],
        r["PRIMARY_DEP_RADIO_CALL"],
        r["DEP_P_PROVIDER"],
        r["DEP_P_PROV_TYPE_CD"],
        r["SECONDARY_DEP_RADIO_CALL"],
        r["DEP_S_PROVIDER"],
        r["DEP_S_PROV_TYPE_CD"],
        r["FACILITY_TYPE"],
        r["TWR_OPERATOR_CODE"],
        r["TWR_CALL"],
        r["TWR_HRS"],
        r["PRIMARY_APCH_RADIO_CALL"],
        r["APCH_P_PROVIDER"],
        r["APCH_P_PROV_TYPE_CD"],
        r["SECONDARY_APCH_RADIO_CALL"],
        r["APCH_S_PROVIDER"],
        r["APCH_S_PROV_TYPE_CD"],
        r["PRIMARY_DEP_RADIO_CALL"],
        r["DEP_P_PROVIDER"],
        r["DEP_P_PROV_TYPE_CD"],
        r["SECONDARY_DEP_RADIO_CALL"],
        r["DEP_S_PROVIDER"],
        r["DEP_S_PROV_TYPE_CD"],
      ])
    })
  )
}

main()