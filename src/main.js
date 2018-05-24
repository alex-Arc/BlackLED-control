const {app, BrowserWindow} = require('electron')
const remote = require('electron').remote
const url = require('url')
const path = require('path')

// require('electron-reload')(__dirname)

let mainWindow

// console.log('test 1 2 3!')
// console.log(process.env.NODE_ENV)

const fs = require('fs')
let nodeList = path.join(app.getPath('userData'), 'nodeList.json')
let logFolder = path.join(app.getPath('userData'), 'logs')
let logFile = path.join(logFolder, new Date().toISOString().replace(/:/g, '.') + '.log')

const logger = require('winston')
logger.clear()
// if (process.env.NODE_ENV !== 'production') {
logger.add(logger.transports.Console, {colorize: true, level: 'error'}) //  }
let node = []
global.fs = fs
global.nodeList = nodeList
global.logger = logger

function startUp () {
  loadFiles()
  logger.add(logger.transports.File, { filename: logFile, level: 'info', logstash: true })
  createWindow()
}

function createWindow () {
  mainWindow = new BrowserWindow({width: 900, height: 950})
  mainWindow.eval = global.eval = function () {
    throw new Error(`Sorry, this app does not support window.eval().`)
  }
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, '/html/index.html'), protocol: 'file:', slashes: true
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

function loadFiles () {
  fs.open(nodeList, 'r+', (err, fd) => {
    if (err) {
      if (err.code === 'ENOENT') {
        logger.verbose('no node file')
        return
      }
      logger.error('open1 error: ' + err.code)
      throw err
    } else {
      fs.readFile(nodeList, 'utf8', (err, data) => {
        if (err) throw err
        logger.verbose('reading from node file')
        logger.debug(data)
        node = JSON.parse(data)
      })
    }
  })
  global.node = node
  fs.open(logFolder, 'r', (err, fd) => {
    if (err) {
      if (err.code === 'EEXIST') {
        return
      }
      fs.mkdir(logFolder, (err) => {
        if (err) {
          logger.error('mkdir error')
          throw err
        }
      })
    }
  })
}
