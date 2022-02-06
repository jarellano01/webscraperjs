const axios = require('axios');
const cheerio = require('cheerio')
var Promise = require("bluebird");
var fs = require('fs');


const baseUrl = 'https://developer.mozilla.org';
const path = '/en-US/docs/Web/HTML'
const getDataFromUrl = async (url) => {
	const res = await axios.get(url).catch((e) => {
		console.error(`${e.message} - ${url}`)
		return {data: ''}
	})
	return res.data
}

const getLinksFromHtml = (html) => {
	const $ = cheerio.load(html)
	return $('a').map((index, el) => $(el).attr('href')).get()
}

const filterLinks = (links) => {
	return links.filter(x => x.startsWith('/'))
}

const scrapeUrl = async (url) => {
	const html = await getDataFromUrl(`${baseUrl}${url}`)
	const links = getLinksFromHtml(html).map(x => x.replace(baseUrl, ''))
	const filteredLinks = filterLinks(links)

	return {links: filteredLinks}
}

function toObject(names, values) {
	var result = {};
	for (var i = 0; i < names.length; i++)
			 result[names[i]] = values[i];
	return result;
}

const processUrls = async (urls) => {
	const links = await Promise.map(urls, scrapeUrl, {concurrency: 10})
	return toObject(urls, links)
}

const getSiteMap = async (url, depth=2) => {
	let siteMap = {};
	let urlsToProcess = [url]
	for(let i = 1; i <= depth; i+=1) {
		console.log(`Processing depth: ${i}, ${urlsToProcess.length} urls will be scraped.`)
		const newMappings = await processUrls(urlsToProcess)
		siteMap = {...siteMap, ...newMappings}
	  urlsToProcess = [...new Set(
			Object.values(newMappings)
				.map(x => x.links)
				.flat()
				.filter(x => !(x in siteMap))
		)]
	}
	return Object.entries(siteMap).map(([key, value]) => ({url: key, ...value}))
}
getSiteMap(path).then(x => {
	console.log(x)
	fs.writeFileSync('site_map.json', JSON.stringify(x, null, 2))
})