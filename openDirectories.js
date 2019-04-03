const helper = require('./helpers')
const modules = require('./modules')

const supportedFiles = ['mkv', 'mp4', 'avi', 'mov', 'mpg', 'wmv']

const openDirApi = {

	search: (config, query, cb, end) => {

		modules.get.google.resultsPerPage = config.perPage

		let searchQuery = query.name

		if (query.season && query.episode) {
			searchQuery += ' ' + helper.episodeTag(query.season, query.episode)
		}

		let allReqs = 0
		let doneReqs = 0

		const results = []

		modules.get.google(searchQuery + ' +(' + (config.onlyMP4 ? 'mp4' : supportedFiles.join('|')) + ') -inurl:(jsp|pl|php|html|aspx|htm|cf|shtml) intitle:index.of -inurl:(listen77|mp3raid|mp3toss|mp3drug|index_of|wallywashis)', (err, res) => {

		  if (err) {
		  	console.log(err.message || err)
		  	end([])
		  	return
		  }

		  if (!res || !res.links) {
		  	console.log('no google results')
		  	end([])
		  	return
		  }

		  for (var i = 0; i < res.links.length; ++i) {

		    const link = res.links[i]

		    if (link.title.startsWith('Index of')) {

		    	allReqs++

				modules.get.needle.get(link.href, {
					open_timeout: config.openTimeout,
					read_timeout: config.readTimeout,
					parse_response: false
				}, (err, resp) => {
					if (!err && resp && resp.body) {

						const $ = modules.get.cheerio.load(resp.body)

						let found = false;

						$('a').each(function() {

							let href = $(this).prop('href') || $(this).attr('href')

							if (!href) return

							if (!href.startsWith('http:') && !href.startsWith('https:'))
								href = link.href + href

							const parts = href.split('/')
							const filename = parts[parts.length -1]
							const extension = filename.split('.').pop()

							if (helper.isValid(filename, query.name, helper.episodeTag(query.season, query.episode))) {

								if (!config.onlyMP4 && supportedFiles.indexOf(extension.toLowerCase()) > -1)
									found = true
								else if (config.onlyMP4 && ['mp4'].indexOf(extension.toLowerCase()) > -1)
									found = true

								if (found) {
									const extraTag = helper.extraTag(filename.replace('.' + extension, ''), query.name, href)

									const newObj = {}

									newObj.extraTag = extraTag
									newObj.href = href
									newObj.filename = filename

									cb([newObj])

									results.push(newObj)

								}

							}

							if (found) {
								// break for loop
								return false
							}
						})

						doneReqs++

						if (allReqs == doneReqs)
							end(results)

					} else {

						doneReqs++

						if (allReqs == doneReqs)
							end(results)

					}
				})

			}

		  }

		})

	}
}

module.exports = openDirApi
