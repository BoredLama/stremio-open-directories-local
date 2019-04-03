
const modules = require('./modules').get

const helper = {

    episodeTag: (season, episode) => {
        return 'S' + ('0' + season).slice(-2) + 'E' + ('0' + episode).slice(-2)
    },

    simpleName: (name) => {

        // Warning: black magic ahead

        name = name.replace(/\.|_|\-|\–|\(|\)|\[|\]|\:|\,/g, ' ') // remove all unwanted characters
        name = name.replace(/\s+/g, ' ') // remove duplicate spaces
        name = name.replace(/\\\\/g, '\\').replace(new RegExp('\\\\\'|\\\'|\\\\\"|\\\"', 'g'), '') // remove escaped quotes

        return name
    },

    extraTag: (name, searchQuery, href, queryObj) => {

        // Warning: black magic ahead

        try {
            name = decodeURIComponent(name)
        } catch(e) {}

        const parsedName = modules['video-name-parser'](name + '.mp4')

        let extraTag = helper.simpleName(name)

        searchQuery = helper.simpleName(searchQuery)

        // remove search query from torrent title
        extraTag = extraTag.replace(new RegExp(searchQuery, 'gi'), '')

        // remove parsed movie/show title from torrent title
        extraTag = extraTag.replace(new RegExp(parsedName.name, 'gi'), '')

        // remove year
        if (parsedName.year)
            extraTag = extraTag.replace(parsedName.year+'', '')


        if (queryObj) {
            parsedName.season = parsedName.season || queryObj.season || false

            if (!parsedName.episode || !parsedName.expisode.length && queryObj.episode)
                parsedName.episode = [queryObj.episode]
        }

        console.log(parsedName)
        console.log(name)

        // remove episode tag
        if (parsedName.season && parsedName.episode && parsedName.episode.length)
            extraTag = extraTag.replace(new RegExp(helper.episodeTag(parsedName.season, parsedName.episode[0]), 'gi'), '')

        // send to barber shop
        extraTag = extraTag.trim()

        let extraParts = extraTag.split(' ')

        // scenarios where extraTag starts with '06', and it refers to 'S03E01-06'
        // in this case we'll add the episode tag back in the title so it makes sense
        if (parsedName.season && parsedName.episode && parsedName.episode.length) {
            if (extraParts[0] && (extraParts[0] + '').length == 2 && !isNaN(extraParts[0])) {
                const possibleEpTag = helper.episodeTag(parsedName.season, parsedName.episode[0]) + '-' + extraParts[0]
                if (name.toLowerCase().includes(possibleEpTag.toLowerCase())) {
                    extraParts[0] = possibleEpTag
                }
            }
        }

        const foundPart = name.toLowerCase().indexOf(extraParts[0].toLowerCase())

        if (foundPart > -1) {

            // clean up extra tags, we'll allow more characters here
            extraTag = name.substr(foundPart).replace(/_|\(|\)|\[|\]|\,/g, ' ')

            // remove dots
            if ((extraTag.match(/\./g) || []).length > 0)
                extraTag = extraTag.replace(/\./g, ' ')

            // remove duplicate space
            extraTag = extraTag.replace(/\s+/g,' ')

        }

        if (!extraTag) {
            if (href.toLowerCase().includes('1080p'))
                extraTag = '1080p'
            else if (href.toLowerCase().includes('720p'))
                extraTag = '720p'
            else if (href.toLowerCase().includes('480p'))
                extraTag = '480p'
            else if (href.toLowerCase().includes('360p'))
                extraTag = '360p'
        }

        if (extraTag)
            try {
                extraTag = decodeURIComponent(extraTag)
            } catch(e) {}

        return extraTag

    },

    isValid: (filename, queryName, epTag) => {

        // make sure the filename includes the search query and episode tag (if applicable)

        let valid = false

        filename = helper.simpleName(filename)
        queryName = helper.simpleName(queryName)

        if (filename.toLowerCase().includes(queryName.toLowerCase())) {
            if (epTag) {
                if (filename.toLowerCase().includes(epTag.toLowerCase())) {
                    valid = true
                }
            } else {
                valid = true
            }
        }

        return valid

    }

}

module.exports = helper
