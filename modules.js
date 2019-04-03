
const modules = {
  set: data => {
    if (!modules.get)
      modules.get = data
  },
  get: false
}

module.exports = modules
