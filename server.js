var ArtNet = require('artnet')
var controller = ArtNet.createController()

let $ = require('jquery')
let fs = require('fs')
let filename = 'nodeList.obscura'
// let n = 0
var nodes = []
var mode = 'live'
var showSubNodes = []

var node = []

var abc = ['A', 'B', 'C', 'D']

$('#update-table').on('click', () => {
  updateTable()
  drawTable()
})

$('#clear-all').on('lclick', () => {
  node = undefined
  drawTable()
})

$('#mode-live').on('click', () => {
  document.getElementById('mode-live').className = 'btn btn-primary active'
  document.getElementById('mode-setup').className = 'btn btn-default'
  document.getElementById('clear-all').setAttribute('disabled', 'disabled')
  document.getElementById('clear-offline').setAttribute('disabled', 'disabled')
  mode = 'live'
  updateTable()
})

$('#mode-setup').on('click', () => {
  document.getElementById('mode-setup').className = 'btn btn-primary active'
  document.getElementById('mode-live').className = 'btn btn-default'
  document.getElementById('clear-all').removeAttribute('disabled')
  document.getElementById('clear-offline').removeAttribute('disabled')
  mode = 'setup'
  drawTable()
})

function loadTable () {
  if (fs.existsSync('./nodeList.json')) {
    nodes = fs.readFileSync(filename, 'utf8').split('\n')
  } else {
    console.log('File Doesn\'t Exist. Creating new file.')
    fs.writeFile('./nodeList.json', '', (err) => {
      if (err) {
        console.log(err)
      }
    })
  }
  updateTable()
}

function updateTable () {
  for (let i = 0; i < node.length; i++) {
    node[i].status = 'Offline'
  }
  for (let i = 0; i < controller.nodes.length; i++) {
    // console.log(controller.nodes[i])
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
                break;
              case 'temp':
                var temp = report[r + 1]
                break;
              case 'fps':
                var fps = report[r + 1]
                break;
              case 'uUniPF':
                var uUniPF = report[r + 1]
                break;
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
      var report = controller.nodes[i].report.split(';')
      for (let r = 0; r < report.length; r++) {
        switch (report[r]) {
          case 'numOuts':
            var numOuts = report[r + 1]
            break;
          case 'temp':
            var temp = report[r + 1]
            break;
          case 'fps':
            var fps = report[r + 1]
            console.log(fps)
            break;
          default:

        }
      }
      //let [, numOuts, , numUniPOut, , temp, , fps, , uUniPF] = controller.nodes[i].report.split(';')
      let obj = {Fps: fps, uniUpdate: uUniPF, mac: controller.nodes[i].mac, name: controller.nodes[i].name, status: 'Online', version: controller.nodes[i].version, univers: portOutput, temperature: temp}
      node.push(obj)
    }
  }
  if (controller.nodes.length <= 0) {
    console.log('No ArtNet nodes found')
  }
  let jsonObj = JSON.stringify(node, null, '\t')
  fs.writeFile('./nodeList.json', jsonObj, (err) => {
    if (err) {
      console.log(err)
    }
  })

  if (mode === 'live') {
    setTimeout(updateTable, 1750)

    drawTable()
  }
}

function drawTable () {
  var table = document.getElementById('node-table-content')
  table.innerHTML = ''
  if (nodes.length > 0) {
    for (var i = 0; i < node.length; i++) {
      if (node[i].mac !== undefined) {
        // let rowCount = table.rows.length
        let row = table.insertRow(-1)
        let j = 0
        if (node[i].status === 'Online') {
          row.insertCell(j++).innerHTML = '<span class="label label-primary col-md-1">' + node[i].status + '</span>'
        } else if (node[i].status === 'Offline') {
          row.insertCell(j++).innerHTML = '<span class="label label-danger col-md-1">' + node[i].status + '</span>'
        }
        row.insertCell(j++).innerHTML = node[i].name
        row.insertCell(j++).innerHTML = node[i].mac
        row.insertCell(j++).innerHTML = node[i].net << 8 + node[i].sub
        row.insertCell(j++).innerHTML = node[i].Fps
        row.insertCell(j++).innerHTML = node[i].uniUpdate
        row.insertCell(j++).innerHTML = node[i].temperature + ' C°'
        row.insertCell(j++).innerHTML = node[i].version

        if (mode === 'live') {
          row.insertCell(j++).innerHTML = '<button type="button" class="btn btn-default btn-xs" id="' + i + '" aria-label="Settings" > <span class="glyphicon glyphicon-cog" aria-hidden="true"> </span> </button>'
        }
      }
    }
  }
}

function BlackLED (ip, mac, name, version, numOutputs, universesOutput, net, subnet, report, status) {
  this.ip = ip
  this.mac = mac
  this.name = name
  this.version = version
  this.numOutputs = numOutputs
  this.universesOutput = universesOutput
  this.net = net
  this.subnet = subnet
  this.report = report
  this.status = status
};

controller.refreshClients()
updateTable()
loadTable()
