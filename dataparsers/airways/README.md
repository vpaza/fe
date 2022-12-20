# Airway parser

This parser is used to parse the airway data from the [FAA](http://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/) database.

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
npm run convert -- AWY.txt
```

Where `AWY.txt` is the path to the airway data file.

## Output

The parser will generate 2 XML files named `airways.xml` and `fixes.xml`. These will need to be imported into your GeoMap XML file.
