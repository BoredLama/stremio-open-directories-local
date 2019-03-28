
const openDirApi = require('./openDirectories.js')

const helper = require('./helpers.js')

const version = require('./package.json').version

const needle = require('needle')

const pUrl = require('url')

const toStream = (newObj, type) => {
    return {
        name: pUrl.parse(newObj.href).host,
        type: type,
        url: newObj.href,
        // presume 480p if the filename has no extra tags
        title: newObj.extraTag || '480p'
    }
}

module.exports = {
	serverPort: 7777,
	config: {
		'Only MP4 results': false,
		'Response timeout': 11000,
		'Results per page': 25,
		'Requests open timeout': 10000,
		'Requests read timeout': 10000
	},
	manifest: { 
		"id": "org.stremio.opendir",
		"version": version,

		"name": "Stremio Open Directories Addon",
		"description": "Stremio Add-on to get streaming results from Open Directories",

		"icon": "https://logopond.com/logos/3290f64e7448ab9cf04239a070a8cc47.png",

		// set what type of resources we will return
		"resources": [
			"stream"
		],

		// works for both movies and series
		"types": ["movie", "series"],

		// prefix of item IDs (ie: "tt0032138")
		"idPrefixes": [ "tt" ],

		"catalogs": []

	},
	handler: (config, args) => {
		return new Promise((resolve, reject) => {

			if (args.resource != 'stream'){
				reject(new Error('Resource Unsupported'))
				return
			}

		    if (!args.id) {
		        reject(new Error('No ID Specified'))
		        return
		    }

		    let results = []

		    let sentResponse = false

		    const respondStreams = () => {

		        if (sentResponse) return
		        sentResponse = true

		        if (results && results.length) {

		            tempResults = results

		            const streams = []

		            tempResults.forEach(stream => { streams.push(toStream(stream, args.type)) })

		            if (streams.length) {
		                if (config['Only MP4 Results']) {
		                    // use proxy to remove CORS
		                    helper.proxify(streams, (err, proxiedStreams) => {
		                        if (!err && proxiedStreams && proxiedStreams.length)
		                            resolve({ streams: proxiedStreams })
		                        else
		                            resolve({ streams })
		                    })
		                } else {
		                    resolve({ streams })
		                }
		            } else {
		                resolve({ streams: [] })
		            }
		        } else {
		            resolve({ streams: [] })
		        }
		    }

		    const idParts = args.id.split(':')

		    const imdbId = idParts[0]

		    needle.get('https://v3-cinemeta.strem.io/meta/' + args.type + '/' + imdbId + '.json', (err, resp, body) => {

		        if (body && body.meta && body.meta.name && body.meta.year) {

		            const searchQuery = {
		                name: body.meta.name,
		                year: body.meta.year,
		                type: args.type
		            }

		            if (idParts.length == 3) {
		                searchQuery.season = idParts[1]
		                searchQuery.episode = idParts[2]
		            }

		            openDirApi.search(config, searchQuery,

		                partialResponse = (tempResults) => {
		                    results = results.concat(tempResults)
		                },

		                endResponse = (tempResults) => {
		                    results = tempResults
		                    respondStreams()
		                })


		            if (config['Response timeout'])
		                setTimeout(respondStreams, config['Response timeout'])

		        } else {
		            resolve({ streams: [] })
		        }
		    })
		})
	}
}