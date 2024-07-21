import {sendSMS} from './sms.js'

"use strict";
// // PETER
const bleNusServiceUUID = "713d0000-503e-4c75-ba94-3148f18d941e";
const bleNusCharTXUUID = "713d0002-503e-4c75-ba94-3148f18d941e";

const MTU = 20;

var bleDevice;
var bleServer;
var nusService;
var txCharacteristic;

var connected = false;

const touchpad = {
  x: 0,
  y: 0,
  z: 0,
};


window.connectionToggle = connectionToggle
function connectionToggle() {
  if (connected) {
    disconnect();
  } else {
    connect();
  }
}

// Sets button to either Connect or Disconnect
function setConnButtonState(enabled) {
  if (enabled) {
    document.getElementById("clientConnectButton").innerHTML = "Disconnect";
  } else {
    document.getElementById("clientConnectButton").innerHTML = "Connect";
  }
}

function connect() {
  if (!navigator.bluetooth) {
    console.log(
      "WebBluetooth API is not available.\r\n" +
        "Please make sure the Web Bluetooth flag is enabled."
    );
    return;
  }
  console.log("Requesting Bluetooth Device...");
  navigator.bluetooth
    .requestDevice({
      // filters: [{services: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']}],
      optionalServices: [bleNusServiceUUID],
      acceptAllDevices: true,
    })
    .then((device) => {
      bleDevice = device;
      console.log("Found " + device.name);
      console.log("Connecting to GATT Server...");
      bleDevice.addEventListener("gattserverdisconnected", onDisconnected);
      return device.gatt.connect();
    })
    .then((server) => {
      console.log("Locate NUS service");
      return server.getPrimaryService(bleNusServiceUUID);
    })
    .then((service) => {
      nusService = service;
      console.log("Found NUS service: " + service.uuid);
    })

    .then(() => {
      console.log("Locate TX characteristic");
      return nusService.getCharacteristic(bleNusCharTXUUID);
    })
    .then((characteristic) => {
      txCharacteristic = characteristic;
      console.log("Found TX characteristic");
    })
    .then(() => {
      console.log("Enable notifications");
      return txCharacteristic.startNotifications();
    })
    .then(() => {
      console.log("Notifications started");
      txCharacteristic.addEventListener(
        "characteristicvaluechanged",
        buttonPressed
      );
      connected = true;
      console.log("\r\n" + bleDevice.name + " Connected.");
      nusSendString("\r");
      setConnButtonState(true);
    })
    .catch((error) => {
      console.log("" + error);
      if (bleDevice && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
      }
    });
}

function disconnect() {
  if (!bleDevice) {
    console.log("No Bluetooth Device connected...");
    return;
  }
  console.log("Disconnecting from Bluetooth Device...");
  if (bleDevice.gatt.connected) {
    bleDevice.gatt.disconnect();
    connected = false;
    setConnButtonState(false);
    console.log("Bluetooth Device connected: " + bleDevice.gatt.connected);
  } else {
    console.log("> Bluetooth Device is already disconnected");
  }
}

function onDisconnected() {
  connected = false;
  console.log("\r\n" + bleDevice.name + " Disconnected.");
  setConnButtonState(false);
}

/* Data is comming in as 5 consequtive bytes
[0] 170 (AA)    = First byte Flag
[1] 0-1023      = xLocation
[2] 187 (BB)    = Second Flag
[3] 0-1023      = yLocation
[4] 0-50        = Activation
 */

let head = 0;

function handleNotifications(event) {
  buttonPressed();
  return; // the rest is not relevat for use with a single button

  console.log("notification");
  let value = event.target.value;

  // Convert raw data bytes to character values and use these to construct a string.
  let str = "";

  for (let i = 0; i < value.byteLength; i++) {
    // str += String.fromCharCode(value.getUint8(i));

    str = value.getUint8(i); // this will be a decimal number representing the incoming byte

    // Head will keep track of which byte out of the expected 5 we are reading
    if (str == "170") {
      head = 0;
      console.log("---"); // update terminal on the screen
    } else {
      head += 1;
    }

    // Update the touchpad object
    switch (head) {
      case 1:
        touchpad.x = str;
        break;
      case 3:
        touchpad.y = str;
        break;
      case 4:
        touchpad.z = str;
        break;
      // default:
      //   console.log('x is something else');
    }
  }
  // document.getElementById('values').innerHTML=`x: ${touchpad.x}\t y: ${touchpad.y}\t z: ${touchpad.z}\t` // update readout on the screen
  console.log(`x: ${touchpad.x}\t y: ${touchpad.y}\t z: ${touchpad.z}\t`); // update terminal on the screen
}

// Function to handle the button press message
let timeoutId = null;
const timeoutInterval = 3000; // 2 seconds
const counterThreshold = 15;
let counter = 0;
let smsSent = false;

function buttonPressed() {
  console.log(counter);
  // wait for 10 consecutive button press values before sending the message
  if (counter >= 0 && counter < counterThreshold) {
    counter++;
    setStatusText("Button pressed", 'orange');
  } else if (counter == counterThreshold && !smsSent) {
 
    const phone = document.getElementById('phoneNumber').value;

    sendSMS(phone, 'What do you think of this?')
    .then((response) => {
        if(response.http_code == 200) {
            setStatusText("Message sent!", "orange");
        } else {
            setStatusText("Error sending message", 'orange');
        }
    })
    .catch((error) => {
        setStatusText("Error sending message", 'orange');
    });

    setStatusText("Sending message...", 'orange');
    console.log("Sending message...");
    smsSent = true;
  }

  //updates the progress bar - should end on 100
  setProgress(counter * (100/counterThreshold));

  // unset timeout
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  // reset counter after 'timeInterval' time with new no button data
  timeoutId = setTimeout(() => {
    console.log("reset counter");
    counter = 0;
    smsSent = false;
    setProgress(0);
    setStatusText("Press the Button", 'grey');
  }, timeoutInterval);
}

function setProgress(percentage) {
  const progressCircle = document.getElementById("progressCircle");
  progressCircle.style.background = `conic-gradient(var(--infi-orange) ${
    percentage * 3.6
  }deg, grey 0deg)`;
}

function setStatusText(text,color=null) {
  const statusText = document.getElementById("statusText");
  statusText.innerText = text;
  if (color == null) return
  if(color == 'orange') {statusText.style.color = "var(--infi-orange)";}
  else {statusText.style.color = `${color}`;}
}

function nusSendString(s) {
  if (bleDevice && bleDevice.gatt.connected) {
    console.log("send: " + s);
    let val_arr = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) {
      let val = s[i].charCodeAt(0);
      val_arr[i] = val;
    }
    // sendNextChunk(val_arr);
  } else {
    console.log("Not connected to a device yet.");
  }
}

function sendNextChunk(a) {
  let chunk = a.slice(0, MTU);
  rxCharacteristic.writeValue(chunk).then(function () {
    if (a.length > MTU) {
      sendNextChunk(a.slice(MTU));
    }
  });
}
