let openDirApi

module.exports = {
	manifest: { 
		"id": "org.stremio.opendir",
		"version": "1.0.0",

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
	handler: (args, local) => {
		const modules = local.modules
		const config = local.config
		const proxy = modules.internal.proxy
		const cinemeta = modules.internal.cinemeta
		return new Promise((resolve, reject) => {

			if (!openDirApi)
				openDirApi = require(modules.path.join(__dirname, 'openDirectories.js'))(modules)

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

				const toStream = (newObj, type) => {
				    return {
				        name: modules.url.parse(newObj.href).host,
				        type: type,
				        url: newObj.href,
				        // presume 480p if the filename has no extra tags
				        title: newObj.extraTag || '480p'
				    }
				}

		        if (sentResponse) return
		        sentResponse = true

		        if (results && results.length) {

		            tempResults = results

		            const streams = []

		            tempResults.forEach(stream => { streams.push(toStream(stream, args.type)) })

		            if (streams.length) {
		                if (config.onlyMP4)
		                    resolve({ streams: proxy.addAll(streams) })
		                else
		                    resolve({ streams })
		            } else
		                resolve({ streams: [] })
		        } else
		            resolve({ streams: [] })
		    }

		    const idParts = args.id.split(':')

		    const imdb = idParts[0]

		    cinemeta.get({ type: args.type, imdb }).then(meta => {

		        if (meta) {

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


		            if (config.respTimeout)
		                setTimeout(respondStreams, config.respTimeout)

		        } else {
		            resolve({ streams: [] })
		        }
		    }).catch(err => {
			reject(err)
		    })
		})
	}
}
