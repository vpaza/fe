# NAVAID parser

This parser is used to parse the navaid data from the [FAA](http://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/) database.

## Requirements

You will need NodeJS and NPM installed on your system. You can download NodeJS from [here](https://nodejs.org/en/download/).

## Installation

To install the parser, run the following command:

```bash
npm install
```

## Usage

To run the parser, run the following command:

```bash
npm run convert -- NAV_BASE.csv
```

Where `NAV_BASE.csv` is the path to the navaid data file.

## Output

The parser will generate 2 XML files named `vors.xml` and `ndbs.xml`. These will need to be imported into your GeoMap XML file.
