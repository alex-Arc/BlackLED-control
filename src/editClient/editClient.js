const {remote, ipcRenderer} = require('electron')
const logger = remote.getGlobal('logger')
let node = remote.getGlobal('node')

let currentClientToEdit = 0

ipcRenderer.on('getClientToEdit', function (event, n) {
  logger.warn('getClientToEdit is ' + n)
  currentClientToEdit = n
})
ipcRenderer.send('getClientToEdit')

document.title = node[currentClientToEdit].name
logger.warn('node to edit ' + node[currentClientToEdit].name)
