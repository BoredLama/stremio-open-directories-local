
const modules = {
  set: data => {
    if (!Object.keys(modules.get).length)
      modules.get = data
  },
  get: {}
}

module.exports = modules
