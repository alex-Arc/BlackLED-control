const electron = require("electron");
const { ipcRenderer } = electron;

const form = document.querySelector("form");
form.addEventListener("submit", submitForm);
document.getElementById("test").addEventListener("click", function(){
  ipcRenderer.send("email:sendTest");
});

ipcRenderer.send('email:getSettings');
ipcRenderer.on('email:getSettings', (e, item) => {
  console.log(item);
  document.querySelector("#login").value = item.account;
  document.querySelector("#psw").value = item.password
  document.querySelector("#rec").value = item.recipient
  document.querySelector("#mgs").value = item.message
})

function submitForm(e) {
  e.preventDefault();
  const login = document.querySelector("#login").value;
  const psw = document.querySelector("#psw").value;
  const rec = document.querySelector("#rec").value;
  const mgs = document.querySelector("#mgs").value;
  const item = {account: login, password: psw, recipient: rec, message: mgs}
  ipcRenderer.send("email:setSettings", item);
}
