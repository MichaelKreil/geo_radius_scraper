# Geo Radius Scraper

Helps when scraping geodata from an API that returns points near a given location.

# How does it work

We want to querying an API to retrieve all points inside a specific target area.

1. Start by determining your target area, which can be defined as either a bounding box or a polygon. This is the area you're interested in getting data for.

2. Select any point at the edge of this target area. You will use this point to make your first request to the API.

3. The API responses with a set of data entries. Add these entries to your collection of results. This could be done using a data structure like a map.

4. Now, imagine drawing a circle around the request point you chose. This circle should be the smallest possible that can cover all the data entries you received. So the radius of this circle is the distance from the request point to the furthest data entry.

5. We can reasonably assume that there are no more data entries within this circle because the API has already provided all the data for this specific area. So, we can "subtract" this circle from our target area, essentially excluding this circle from the areas we are interested in.

6. We then repeat the process: select a new point in the remaining target area, make an API request, gather the data, draw a new circle, and subtract that from the target area.

7. Continue this process until you have covered the entire target area, retrieving all the available data from the API for your region of interest.

# How to use this package?

Install via npm
```bash
npm i geo_radius_scraper
```

```javascript
// import this package
import { runScraper } from 'geo_radius_scraper';

// use a Map to collect all results
let results = new Map();

// run the scraper, using a bbox and an async callback
await runScraper([5.9, 47.3, 15.1, 55.0], async (point, progress) => {
	// log progress
	process.stderr.write('\r' + (100 * progress).toFixed(2) + '% - ' + results.size);

	// make a request
	let responses = await mayRequest(point);

	// add the entries to your results
	responses.forEach(r => results.set(r.id, r));

	// return the maximum distance. If the response is empty return 50km
	return Math.max(...responses.map(r => r.distance)) || 50;
});
```

# References

## `runScraper`

```javascript
async function runScraper(feature, callback)
```
- argument `feature` can be a GeoJSON feature or a bbox [lonMin, latMin, lonMax, latMax]
- argument `callback` is a async callback of the form (point, progress) => distance
   -  argument `point`: as an 2 number array: [lon, lat]
   -  argument `progress`: progress as number between 0 and 1
   -  returns `distance`: the maximum distance of the API responses in kilometers. This is the radius of the circle around `point`, that we have covered with this request.

## `calcDistance`

```javascript
function calcDistance(point1, point2);
```
calculates the distance between `point1` and `point2` in kilometers. This function is a re-export from [turf.distance](https://turfjs.org/docs/#distance).

## `createCachedClient`

```javascript
function createCachedClient(path)
```
returns request functions that cache all request as local files. This helps during development so you don't have to make identical requests twice.
- argument `path` points to directory where all requests/responses will be cached as txt files.
returns an object with request functions. Currently only `get`:
```javascript
const { get } = createCachedClient(path)
```
Use `get` simply:
```javascript
let text = await get(url);
```
