'use strict'

import { writeFileSync } from 'node:fs';
import { createCachedClient, runScraper } from './index.js';

let { get } = createCachedClient('tmp');
let apotheken = new Map();

let token = await getToken();

await runScraper([5.9, 47.3, 15.1, 55.0], async (point, progress) => {
	process.stderr.write('\r' + (100 * progress).toFixed(2) + '% - ' + apotheken.size);
	let url = [
		'https://www.aponet.de/apotheke/apothekensuche?tx_aponetpharmacy_search%5Baction%5D=result',
		'tx_aponetpharmacy_search%5Bcontroller%5D=Search',
		'tx_aponetpharmacy_search%5Bsearch%5D%5Bplzort%5D=',
		'tx_aponetpharmacy_search%5Bsearch%5D%5Bstreet%5D=',
		'tx_aponetpharmacy_search%5Bsearch%5D%5Bradius%5D=50',
		'tx_aponetpharmacy_search%5Bsearch%5D%5Blat%5D=' + point[1],
		'tx_aponetpharmacy_search%5Bsearch%5D%5Blng%5D=' + point[0],
		'tx_aponetpharmacy_search%5Btoken%5D=' + encodeURIComponent(token),
		'type=1981'
	].join('&');
	let result = await get(url, { hash: point });
	result = JSON.parse(result);

	if (Array.isArray(result.results) && (result.results.length === 0)) {
		throw Error("get new token");
	}
	if (result.alerts && result.alerts[0]?.title === 'Keine Apotheken gefunden') return 50;
	if (result.alerts.length > 0) {
		console.log(result.alerts);
		throw Error();
	}

	result = result.results.apotheken.apotheke;
	let maxDistance = 1;
	result.forEach(r => {
		['distanz', 'longitude', 'latitude'].forEach(k => r[k] = parseFloat(r[k]));
		apotheken.set(r.apo_id, r);
		if (r.distanz > maxDistance) maxDistance = r.distanz;
	})
	return maxDistance;
});

writeFileSync('apotheken.json', JSON.stringify(Array.from(apotheken.values())));

async function getToken() {
	let html = await get('https://www.aponet.de/apotheke/apothekensuche', { hash: 'apothekensuche' });
	let scriptUrl = html.match(/\"(\/typo3temp\/assets\/compressed\/pharmacymap-[0-9a-f]*\.js\?[0-9]*)\"/)[1];
	let script = await get('https://www.aponet.de' + scriptUrl, { hash: 'pharmacymap.js' });
	let token = script.match(/var randomToken \= \'(.*?)'/)[1];
	return token;
}
