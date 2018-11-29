const {app, BrowserWindow, ipcMain} = require('electron')
const url = require('url')
const path = require('path')

var env = process.argv[2]

if (env === 'dev') {
  require('electron-reload')(__dirname)
}

let mainWindow

let node = []
global.globalNode = node

let editClientWindow
let currentClientToEdit = 1

app.on('ready', function () {
  mainWindow = new BrowserWindow({width: 900, height: 950})
  mainWindow.eval = global.eval = function () {
    throw new Error(`Sorry, this app does not support window.eval().`)
  }
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, '/index/index.html'), protocol: 'file:', slashes: true
  }))
  mainWindow.on('closed', function () {
    mainWindow = null
    // TODO: close edit window in some way
  })
})

app.on('will-quit', function () {

})

app.on('window-all-closed', function () {
  // logger.verbose('window-all-closed')
  app.quit()
})

app.on('before-quit', function () {
  // logger.verbose('before-quit')
})

ipcMain.on('getClientToEdit', function (event) {
  // logger.warn('getClientToEdit')
  mainWindow.webContents.send('getClientInfo', currentClientToEdit)
  ipcMain.once('getClientInfo', function (evn, node) {
    // logger.warn(node)
    editClientWindow.webContents.send('getClientToEdit', node)
  })
})

ipcMain.on('editClient', function (event, n) {
  // logger.warn('Edit Client from ' + n)
  currentClientToEdit = n
  if (editClientWindow !== undefined && editClientWindow !== null) {
  } else {
    editClientWindow = new BrowserWindow({width: 400, height: 400, show: false, modal: true})
    editClientWindow.loadURL('file://' + __dirname + '/editClient/editClient.html')
    // logger.verbose('editClientWindow loaded')
    editClientWindow.on('closed', function () {
      // logger.verbose('editClientWindow closed')
      editClientWindow = null
    })
    editClientWindow.show()
  }
})
