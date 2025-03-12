import { launch } from 'puppeteer';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { setTimeout } from "node:timers/promises";

// ********************************************** //
// Update b/f scraping a new season ...

const filePath = 'tasks/output/2024.json';

let lastHuntCaptured = false;
const lastHuntProps = {
  wmaName: 'Zahnd WMA',
  details: 'Deer/Bear Archery Either Sex',
  hunterCount: 124,
  does: 8,
  bucks: 5,
}

// ********************************************** //

async function collectCurrentHuntData(page) {

  let returnData = [];
  const divsSelector = '.tabulator-row > div'

  try {

    await page.waitForSelector(divsSelector);

    const divElements = await page.$$(divsSelector);
    console.log('Found ' + divElements.length + ' divs.');
    for (const divElement of divElements) {

      const huntData = await divElement.evaluate((element) => element.innerText);
      const huntDataArray = huntData.split('\n\n');
      const wmaName = huntDataArray[0];
      const details = huntDataArray[1];

      await divElement.click();

      // Wait for the div to update after the click event
      await setTimeout(250); // Adjust the timeout value as needed

      // Collect text from other divs that update after the click event
      const huntHarvestData = await page.evaluate(() => {
        const otherDivSelector = 'div.widget-body';
        const otherDivElements = document.querySelectorAll(otherDivSelector);
        return Array.from(otherDivElements).map((element) => element.innerText);
      });

      const does = huntHarvestData[0];
      const hunterCount = huntHarvestData[1];
      const bucks = huntHarvestData[2];
      const bears = huntHarvestData[5] ? huntHarvestData[5] : 'N/A';

      await setTimeout(250); // Wait for the previous page to load, adjust timeout as needed

      // const startEndDates = parseHuntDates2(details);
      const startEndDates = extractHuntDates(details);

      const weapon = (details) => {
        if (details.includes('Firearms')) {
          return 'firearms';
        } else if (details.includes('Archery')) {
          return 'archery';
        } else if (details.includes('Primitive')) {
          return 'primitive';
        } else {
          return 'unspecified'
        }
      };

      const huntType = (details) => {
        if (details.includes('Youth')) {
          return 'youth';
        } else if (details.includes('Hunt-and-Learn')) {
          return 'hunt and learn';
        } else if (details.includes('Mobility')) {
          return 'mobility impaired';
        } else {
          return 'sign in';
        }
      }

      const huntItem = {
        'wmaName': wmaName,
        'details': details,
        'weapon': weapon(details),
        'huntType': huntType(details),
        'isBonus': details.includes('Bonus'),
        'isBuckOnly': details.includes('Buck Only'),
        'isQualityBuck': details.includes('Quality'),
        'isEitherSex': details.includes('Antlerless') || details.includes('Either Sex'),
        'hunterCount': parseNumberFromString(hunterCount),
        'does': parseNumberFromString(does),
        'bucks': parseNumberFromString(bucks),
        'bears': bears !== 'N/A' ? parseNumberFromString(bears) : bears,
        ...startEndDates
      }

      console.log(huntItem);

      returnData.push(huntItem);

      if (huntItem.wmaName === lastHuntProps.wmaName &&
          huntItem.details === lastHuntProps.details &&
          huntItem.hunterCount === lastHuntProps.hunterCount &&
          huntItem.does === lastHuntProps.does &&
          huntItem.bucks === lastHuntProps.bucks) {
          lastHuntCaptured = true;
      }

    } // END for
  } catch (error) {
    console.error('**** Something went wrong. 😭 ****\n\n', error);
  }

  console.log('Processed ' + returnData.length + ' more hunts!');

  let existingData = [];

  if (existsSync(filePath)) {
    const fileContent = readFileSync(filePath);

    if (fileContent.length > 0) {
      existingData = JSON.parse(fileContent);

      // Remove duplicates
      returnData = returnData.filter((newItem) => {
        const existingItem = existingData.find((item) => item.wmaName === newItem.wmaName && item.details === newItem.details);
        return !existingItem;
      });
    }

  }

  existingData.push(...returnData);
  writeFileSync(filePath, JSON.stringify(existingData, null, 2));

}

function parseNumberFromString(str) {
  const regex = /\d+/; // Match one or more digits
  if (str) {
    const match = str.match(regex);

    if (match && match.length > 0) {
      const numberStr = match[0];
      const number = parseInt(numberStr, 10); // Convert the string to a number
      return number;
    }
  }
  return null; // Return null if no number found in the string
}

function extractHuntDates(details) {
  const datePattern = /([A-Za-z]+) (\d{1,2}) - ([A-Za-z]+)? ?(\d{1,2})/;

  const months = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Sept: "09", Oct: "10", Nov: "11", Dec: "12"
  };

  const match = details.match(datePattern);
  if (!match) {
    console.log('Could not parse dates ... setting to season archery dates ...', details, details.toLowerCase().includes('archery'));
    return { startdate: '2024-09-14', enddate: '2024-10-11' };
  }

  let [, startMonth, startDay, endMonth, endDay] = match;

  // Normalize "Sept" to "Sep" for consistent lookup
  startMonth = startMonth === "Sept" ? "Sep" : startMonth;
  endMonth = endMonth === "Sept" ? "Sep" : endMonth;

  const startMonthNum = months[startMonth];
  const endMonthNum = months[endMonth || startMonth]; // Use startMonth if endMonth is missing

  const startYear = startMonth === "Jan" ? 2025 : 2024;
  const endYear = (endMonth || startMonth) === "Jan" ? 2025 : 2024;

  const startdate = `${startYear}-${startMonthNum}-${startDay.padStart(2, '0')}`;
  const enddate = `${endYear}-${endMonthNum}-${endDay.padStart(2, '0')}`;

  return { startdate, enddate };
}

async function main() {

  const browser = await launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto('https://gadnrwrd.maps.arcgis.com/apps/dashboards/2ff479b38e4c4f2894fe1b8c5a53e4b2');

  let previousHeight;
  let currentHeight = 1;

  while (currentHeight > 0 && !lastHuntCaptured) {

    await setTimeout(2500);
    await collectCurrentHuntData(page);

    const currentHeight = await page.evaluate(() => document.querySelector('.tabulator-row > div').scrollHeight);

    console.log(`Current Height: ${currentHeight}`);

    await page.evaluate(`window.scrollTo(0, ${currentHeight})`);
    await setTimeout(1500); // Adjust the timeout value as needed

  }
  // await scrollAndCollectData(page, browser);
  await browser.close();
}

main();