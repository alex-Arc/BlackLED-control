let ArtNet = require('artnet')
let controller = ArtNet.createController()

const {remote, ipcRenderer} = require('electron')
const logger = remote.getGlobal('logger')
let node = remote.getGlobal('globalNode')
// let node = []
let network = require('network')
let $ = require('jquery')

let mode = 'live'
let fieldMode = 'readonly'
var pollTimeOut

function pollTimeOutBar () {
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
}

function clearTable () {
  node = []
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

function getEndAddr (n) {
  let addr = (node[n].net << 8) + (node[n].subnet << 4) + node[n].univers[0]
  addr += (node[n].numOuts * 3)
  return addr
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
  setTimeout(updateTable, 1000)
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

function setStatusUpdating (n) {
  console.log('change')
  if (node[n].status === 'Updating' || node[n].status === 'updating-collision') {
  } else {
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
}

network.get_interfaces_list(function (err, interfaceList) {
  if (err) {
    logger.error(err)
  } else {
    logger.verbose(interfaceList)
  }
})

function updateTable () {
  for (let i = 0; i < node.length; i++) {
    if (node[i].status === 'Updating' || node[i].status === 'updating-collision') {
    } else {
      node[i].status = 'Offline'
    }
  }
  for (let i = 0; i < controller.nodes.length; i++) {
    logger.verbose(controller.nodes[i])
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
          if (node[i].status === 'Updating' || node[i].status === 'updating-collision') {
            if (node[j].net === controller.nodes[i].net && node[j].subnet === controller.nodes[i].subnet && node[j].univers === controller.nodes[i].universesOutput) {

            }
          } else {
            node[j].status = 'Online'
            node[j].name = controller.nodes[i].name
            node[j].numOuts = numOuts
            node[j].net = controller.nodes[i].net
            node[j].subnet = controller.nodes[i].subnet
            node[j].univers = controller.nodes[i].universesOutput
          }
        }
      }
    }
    if (newNode === true) {
      let obj = {mac: controller.nodes[i].mac, ip: controller.nodes[i].ip, name: controller.nodes[i].name, status: 'Online', version: controller.nodes[i].version, net: controller.nodes[i].net, subnet: controller.nodes[i].subnet, univers: controller.nodes[i].universesOutput, locate: false}
      node.push(obj)
    }
  }
  if (node.length <= 0) {
    logger.warn({numNodes: 0})
  } else {
    let nodeLog = {numNodes: node.length, numOfflineNodes: 0, offlineNodes: []}
    for (let i = 0; i < node.length; i++) {
      if (node[i].status === 'Offline') {
        nodeLog.offlineNodes.push(node[i].name)
        nodeLog.numOfflineNodes++
      }
    }
    logger.info(nodeLog)
    logger.debug(node)
  }
  logger.info({currentFPS: controller.fps})
  drawTable()
  let jsonObj = JSON.stringify(node, null, '\t')
  logger.debug(jsonObj)
  if (mode === 'live') {
    pollTimeOut = Date.now()
    setTimeout(updateTable, 4000)
    pollTimeOutBar()
  } else if (mode === 'setup') {
  }
}

function drawRow (i) {
  let row = document.getElementById(i)
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
  row.cells[j++].innerHTML = '<input type="text" id="name_' + i + '" oninput="setStatusUpdating(' + i + ')" value="' + node[i].name + '" ' + fieldMode + '>'
  // row.cells[j++].innerHTML = node[i].mac
  let addr = (node[i].net << 8) + (node[i].subnet << 4) + node[i].univers[0]
  row.cells[j++].innerHTML = '<input type="text" style="width: 45px;" id="addr_' + i + '" value="' + addr + '" ' + fieldMode + '>'
  if (node[i].numOuts !== undefined) {
    row.cells[j++].innerHTML = addr + (node[i].numOuts * 3)
  } else {
    row.cells[j++].innerHTML = ''
  }
  row.cells[j++].innerHTML = node[i].numOuts
  row.cells[j++].innerHTML = node[i].uniUpdate
  row.cells[j++].innerHTML = node[i].Fps
  // row.cells[j++].innerHTML = '<button class="btn-default" onClick="editClient(' + i + ')">Edit</button>'
  // row.cells[j++].innerHTML = node[i].temperature + ' C°'
  // row.cells[j++].innerHTML = node[i].version
  // row.cells[j++].innerHTML = ((node[i].build === undefined) ? 'NA' : node[i].build)
  if (node[i].version >= 0.10) {
    // row.cells[j++].innerHTML = '<button class="btn-default" onClick="resetClient(' + i + ')">RESET</button>'
    if (node[i].locate === false) {
      row.cells[j++].innerHTML = '<button class="btn-default" onClick="locateClient(' + i + ')">LOCATE</button>'
    } else {
      row.cells[j++].innerHTML = '<button class="btn-primary" onClick="locateClient(' + i + ')">LOCATE</button>'
    }
  } else {
    row.cells[j++].innerHTML = ''
  }
  if (mode === 'setup') {
    row.cells[j++].innerHTML = '<button class="btn-default" onClick="applyNameAddr(' + i + ')">APPLY</button>'
  } else if (mode === 'live') {
    row.cells[j++].innerHTML = ''
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
      } else {
        row.insertCell(j++).innerHTML = '<div class="statusCircle updating"></div>'
      }
      row.insertCell(j++).innerHTML = '<input type="text" id="name_' + i + '" oninput="setStatusUpdating(' + i + ')" value="' + node[i].name + '" ' + fieldMode + '>'
      // row.insertCell(j++).innerHTML = node[i].mac
      let addr = (node[i].net << 8) + (node[i].subnet << 4) + node[i].univers[0]
      row.insertCell(j++).innerHTML = '<input type="text" style="width: 45px;" id="addr_' + i + '" value="' + addr + '" ' + fieldMode + '>'
      if (node[i].numOuts !== undefined) {
        row.insertCell(j++).innerHTML = addr + (node[i].numOuts * 3)
      } else {
        row.insertCell(j++).innerHTML = ''
      }
      row.insertCell(j++).innerHTML = node[i].numOuts
      row.insertCell(j++).innerHTML = node[i].uniUpdate
      row.insertCell(j++).innerHTML = node[i].Fps
      // row.insertCell(j++).innerHTML = '<button class="btn-default" onClick="editClient(' + i + ')">Edit</button>'
      // row.insertCell(j++).innerHTML = node[i].temperature + ' C°'
      // row.insertCell(j++).innerHTML = node[i].version
      // row.insertCell(j++).innerHTML = ((node[i].build === undefined) ? 'NA' : node[i].build)
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
    }
  }
}

window.onload = function () {
  controller.refreshClients()
  updateTable()
}
