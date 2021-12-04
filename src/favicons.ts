import domains from '../resources/domains.json';
import fs from 'fs';
import http from 'axios';
import axiosRequestThrottle from 'axios-request-throttle';

axiosRequestThrottle.use(http, { requestsPerSecond: 1 });

const path = `./favicons`; // where to save a file

async function main() {
  for (const domain of domains) {
    const url = `https://api.faviconkit.com/${domain}/144`; // link to file you want to download

    try {
      const response = await http.get(url, { responseType: 'stream' });
      const fileStream = fs.createWriteStream(`${path}/${domain.replace(/\./g, '_')}.png`);
      response.data.pipe(fileStream);

    //   if (!response.data.icons) return;

    //   for (const obj of response.data.icons) {
    //     if (!obj.src.endsWith('png')) continue;

    //     const res = await http.get(obj.src, { responseType: 'stream' });

    //     break;
    //   }
    } catch (e) {
      console.log(e);
    }
  }
}

main();
