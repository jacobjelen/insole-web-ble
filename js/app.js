'use strict';
// // PETER
const bleNusServiceUUID  = '713d0000-503e-4c75-ba94-3148f18d941e'; 
const bleNusCharTXUUID   = '713d0002-503e-4c75-ba94-3148f18d941e'; 

const MTU = 20;

var bleDevice;
var bleServer;
var nusService;
var txCharacteristic;

var connected = false;

const touchpad = { 
    x: 0, 
    y: 0, 
    z: 0 
}

function connectionToggle() {
    if (connected) {
        disconnect();
    } else {
        connect();
    }
    document.getElementById('terminal').focus();
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
        console.log('WebBluetooth API is not available.\r\n' +
                    'Please make sure the Web Bluetooth flag is enabled.');
        return;
    }
    console.log('Requesting Bluetooth Device...');
    navigator.bluetooth.requestDevice({
        // filters: [{services: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']}],
        optionalServices: [bleNusServiceUUID],
        acceptAllDevices: true
    })
    .then(device => {
        bleDevice = device; 
        console.log('Found ' + device.name);
        console.log('Connecting to GATT Server...');
        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
        return device.gatt.connect();
    })
    .then(server => {
        console.log('Locate NUS service');
        return server.getPrimaryService(bleNusServiceUUID);
    })
    .then(service => {
        nusService = service;
        console.log('Found NUS service: ' + service.uuid);
    })

    .then(() => {
        console.log('Locate TX characteristic');
        return nusService.getCharacteristic(bleNusCharTXUUID);
    })
    .then(characteristic => {
        txCharacteristic = characteristic;
        console.log('Found TX characteristic');
    })
    .then(() => {
        console.log('Enable notifications');
        return txCharacteristic.startNotifications();
    })
    .then(() => {
        console.log('Notifications started');
        txCharacteristic.addEventListener('characteristicvaluechanged',
                                          handleNotifications);
        connected = true;
        console.log('\r\n' + bleDevice.name + ' Connected.');
        nusSendString('\r');
        setConnButtonState(true);
    })
    .catch(error => {
        console.log('' + error);
        if(bleDevice && bleDevice.gatt.connected)
        {
            bleDevice.gatt.disconnect();
        }
    });
}

function disconnect() {
    if (!bleDevice) {
        console.log('No Bluetooth Device connected...');
        return;
    }
    console.log('Disconnecting from Bluetooth Device...');
    if (bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
        connected = false;
        setConnButtonState(false);
        console.log('Bluetooth Device connected: ' + bleDevice.gatt.connected);
    } else {
        console.log('> Bluetooth Device is already disconnected');
    }
}

function onDisconnected() {
    connected = false;
    console.log('\r\n' + bleDevice.name + ' Disconnected.');
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
    console.log('notification');
    let value = event.target.value;
    // Convert raw data bytes to character values and use these to construct a string.
    let str = "";

    for (let i = 0; i < value.byteLength; i++) {
        // str += String.fromCharCode(value.getUint8(i));
        
        str = value.getUint8(i) // this will be a decimal number representing the incoming byte

        // Head will keep track of which byte out of the expected 5 we are reading
        if (str == '170') {
            head = 0
            console.log("---"); // update terminal on the screen
        } else {
            head += 1
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
    update_touchpad() // update touchpad on the screen
    document.getElementById('values').innerHTML=`x: ${touchpad.x}\t y: ${touchpad.y}\t z: ${touchpad.z}\t` // update readout on the screen
    console.log(str); // update terminal on the screen
}

function update_touchpad() {
    const touchpad_threshold = 0 //450
  
    const canvas = document.getElementById('tp_canvas')
    const press = document.getElementById('press')
  
    const posx = touchpad.x / 255 * canvas.clientWidth
    const posy = touchpad.y / 255 * canvas.clientHeight
    const sizez = touchpad.z / 50 * canvas.clientHeight / 3 // size of pressure cirle scales with the canvas/window
    // console.log(`x: ${posx}  y: ${posy}  z: ${sizez}`)
  
    // press is a div inside the tp_canvas div representing position and force of pressure on the physical sensor
    press.style.top = posy - (sizez / 2) // offset by a half of the size => center in the middle of press
    press.style.left = posx - (sizez / 2)
  
    if (touchpad.z > touchpad_threshold) {
      // press.style.display = 'block'
      press.style.width = sizez 
      press.style.height = sizez 
      press.style.opacity = 1
      console.log(`press: x ${posx}\t y ${posy}\t z ${sizez}\t`)
    } else {
      // press.style.display = 'none'
      press.style.width = 0
      press.style.height = 0
      press.style.opacity = 0
    }
  
  }

function nusSendString(s) {
    if(bleDevice && bleDevice.gatt.connected) {
        console.log("send: " + s);
        let val_arr = new Uint8Array(s.length)
        for (let i = 0; i < s.length; i++) {
            let val = s[i].charCodeAt(0);
            val_arr[i] = val;
        }
        // sendNextChunk(val_arr);
    } else {
        console.log('Not connected to a device yet.');
    }
}

function sendNextChunk(a) {
    let chunk = a.slice(0, MTU);
    rxCharacteristic.writeValue(chunk)
      .then(function() {
          if (a.length > MTU) {
              sendNextChunk(a.slice(MTU));
          }
      });
}



// function initContent(io) {
//     io.println("\r\n\
// Welcome to Web Device CLI V0.1.0 (03/19/2019)\r\n\
// Copyright (C) 2019  makerdiary.\r\n\
// \r\n\
// This is a Web Command Line Interface via NUS (Nordic UART Service) using Web Bluetooth.\r\n\
// \r\n\
//   * Source: https://github.com/makerdiary/web-device-cli\r\n\
//   * Live:   https://makerdiary.github.io/web-device-cli\r\n\
// ");
// }

// function setupHterm() {
//     const term = new hterm.Terminal();

//     term.onTerminalReady = function() {
//         const io = this.io.push();
//         io.onVTKeystroke = (string) => {
//             nusSendString(string);
//         };
//         io.sendString = nusSendString;
//         initContent(io);
//         this.setCursorVisible(true);
//         this.keyboard.characterEncoding = 'raw';
//     };
//     term.decorate(document.querySelector('#terminal'));
//     term.installKeyboard();

//     term.contextMenu.setItems([
//         ['Terminal Reset', () => {term.reset(); initContent(window.term_.io);}],
//         ['Terminal Clear', () => {term.clearHome();}],
//         [hterm.ContextMenu.SEPARATOR],
//         ['GitHub', function() {
//             lib.f.openWindow('https://github.com/makerdiary/web-device-cli', '_blank');
//         }],
//     ]);

//     // Useful for console debugging.
//     window.term_ = term;
// }

// window.onload = function() {
//     lib.init(setupHterm);
// };