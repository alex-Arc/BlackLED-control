var ArtNet = require('artnet');
var controller = ArtNet.createController();

let $ = require('jquery');
let fs = require('fs');
let filename = 'nodeList.obscura'
let n = 0
var nodes = []


$('#update-list').on('click', () => {
  updateTable()
})

function addEntry(ip, mac, name, version, numOutputs, universesOutput, net, subnet, report, status) {
   if(mac && net){
      n++
      let updateString ='<tr><th>'+ status + '</th><th>'+ name +'</th><th>' + mac +'</th></tr>'
      $('#node-table').append(updateString)
   }
}
function loadTable() {
  if(fs.existsSync("./nodeList.obscura")){
    let data = fs.readFileSync(filename, 'utf8').split('\n')
    data.forEach((node, index) => {
       let [ ip, mac, name, version, numOutputs, universesOutput, net, subnet, report, status ] = node.split(',')
      //  addEntry(ip, mac, name, version, numOutputs, universesOutput, net, subnet, report, status)
       nodes.push(new BlackLED(ip, mac, name, version, numOutputs, universesOutput, net, subnet, report, status))
    })
  } else {
    console.log("File Doesn\'t Exist. Creating new file.")
    fs.writeFile(filename, '', (err) => {
       if(err)
          console.log(err)
    })
  }
  updateTable()
}

function updateTable() {
  for(var i = 0, len = nodes.length; i < len; i++) {
    nodes[i].status = "Offline"
  }

    for (var i = 0; i < controller.nodes.length; i++) {
        console.log(controller.nodes[i])
        var newNode = true
        for(var j = 0, len = nodes.length; j < len; j++) {
          if (controller.nodes[i].mac == nodes[j].mac) {
            newNode = false
            nodes[j].status = "Online"
          }
        }
        if (newNode == true) {
          // addEntry(controller.nodes[i].ip, controller.nodes[i].mac, controller.nodes[i].name, controller.nodes[i].version, controller.nodes[i].numOutputs, controller.nodes[i].universesOutput, controller.nodes[i].net, controller.nodes[i].subnet, controller.nodes[i].report, "Online")
          nodes.push(new BlackLED(controller.nodes[i].ip, controller.nodes[i].mac, controller.nodes[i].name, controller.nodes[i].version, controller.nodes[i].numOutputs, controller.nodes[i].universesOutput, controller.nodes[i].net, controller.nodes[i].subnet, controller.nodes[i].report, "Online"))
        }
    }
    fs.writeFileSync(filename, "")
    for(var i = 0, len = nodes.length; i < len; i++) {
        if(nodes[i].mac != undefined){
          fs.appendFile(filename, nodes[i].ip + ',' +  nodes[i].mac + ',' +  nodes[i].name + ',' +  nodes[i].version + ',' +  nodes[i].numOutputs + ',' +  nodes[i].universesOutput + ',' +  nodes[i].net + ',' + nodes[i].subnet + ',' +  nodes[i].report + ',' +  nodes[i].status + '\n')
        }
    }

    console.log('\033[2J');
    if (controller.nodes.length > 0) {
        console.log("nodes found");
    } else {
        console.log("No ArtNet nodes found");
    }
    setTimeout(updateTable, 1000);

    if (nodes.length > 0) {
      var table = document.getElementById("node-table-content");
      table.innerHTML = "";
      var rowCount = table.rows.length;
      var row = table.insertRow(rowCount);

      var i = 0;

      for (var i = 0; i < nodes.length; i++) {
        if(nodes[i].mac != undefined){
          rowCount = table.rows.length;
          row = table.insertRow(rowCount);

          row.insertCell(0).innerHTML = nodes[i].status
          row.insertCell(1).innerHTML = nodes[i].name
          row.insertCell(2).innerHTML = nodes[i].mac
          row.insertCell(3).innerHTML ='<button type="button" class="btn btn-default" aria-label="cofig"> <span class="glyphicon glyphicon-cog" aria-hidden="true"></span></button>'
        }
      }
    }
  }


function BlackLED(ip, mac, name, version, numOutputs, universesOutput, net, subnet, report, status) {
    this.ip = ip;
    this.mac = mac;
    this.name = name;
    this.version = version;
    this.numOutputs = numOutputs;
    this.universesOutput = universesOutput;
    this.net = net;
    this.subnet = subnet;
    this.report = report;
    this.status = status;
};

loadTable()
