'use strict';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import fetch from 'node-fetch';
import turfArea from '@turf/area';
import turfBboxPolygon from '@turf/bbox-polygon';
import turfCircle from '@turf/circle';
import turfDifference from '@turf/difference';
import turfExplode from '@turf/explode';

export { default as calcDistance } from '@turf/distance';

export async function runScraper(feature, cbFetch) {
	let canvas = (feature.type === 'Feature') ? feature : turfBboxPolygon(feature);
	let areaFull = turfArea(canvas);

	do {
		if (!canvas) return;
		let point = getNextPoint();
		let progress = 1 - turfArea(canvas) / areaFull;
		let radius = await cbFetch(point, progress);
		let circle = turfCircle(point, radius * 0.9, { steps: 16 });
		canvas = turfDifference(canvas, circle);
	} while (true);

	function getNextPoint() {
		let points = turfExplode(canvas);
		points = points.features.map(p => p.geometry.coordinates);
		points.sort((a, b) => a[1] - b[1]);
		return points[0];
	}
}

export function createCachedClient(path) {
	if (!existsSync(path)) mkdirSync(path, { recursive: true });

	return { get };

	async function get(url, opt) {
		let filename = calcHashFilename(opt.hash || url);
		if (existsSync(filename)) return readFileSync(filename, 'utf8');

		let response = await fetch(url)
		response = await response.text();

		writeFileSync(filename, response);

		return response;
	}

	function calcHashFilename(...values) {
		values = JSON.stringify(values);
		values = createHash('md5').update(values).digest('hex');
		return resolve(path, values + '.txt');
	}
}

