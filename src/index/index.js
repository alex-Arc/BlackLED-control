let ArtNet = require('artnet')
let controller = ArtNet.createController()
const path = require('path')
const exec = require('child_process').exec

const {dialog} = require('electron').remote
const isWin = process.platform === 'win32'

const {remote, ipcRenderer} = require('electron')
let node = remote.getGlobal('globalNode')
// let node = []
let network = require('network')
let $ = require('jquery')

let mode = 'live'
let fieldMode = 'readonly'
// var pollTimeOut

const dgram = require('dgram')
// const client = dgram.createSocket('udp4')
const server = dgram.createSocket('udp4')
var fs = require('fs')

function execute (command, callback) {
  exec(command, (error, stdout, stderr) => {
    callback(error, stdout, stderr)
  })
}

let firmwarePieces
let fIndex = 0

server.bind(8050)

server.on('message', (msg, rinfo) => {
  // console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`)
  // console.log(msg[0])
  if (msg[0] === 10) {
    if (fIndex < firmwarePieces.length - 1) {
      console.log(firmwarePieces[fIndex] + '\t' + String(fIndex + 1), ' of ' + String(firmwarePieces.length - 1))
      let message = Buffer.from('firmware_line__' + firmwarePieces[fIndex] + '\n')
      fIndex++
      server.send(message, 0, message.length, 8050, rinfo.address, (err) => {
        if (err) console.log(err)
      })
      node[0].version = String(fIndex) + ' of ' + String(firmwarePieces.length)
    } else {
      console.log('firmware_line__' + ':flash ' + String(firmwarePieces.length - 1) + '\n')
      let message = Buffer.from('firmware_line__' + ':flash ' + String(firmwarePieces.length - 1) + '\n')
      server.send(message, 0, message.length, 8050, rinfo.address, (err) => {
        if (err) console.log(err)
      })
      node[0].version = 'DONE'
      console.log('DONE')
    }
  }
  drawTable()
})

document.addEventListener('keyup',
  function (e) {
    if (e.key === 'e') {
      let hexFile
      dialog.showOpenDialog(
        { filters: [ { name: 'Firmware', extensions: ['hex'] } ] },
        function (fileNames) {
          // fileNames is an array that contains all the selected
          if (fileNames === undefined) {
            console.log('No file selected')
          } else {
            hexFile = fs.readFileSync(fileNames[0], 'utf8')
            firmwarePieces = hexFile.split('\n')
            let message = Buffer.from([0x41, 0x72, 0x74, 0x2d, 0x4e, 0x65, 0x74, 0x00, 0x00, 0xf2])
            dialog.showMessageBox(
              { type: 'warning',
                buttons: ['OK', 'Cancel'],
                message: 'Do not turn off the node, this program og the network connection' },
              function (response) {
                console.log(response)
                if (response === 0) {
                  server.send(message, 6454, '2.8.82.67', (err) => {
                    console.error(err)
                  })
                  node[0].version = '0 of ' + String(firmwarePieces.length)
                  drawTable()
                }
              }
            )
          }
        })
    }
    if (e.key === 'u') {
      let hexFile
      dialog.showOpenDialog(
        { filters: [ { name: 'Firmware', extensions: ['hex'] } ] },
        function (fileNames) {
          // fileNames is an array that contains all the selected
          if (fileNames === undefined) {
            console.log('No file selected')
          } else {
            hexFile = fileNames[0]
            console.log(fileNames[0])
            let cmd
            if (isWin === true) {
              cmd = path.join(__dirname, '\\teensy_loader_cli.exe')
            } else {
              cmd = 'sudo '
              cmd += path.join(__dirname, '/teensy_loader_cli')
            }
            cmd += ' -mmcu=mk20dx256 -v -w '
            cmd += hexFile
            console.log(cmd)
            dialog.showMessageBox(
              { type: 'warning',
                buttons: ['OK', 'Cancel'],
                message: 'press reboot button on teensy then clik OK' },
              function (response) {
                console.log(response)
                if (response === 0) {
                  execute(cmd, (error, stdout, stderr) => {
                    let out = String(stdout)
                    console.log(out)
                    if (error !== null || stderr !== '') {
                      console.error(stderr)
                      console.error(error)
                      console.error(stdout)
                    } else if (out.includes('Booting')) {
                      dialog.showMessageBox({ type: 'info', message: 'Upload OK' })
                    }
                  })
                }
              }
            )
          }
        })
    }
    if (e.key === 'Escape') {
      let activeElm = document.activeElement
      if (activeElm.id.includes('addr_') || activeElm.id.includes('name_')) {
        let n = parseInt(activeElm.id[activeElm.id.length - 1])
        document.getElementById('name_' + n).value = node[n].name
        document.getElementById('addr_' + n).value = getStartAddr(n)
        setStatusOnline(n)
        drawStatusTable()
        console.log(n)
      }
    }
  },
  true /* grab event on tunnel, not on bubble */)

/*function pollTimeOutBar () {
  var elem = document.getElementById('pollBar')
  var width = 1
  var id = setInterval(frame, 10)
  function frame () {
    if (width <= 0) {
      clearInterval(id)
    } else {
      width = 100 - (((Date.now() - pollTimeOut) / 1000) / 4 * 100)
      elem.style.width = width + '%'
    }
  }
}*/

function clearTable () {
  node = []
  drawTable()
}

function clearOffline () {
  for (let i = 0; i < node.length; i++) {
    if (node[i].status === 'Offline') {
      node.splice(i)
    }
  }
  drawTable()
}

function setMode (newMode) {
  mode = newMode
  let liveBtn = document.getElementById('liveMode')
  let setupBtn = document.getElementById('setupMode')
  if (mode === 'live') {
    liveBtn.setAttribute('class', 'btn-primary')
    setupBtn.setAttribute('class', 'btn-default')
    fieldMode = 'readonly'
    updateTable()
  } else if (mode === 'setup') {
    liveBtn.setAttribute('class', 'btn-default')
    setupBtn.setAttribute('class', 'btn-primary')
    updateTable()
    fieldMode = ''
    clearTimeout(updateTable)
  }
}

ipcRenderer.on('getClientInfo', function (event, n) {
  console.log('send client info')
  console.log(node[n])
  ipcRenderer.send('getClientInfo', node[n])
})

function editClient (n) {
  console.log('editClient')
  node[n].status = 'Updating'
  ipcRenderer.send('editClient', n)
}

function resetClient (n) {
  node[n].status = 'Updating'
  drawTable()
  let newName = 'BlackLED_p' + node[n].numOuts + '_' + node[n].ip.slice(2).replace('.', ':').replace('.', ':')
  let newAddress = 0
  controller.updateClient(node[n].ip, newName, [(newAddress), (newAddress) * 1 + 1, (newAddress) * 1 + 2, (newAddress) * 1 + 3], node[n].locate)
}

function locateClient (n) {
  if (node[n].locate === false) {
    node[n].locate = true
    controller.updateClient(node[n].ip, node[n].name, undefined, true)
    drawTable()
  } else {
    node[n].locate = false
    controller.updateClient(node[n].ip, node[n].name, undefined, false)
    drawTable()
  }
}

function getStartAddr (n) {
  let addr = (node[n].net << 8) + (node[n].subnet << 4) + node[n].univers[0]
  return addr
}

function getNewStartAddr (n) {
  let newAddress = document.getElementById('addr_' + n).value
  // let addr = (node[n].net << 8) + (node[n].subnet << 4) + node[n].univers[0]
  return parseInt(newAddress)
}

function getEndAddr (n) {
  let addr = (node[n].net << 8) + (node[n].subnet << 4) + node[n].univers[0]
  addr += Math.ceil(node[n].numOuts * node[n].numUniPOut) - 1
  return addr
}

function getNewEndAddr (n) {
  let newAddress = document.getElementById('addr_' + n).value
  // let addr = (node[n].net << 8) + (node[n].subnet << 4) + node[n].univers[0]

  return parseInt(newAddress) + Math.ceil(node[n].numOuts * node[n].numUniPOut) - 1
}

function addrToNet (n) {
  return n >> 8
}

function addrToSubnet (n) {
  return (n & 0xF0) >> 4
}

function addrToUni (n) {
  return n & 0x0F
}

function applyNameAddrAll () {
  for (let i = 0; i < node.length; i++) {
    if (node.status === 'Updating' || node.status === 'updating-collision') {
      applyNameAddr(i)
    }
  }
  updateTable()
}

function applyNameAddr (n) {
  let newName = document.getElementById('name_' + n).value
  let newAddress = document.getElementById('addr_' + n).value
  controller.updateClient(node[n].ip, newName, [(newAddress), (newAddress) * 1 + 1, (newAddress) * 1 + 2, (newAddress) * 1 + 3], node[n].locate)
  node[n].name = newName
  node[n].net = addrToNet(newAddress)
  node[n].subnet = addrToSubnet(newAddress)
  node[n].univers[0] = addrToUni(newAddress)
  node[n].status = 'Updating'
  for (let i = 0; i < node.length; i++) {
    if (node[n].mac === node[i].mac) {
      // it's me
    } else {
      if (getStartAddr(n) >= getStartAddr(i) && getStartAddr(n) <= getEndAddr(i)) {
        node[n].status = 'updating-collision'
      } else if (getEndAddr(n) >= getStartAddr(i) && getEndAddr(n) <= getEndAddr(i)) {
        node[n].status = 'updating-collision'
      }
    }
  }
  drawRow(n)
}

function setStatusOnline (n) {
  // console.log('change online')
  node[n].status = 'Online'
  for (let i = 0; i < node.length; i++) {
    if (node[n].mac === node[i].mac) {
      // it's me
    } else {
      if (getStartAddr(n) >= getStartAddr(i) && getStartAddr(n) <= getEndAddr(i)) {
        node[n].status = 'online-collision'
      } else if (getEndAddr(n) >= getStartAddr(i) && getEndAddr(n) <= getEndAddr(i)) {
        node[n].status = 'online-collision'
      }
    }
  }
}

function uiUpdate (n) {
  getNodes()
  setStatusUpdating(n)
  drawStatusTable()
}
function setStatusUpdating (n) {
  let col = []
  console.log('change updating')
  node[n].status = 'Updating'
  for (let i = 0; i < node.length; i++) {
    if (node[n].mac === node[i].mac) {
      // it's me
    } else {
      if (getNewStartAddr(n) >= getNewStartAddr(i) && getNewStartAddr(n) <= getNewEndAddr(i)) {
        node[n].status = 'updating-collision'
        col.push(i)
      } else if (getNewEndAddr(n) >= getNewStartAddr(i) && getNewEndAddr(n) <= getNewEndAddr(i)) {
        node[n].status = 'updating-collision'
        col.push(i)
      }
    }
  }
  for (let i = 0; i < col.length; i++) {
    console.log('change updating ' + col[i])
    if (node[col[i]].status === 'Updating') {
      node[col[i]].status = 'updating-collision'
    } else if (node[col[i]].status === 'Online') {
      node[col[i]].status = 'online-collision'
    }
  }
}

network.get_interfaces_list(function (err, interfaceList) {
  if (err) {
    console.error(err)
  } else {
    console.log(interfaceList)
  }
})

function updateTable () {
  getNodes()
  drawTable()
  let elm = document.getElementById('updateButton')
  elm.classList.remove('puls')
  void elm.offsetWidth
  elm.classList.add('puls')
  if (mode === 'live') {
    pollTimeOut = Date.now()
    clearTimeout(updateTable)
    setTimeout(updateTable, 4000)
    // pollTimeOutBar()
  } else if (mode === 'setup') {
  }
}

function getNodes () {
  for (let i = 0; i < node.length; i++) {
    node[i].status = 'Offline'
  }
  for (let i = 0; i < controller.nodes.length; i++) {
    var newNode = true
    if (node.length > 0) {
      for (let j = 0; j < node.length; j++) {
        if (controller.nodes[i].mac === node[j].mac) {
          newNode = false
          var report = controller.nodes[i].report.split(';')
          for (let r = 0; r < report.length; r++) {
            switch (report[r]) {
              case 'numOuts':
                var numOuts = report[r + 1]
                break
              case 'numUniPOut':
                var numUniPOut = parseFloat(report[r + 1])
                break
              case 'temp':
                var temp = report[r + 1]
                break
              case 'fps':
                var fps = report[r + 1]
                break
              case 'uUniPF':
                var uUniPF = report[r + 1]
                break
              case 'build':
                var build = report[r + 1]
                break
              default:
            }
          }
          node[j].uniUpdate = uUniPF
          node[j].Fps = fps
          node[j].temperature = temp
          node[j].build = build
          if (getStartAddr(j) !== getNewStartAddr(j)) {
            setStatusUpdating(j)
          } else {
            setStatusOnline(j)
          }
          // node[j].status = 'Online'
          node[j].name = controller.nodes[i].name
          node[j].numOuts = numOuts
          node[j].numUniPOut = numUniPOut
          node[j].net = controller.nodes[i].net
          node[j].subnet = controller.nodes[i].subnet
          node[j].univers = controller.nodes[i].universesOutput
          node[j].version = controller.nodes[i].version
        }
      }
    }
    if (newNode === true) {
      let obj = { mac: controller.nodes[i].mac, ip: controller.nodes[i].ip, name: controller.nodes[i].name, status: 'Online', version: controller.nodes[i].version, net: controller.nodes[i].net, subnet: controller.nodes[i].subnet, univers: controller.nodes[i].universesOutput, locate: false }
      node.push(obj)
    }
  }
}

function createRow (i) {
  var table = document.getElementById('node-table-content')
  let rowCount = table.getAttribute('rowCount')
}

function drawStatusTable () {
  for (let i = 0; i < node.length; i++) {
    let row = document.getElementById(i)
    let newAddress = document.getElementById('addr_' + i).value

    // row.innerHTML = ''
    let j = 0
    if (node[i].status === 'Online') {
      row.cells[j++].innerHTML = '<div class="statusCircle online"></div>'
    } else if (node[i].status === 'Offline') {
      row.cells[j++].innerHTML = '<div class="statusCircle offline"></div>'
    } else if (node[i].status === 'Updating') {
      row.cells[j++].innerHTML = '<div class="statusCircle updating"></div>'
    } else if (node[i].status === 'updating-collision') {
      row.cells[j++].innerHTML = '<div class="statusCircle updating-collision"></div>'
    } else if (node[i].status === 'online-collision') {
      row.cells[j++].innerHTML = '<div class="statusCircle online-collision"></div>'
    }

    if (node[i].numOuts !== undefined) {
      let addr = getStartAddr(i)
      if (addr !== parseInt(newAddress)) {
        row.cells[3].innerHTML = parseInt(newAddress) + Math.ceil(node[i].numOuts * node[i].numUniPOut) - 1
        row.cells[3].setAttribute('class', 'statusText updating')
      } else {
        row.cells[3].innerHTML = addr + Math.ceil(node[i].numOuts * node[i].numUniPOut) - 1
        row.cells[3].setAttribute('class', '')
      }
    } else {
      row.cells[3].innerHTML = ''
    }
  }
}

function drawTable () {
  let fpsDisp = document.getElementById('fpsDisp')
  fpsDisp.innerHTML = 'Master Fps: ' + Math.round(controller.fps)
  var table = document.getElementById('node-table-content')
  table.innerHTML = ''
  for (var i = 0; i < node.length; i++) {
    if (node[i].mac !== undefined) {
      // let rowCount = table.rows.length
      let row = table.insertRow(-1)
      row.setAttribute('id', i)
      let j = 0
      if (node[i].status === 'Online') {
        row.insertCell(j++).innerHTML = '<div class="statusCircle online"></div>'
      } else if (node[i].status === 'Offline') {
        row.insertCell(j++).innerHTML = '<div class="statusCircle offline"></div>'
      } else if (node[i].status === 'Updating') {
        row.insertCell(j++).innerHTML = '<div class="statusCircle updating"></div>'
      } else if (node[i].status === 'updating-collision') {
        row.insertCell(j++).innerHTML = '<div class="statusCircle updating-collision"></div>'
      } else if (node[i].status === 'online-collision') {
        row.insertCell(j++).innerHTML = '<div class="statusCircle online-collision"></div>'
      }
      row.insertCell(j++).innerHTML = '<input type="text" id="name_' + i + '" oninput="uiUpdate(' + i + ')" value="' + node[i].name + '" ' + fieldMode + '>'
      // row.insertCell(j++).innerHTML = node[i].mac
      let addr = getStartAddr(i)
      row.insertCell(j++).innerHTML = '<input type="text" style="width: 45px;" oninput="uiUpdate(' + i + ')" id="addr_' + i + '" value="' + addr + '" ' + fieldMode + '>'
      if (node[i].numOuts !== undefined) {
        row.insertCell(j++).innerHTML = addr + Math.ceil(node[i].numOuts * node[i].numUniPOut) - 1
      } else {
        row.insertCell(j++).innerHTML = ''
      }
      row.insertCell(j++).innerHTML = node[i].numOuts
      row.insertCell(j++).innerHTML = node[i].uniUpdate
      row.insertCell(j++).innerHTML = node[i].Fps
      // row.insertCell(j++).innerHTML = '<button class="btn-default" onClick="editClient(' + i + ')">Edit</button>'
      // row.insertCell(j++).innerHTML = node[i].temperature + ' C°'
      if (node[i].version >= 0.10) {
        // row.insertCell(j++).innerHTML = '<button class="btn-default" onClick="resetClient(' + i + ')">RESET</button>'
        if (node[i].locate === false) {
          row.insertCell(j++).innerHTML = '<button class="btn-default" onClick="locateClient(' + i + ')">LOCATE</button>'
        } else {
          row.insertCell(j++).innerHTML = '<button class="btn-primary" onClick="locateClient(' + i + ')">LOCATE</button>'
        }
      } else {
        row.insertCell(j++).innerHTML = ''
      }
      if (mode === 'setup') {
        row.insertCell(j++).innerHTML = '<button class="btn-default" onClick="applyNameAddr(' + i + ')">APPLY</button>'
      } else if (mode === 'live') {
        row.insertCell(j++).innerHTML = ''
      }
      row.insertCell(j++).innerHTML = node[i].version
      // row.insertCell(j++).innerHTML = ((node[i].build === undefined) ? 'NA' : node[i].build)
    }
  }
}

window.onload = function () {
  controller.refreshClients()
  updateTable()
}
