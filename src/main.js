const {app, BrowserWindow} = require('electron')
const remote = require('electron').remote
const url = require('url')
const path = require('path')

require('electron-reload')(__dirname)

let mainWindow

// console.log('test 1 2 3!')
// console.log(process.env.NODE_ENV)

let logFolder = path.join(app.getPath('userData'), 'logs')
let logFile = path.join(logFolder, new Date().toISOString().replace(/:/g, '.') + '.log')

const logger = require('winston')
logger.clear()
// if (process.env.NODE_ENV !== 'production') {
logger.add(logger.transports.Console, {colorize: true, level: 'error'}) //  }

global.logger = logger

function startUp () {
  logger.add(logger.transports.File, { filename: logFile, level: 'info', logstash: true })
  createWindow()
  // require('./menu/mainmenu')
}

function createWindow () {
  mainWindow = new BrowserWindow({width: 900, height: 950})
  mainWindow.eval = global.eval = function () {
    throw new Error(`Sorry, this app does not support window.eval().`)
  }
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, '/index/index.html'), protocol: 'file:', slashes: true
  }))
  mainWindow.on('closed', function () {
    logger.verbose('window closed')
    mainWindow = null
  })
}

app.on('ready', startUp)

app.on('will-quit', function () {
  logger.verbose('will-quit')
})

app.on('window-all-closed', function () {
  logger.verbose('window-all-closed')
  app.quit()
})

app.on('before-quit', function () {
  logger.verbose('before-quit')
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})
