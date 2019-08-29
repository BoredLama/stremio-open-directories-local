const helper = require('./helpers')
const google = require('google-it')
const needle = require('needle')
const cheerio = require('cheerio')
const { config } = require('internal')

const supportedFiles = ['mkv', 'mp4', 'avi', 'mov', 'mpg', 'wmv']

const openDirApi = {

	search: (query, cb, end) => {

		let searchQuery = query.name

		let episodeTag

		if (query.type == 'series') {
			episodeTag = helper.episodeTag(query.season, query.episode)
			searchQuery += ' ' + episodeTag
		}

		let allReqs = 0
		let doneReqs = 0

		const results = []

		google({ limit: config.perPage, query: searchQuery + ' +(' + (config.onlyMP4 ? 'mp4' : supportedFiles.join('|')) + ') -inurl:(jsp|pl|php|html|aspx|htm|cf|shtml) intitle:index.of -inurl:(listen77|mp3raid|mp3toss|mp3drug|index_of|wallywashis)' }).then(res => {

		  if (!res || !res.length || !Array.isArray(res)) {
		  	console.log('no google results')
		  	end([])
		  	return
		  }

		  res = res.filter(el => {
		  	if (el.link.startsWith('https://translate.'))
		  		return false
		  	return true
		  })

		  for (var i = 0; i < res.length; ++i) {

		    const link = res[i]

		    if (link.title.startsWith('Index of')) {

		    	allReqs++

				needle.get(link.link, {
					open_timeout: config.openTimeout,
					read_timeout: config.readTimeout,
					parse_response: false
				}, (err, resp) => {

					if (!err && resp && resp.body) {

						const $ = cheerio.load(resp.body)

						let found = false;

						$('a').each(function() {

							let href = $(this).prop('href') || $(this).attr('href')

							if (!href) return

							if (!href.startsWith('http:') && !href.startsWith('https:'))
								href = link.link + href

							const parts = href.split('/')
							const filename = parts[parts.length -1]
							const extension = filename.split('.').pop()

							if (helper.isValid(filename, query.name, episodeTag)) {

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

		}).catch(err => {
		  	console.log(err.message || err)
		  	end([])
		})

	}
}

module.exports = openDirApi
