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

$('#show-subTable').on('click', () => {
  for (let i = 0; i < node.length; i++) {
    showSubNode(i)
  }
})

function showSubNode (n) {
  console.log('show node ' + n)
  if (showSubNodes[n] === true) {
    showSubNodes[n] = false
  } else {
    showSubNodes[n] = true
  }
  drawTable()
}
// function addEntry (bindIndex, ip, mac, name, version, numOutputs, universesOutput, net, subnet, report, status) {
//   //  if(mac && net){
//   n++
//   var obj = {MAC: mac, NAME: name, BIND: bindIndex}
//   var jsonObj = JSON.stringify(obj)
//   fs.appendFile('./nodeList.obscura', jsonObj + '\n')
//   //  }
// }

function loadTable () {
  if (fs.existsSync('./nodeList.obscura')) {
    let data = fs.readFileSync(filename, 'utf8').split('\n')
    data.forEach((node, index) => {
      let [ ip, mac, name, version, numOutputs, universesOutput, net, subnet, report, status ] = node.split(',')
      //  addEntry(ip, mac, name, version, numOutputs, universesOutput, net, subnet, report, status)
      nodes.push(new BlackLED(ip, mac, name, version, numOutputs, universesOutput, net, subnet, report, status))
    })
  } else {
    console.log('File Doesn\'t Exist. Creating new file.')
    fs.writeFile('./nodeList.obscura', '', (err) => {
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
    var newSubNode = true
    if (node.length > 0) {
      for (let j = 0; j < node.length; j++) {
        if (controller.nodes[i].mac === node[j].mac) {
          newNode = false
          node[j].status = 'Online'
          for (let g = 0; g < node[j].subNode.length; g++) {
            if (controller.nodes[i].BindIndex === node[j].subNode[g].BindIndex) {
              newSubNode = false
            }
          }
          if (newSubNode === true) {
            let tmp = controller.nodes[i].net << 8 + controller.nodes[i].subnet << 4
            let portOutput = []
            for (let g = 0; g < controller.nodes[i].numOutputs; g++) {
              portOutput[g] = tmp + controller.nodes[i].universesOutput[g]
            }
            let obj = {BindIndex: controller.nodes[i].BindIndex, univers: portOutput}
            node[j].subNode.push(obj)
          }
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
      let obj = {mac: controller.nodes[i].mac, name: controller.nodes[i].name, status: 'Online', version: controller.nodes[i].version, subNode: [{BindIndex: controller.nodes[i].BindIndex, univers: portOutput}]}
      node.push(obj)
    }
  }
  if (controller.nodes.length <= 0) {
    console.log('No ArtNet nodes found')
  }
  let jsonObj = JSON.stringify(node)
  fs.writeFile('./nodeList.obscura', jsonObj, (err) => {
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
        if (showSubNodes[i] === true) {
          row.insertCell(j++).innerHTML = '<button type="button" class="btn btn-default btn-xs" id="' + i + '" aria-label="show sub nodes" onClick="showSubNode(' + i + ')"> <span class="glyphicon glyphicon-menu-down" aria-hidden="true"> </span> </button>'
        } else {
          row.insertCell(j++).innerHTML = '<button type="button" class="btn btn-default btn-xs" id="' + i + '" aria-label="show sub nodes" onClick="showSubNode(' + i + ')"> <span class="glyphicon glyphicon-menu-right" aria-hidden="true"> </span> </button>'
        }

        if (node[i].status === 'Online') {
          row.insertCell(j++).innerHTML = '<span class="label label-primary col-md-1">' + node[i].status + '</span>'
        } else if (node[i].status === 'Offline') {
          row.insertCell(j++).innerHTML = '<span class="label label-danger col-md-1">' + node[i].status + '</span>'
        }
        row.insertCell(j++).innerHTML = node[i].name
        row.insertCell(j++).innerHTML = node[i].mac
        row.insertCell(j++).innerHTML = node[i].net << 8 + node[i].sub
        row.insertCell(j++).innerHTML = node[i].version
        // rowCount = table.rows.length

        if (showSubNodes[i] === true) {
          for (let g = 0; g < node[i].subNode.length; g++) {
            row = table.insertRow(-1)
            row.insertCell(-1).innerHTML = '#' + node[i].subNode[g].BindIndex
            for (let y = 0; y < 4; y++) {
              row.insertCell(-1).innerHTML = 'Port.' + abc[y] + ' ' + node[i].subNode[g].univers[y]
            }
          }
        }
      //   if (mode == 'live') {
      //     if(nodes[i].status == 'Online'){
      //       row.insertCell(j++).innerHTML = '<span class='label label-primary col-md-1'>' + nodes[i].status + '</span>'
      //     }else if(nodes[i].status == 'Offline') {
      //       row.insertCell(j++).innerHTML = '<span class='label label-danger col-md-1'>' + nodes[i].status + '</span>'
      //     }
      //     row.insertCell(j++).innerHTML = nodes[i].name
      //     row.insertCell(j++).innerHTML = nodes[i].mac
      //     row.insertCell(j++).innerHTML = nodes[i].mac
      //     row.insertCell(j++).innerHTML = nodes[i].version
      //     // row.insertCell(3).innerHTML ='<button type='button' class='btn btn-default' aria-label='cofig'> <span class='glyphicon glyphicon-cog' aria-hidden='true'></span></button>'
      //   }else if (mode = 'setup') {
      //     if(nodes[i].status == 'Online'){
      //       row.insertCell(j++).innerHTML = '<span class='label label-primary'>' + nodes[i].status + '</span>'
      //     }else if(nodes[i].status == 'Offline') {
      //       row.insertCell(j++).innerHTML = '<span class='label label-danger'>' + nodes[i].status + '</span>'
      //     }
      //     row.insertCell(j++).innerHTML = '<p onclick='newNodeName(''+nodes[i].mac +'')>' + nodes[i].name + '</p>'
      //     row.insertCell(j++).innerHTML = nodes[i].mac
      //     row.insertCell(j++).innerHTML = nodes[i].version
      //     row.insertCell(j++).innerHTML ='<button type='button' class='btn btn-default' aria-label='cofig'> <span class='glyphicon glyphicon-cog' aria-hidden='true'></span></button>'
      //   }
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
