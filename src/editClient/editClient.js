const {remote, ipcRenderer} = require('electron')
const logger = remote.getGlobal('logger')

let currentClientToEdit = {}
console.log('open')

ipcRenderer.on('getClientToEdit', function (event, n) {
  currentClientToEdit = n
  document.title = currentClientToEdit.name
  console.log('node to edit: ' + currentClientToEdit.name)

  let addr = (currentClientToEdit.net << 8) + (currentClientToEdit.subnet << 4) + currentClientToEdit.univers[0]
  let filed = document.getElementById('Address')
  filed.setAttribute('value', addr)
  filed = document.getElementById('Name')
  filed.setAttribute('value', currentClientToEdit.name)
})

ipcRenderer.send('getClientToEdit')
