let ArtNet = require('artnet')
let controller = ArtNet.createController()

const remote = require('electron').remote
const logger = remote.getGlobal('logger')
const fs = remote.getGlobal('fs')
const nodeList = remote.getGlobal('nodeList')
// let node = remote.getGlobal('node')
let node = []
let network = require('network')

let $ = require('jquery')

network.get_interfaces_list(function (err, interfaceList) {
  if (err) {
    logger.error(err)
  } else {
    logger.verbose(interfaceList)
  }
})

function updateTable () {
  for (let i = 0; i < node.length; i++) {
    node[i].status = 'Offline'
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
              default:
            }
          }
          node[j].uniUpdate = uUniPF
          node[j].Fps = fps
          node[j].temperature = temp
          node[j].status = 'Online'
        }
      }
    }
    if (newNode === true) {
      let obj = {mac: controller.nodes[i].mac, name: controller.nodes[i].name, status: 'Online', version: controller.nodes[i].version, net: controller.nodes[i].net, subnet: controller.nodes[i].subnet, univers: controller.nodes[i].universesOutput}
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
  fs.writeFileSync(nodeList, jsonObj)
  setTimeout(updateTable, 4000)
}

function drawTable () {
  // let fpsDisp = document.getElementById('Fps-disp')
  // fpsDisp.innerHTML = 'Master Fps: ' + Math.round(controller.fps)
  var table = document.getElementById('node-table-content')
  table.innerHTML = ''
  console.log('draw ' + node.length)
  for (var i = 0; i < node.length; i++) {
    if (node[i].mac !== undefined) {
      // let rowCount = table.rows.length
      let row = table.insertRow(-1)
      let j = 0
      if (node[i].status === 'Online') {
        row.insertCell(j++).innerHTML = '<span>' + node[i].status + '</span>'
      } else if (node[i].status === 'Offline') {
        row.insertCell(j++).innerHTML = '<span>' + node[i].status + '</span>'
      }
      row.insertCell(j++).innerHTML = node[i].name
      // row.insertCell(j++).innerHTML = node[i].mac
      let addr = (node[i].net << 8) + (node[i].subnet << 4) + node[i].univers[0]
      row.insertCell(j++).innerHTML = addr
      // row.insertCell(j++).innerHTML = node[i].Fps
      // row.insertCell(j++).innerHTML = node[i].uniUpdate
      // row.insertCell(j++).innerHTML = node[i].temperature + ' C°'
      row.insertCell(j++).innerHTML = '<button class="btn-default">RESET</button>'
    }
  }
}
window.onload = function () {
  updateTable()
  controller.refreshClients()
}
