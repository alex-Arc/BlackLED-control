const {app, BrowserWindow, ipcMain, Menu} = require('electron')
const url = require('url')
const path = require('path')
const fs = require('fs');
const pwMan = require('clortho').forService('BlackLED');
const nodemailer = require('nodemailer');

let p = app.getPath('appData');
let mailInfo;

function getSettings() {
  try {
    mailInfo = JSON.parse(fs.readFileSync(path.join(p, 'mail.json')));
  } catch (e) {
    console.log(e);
  }
  let pw = pwMan.getFromKeychain(mailInfo.account).catch(() =>
    pwMan.prompt(
      mailInfo.account,
      ' '
    ).then(pwMan.trySaveToKeychain)
  );
  pw.then( (e) => {
    mailInfo.password = e.password;
    mailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: mailInfo.account,
        pass: mailInfo.password
      }
    });
    console.log(mailInfo);
  })
}

var env = process.argv[2]

if (env === 'dev') {
  require('electron-reload')(__dirname)
}

var mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'robot@vertigo.dk',
    pass: ' '
  }
});

let mainWindow
let emailWindow


let editClientWindow
let currentClientToEdit = 1

app.on('ready', function () {
  getSettings()
  mainWindow = new BrowserWindow({width: 900, height: 950})
  mainWindow.eval = global.eval = function () {
    throw new Error(`Sorry, this app does not support window.eval().`)
  }
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, '/index/index.html'), protocol: 'file:', slashes: true
  }))
  //buld menue from menuTemplate
  const mainMenu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(mainMenu);

  mainWindow.on('closed', function () {
    app.quit();
  })
})

function createMailWindow() {
  emailWindow = new BrowserWindow({width: 300, height: 300})
  emailWindow.loadURL(url.format({
    pathname: path.join(__dirname, '/index/emailWindow.html'), protocol: 'file:', slashes: true
  }))
  // emailWindow.once('ready-to-show', () => {
  //   emailWindow.show();
  // })
  emailWindow.on('close', function () {
    emailWindow = null;
  })
}

ipcMain.on('email:getSettings', function (e, item) {
  console.log('get settings');
  e.sender.send('email:getSettings', mailInfo);
})

ipcMain.on('email:setSettings', function (e, item) {
  console.log(item);
  mailInfo = item;
  mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: mailInfo.account,
      pass: mailInfo.password
    }
  });
  let tmp = {account: mailInfo.account, recipient: mailInfo.recipient, message: mailInfo.message};
  fs.writeFileSync(path.join(p, 'mail.json'), JSON.stringify(tmp));
  let pw = pwMan.saveToKeychain(mailInfo.account, mailInfo.password);
  pw.then((e) => {
    console.log(e);
  })
})

ipcMain.on('email:sendMsg', function () {
  let mailOptions = {
    from: mailInfo.account,
    to: mailInfo.recipient,
    subject: 'BlackLED notifyer',
    text: mailInfo.message
  };
  mailTransporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  })
})

ipcMain.on('email:sendTest', function () {
  let mailOptions = {
    from: mailInfo.account,
    to: mailInfo.recipient,
    subject: 'BlackLED notifyer',
    text: 'this is a test'
  };
  mailTransporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  })
})

// ipcMain.on('getClientToEdit', function (event) {
//   // logger.warn('getClientToEdit')
//   mainWindow.webContents.send('getClientInfo', currentClientToEdit)
//   ipcMain.once('getClientInfo', function (evn, node) {
//     // logger.warn(node)
//     editClientWindow.webContents.send('getClientToEdit', node)
//   })
// })
//
// ipcMain.on('editClient', function (event, n) {
//   // logger.warn('Edit Client from ' + n)
//   currentClientToEdit = n
//   if (editClientWindow !== undefined && editClientWindow !== null) {
//   } else {
//     editClientWindow = new BrowserWindow({width: 400, height: 400, show: false, modal: true})
//     editClientWindow.loadURL('file://' + __dirname + '/editClient/editClient.html')
//     // logger.verbose('editClientWindow loaded')
//     editClientWindow.on('closed', function () {
//       // logger.verbose('editClientWindow closed')
//       editClientWindow = null
//     })
//     editClientWindow.show()
//   }
// })

//create menu template
const menuTemplate = [
  {
    label: "File",
    submenu: [
      {
        label: "E-mail notifyer",
        click() {
          createMailWindow();
        }
      },
      {
        label: "Quit",
        accelerator: process.platform == "darwin" ? "Command+Q" : "Ctrl+Q",
        click() {
          app.quit();
        }
      }
    ]
  }
];

// show dev tool if not in procuction
if (process.env.NODE_ENV !== "procuction") {
  menuTemplate.push({
    label: "Dev Tools",
    submenu: [
      {
        label: "Toggel DevTools",
        accelerator: process.platform == "darwin" ? "Command+I" : "Ctrl+I",
        click(item, focusedWindow) {
          focusedWindow.toggleDevTools();
        }
      },
      {
        role: "reload"
      }
    ]
  });
}
