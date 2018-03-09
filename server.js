let ArtNet = require('artnet')
let controller = ArtNet.createController()

const remote = require('electron').remote
const logger = remote.getGlobal('logger')
const fs = remote.getGlobal('fs')
const nodeList = remote.getGlobal('nodeList')
let node = remote.getGlobal('node')

let network = require('network')

let $ = require('jquery')

let Dnode

// let n = 0
let mode = 'live'
// let showSubNodes = []
// var abc = ['A', 'B', 'C', 'D']

$('#update-table').on('click', () => {
  logger.verbose({button: 'update-table'})
  updateTable()
  drawTable()
})

$('#clear-all').on('lclick', () => {
  logger.verbose({button: 'clear-all'})
  node = undefined
  drawTable()
})

$('#mode-live').on('click', () => {
  logger.verbose({button: 'mode-live'})
  document.getElementById('mode-live').className = 'btn btn-primary active'
  document.getElementById('mode-setup').className = 'btn btn-default'
  document.getElementById('clear-all').setAttribute('disabled', 'disabled')
  document.getElementById('clear-offline').setAttribute('disabled', 'disabled')
  mode = 'live'
  updateTable()
})

$('#mode-setup').on('click', () => {
  logger.verbose({button: 'mode-setup'})
  document.getElementById('mode-setup').className = 'btn btn-primary active'
  document.getElementById('mode-live').className = 'btn btn-default'
  document.getElementById('clear-all').removeAttribute('disabled')
  document.getElementById('clear-offline').removeAttribute('disabled')
  mode = 'setup'
  drawTable()
})

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
      let tmp = controller.nodes[i].net << 8 + controller.nodes[i].subnet << 4
      // for (int i = )
      // let
      let portOutput = []
      for (let g = 0; g < controller.nodes[i].numOutputs; g++) {
        portOutput[g] = tmp + controller.nodes[i].universesOutput[g]
      }
      let report = controller.nodes[i].report.split(';')
      for (let r = 0; r < report.length; r++) {
        switch (report[r]) {
          case 'temp':
            var temp = report[r + 1]
            break
          case 'fps':
            var fps = report[r + 1]
            break
          default:
        }
      }
      let obj = {Fps: fps, uniUpdate: uUniPF, mac: controller.nodes[i].mac, name: controller.nodes[i].name, status: 'Online', version: controller.nodes[i].version, univers: portOutput, temperature: temp}
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
  if (mode === 'live') {
    setTimeout(updateTable, 4000)
    drawTable()
    let jsonObj = JSON.stringify(node, null, '\t')
    logger.debug(jsonObj)
    fs.writeFileSync(nodeList, jsonObj)
  }
}

function compareMac (a, b) {
  if (a.mac < b.mac) {
    return -1
  }
  if (a.mac > b.mac) {
    return 1
  }
  return 0
}

function compareName (a, b) {
  if (a.name < b.name) {
    return -1
  }
  if (a.name > b.name) {
    return 1
  }
  return 0
}

function compareAddr (a, b) {
  let c = a.net << 8 + a.sub
  let d = a.net << 8 + a.sub
  if (c < d) {
    return -1
  }
  if (c > d) {
    return 1
  }
  return 0
}

function drawTable () {
  var table = document.getElementById('node-table-content')
  table.innerHTML = ''
  if (node.length > 0) {
    Dnode = node
    Dnode.sort(compareName)
    // Dnode.reverse()
    for (var i = 0; i < Dnode.length; i++) {
      if (Dnode[i].mac !== undefined) {
        // let rowCount = table.rows.length
        let row = table.insertRow(-1)
        let j = 0
        if (Dnode[i].status === 'Online') {
          row.insertCell(j++).innerHTML = '<span class="label label-primary col-md-1">' + Dnode[i].status + '</span>'
        } else if (Dnode[i].status === 'Offline') {
          row.insertCell(j++).innerHTML = '<span class="label label-danger col-md-1">' + Dnode[i].status + '</span>'
        }
        row.insertCell(j++).innerHTML = Dnode[i].name
        row.insertCell(j++).innerHTML = Dnode[i].mac
        row.insertCell(j++).innerHTML = Dnode[i].net << 8 + Dnode[i].sub
        row.insertCell(j++).innerHTML = Dnode[i].Fps
        row.insertCell(j++).innerHTML = Dnode[i].uniUpdate
        row.insertCell(j++).innerHTML = Dnode[i].temperature + ' C°'
        row.insertCell(j++).innerHTML = Dnode[i].version

        if (mode === 'live') {
          row.insertCell(j++).innerHTML = '<button type="button" class="btn btn-default btn-xs" id="' + i + '" aria-label="Settings" > <span class="glyphicon glyphicon-cog" aria-hidden="true"> </span> </button>'
        }
      }
    }
  }
}
updateTable()
controller.refreshClients()
