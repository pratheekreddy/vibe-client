// import axios from 'axios'
// import fs from 'fs'

// const WaveFile = require('wavefile').WaveFile;
const connect = document.getElementById('connect-to-serial');
const connect2 = document.getElementById('get-serial-messages');

let chunks=[]
let url = "http://10.178.32.47/signal_api"
    connect.addEventListener('pointerdown', () => {
      runSystem();
    });

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }   

    async function runSystem () {
        getSerialMessage();
    }

    async function fetchAsync (url) {
        let response = await (await fetch(url, {
            method: 'GET'})).json();
        // let data = await response.json();
        return response;
    }

    async function sendAsync (url, bodyData = []) {
        console.log("making post call")
        console.log(bodyData)
        let response = await (await fetch(url, {
            method: 'POST',
            body: JSON.stringify({"data":bodyData})
        })).json();
        return response;
    }
    async function sendAsyncaudio (url, bodyData ) {
        console.log("making post call")
        let response = await (await fetch(url, {
            method: 'POST',
            body: bodyData
        })).json();
        return response;
    }

    async function sendAsyncData (url, bodyData) {
        console.log("making post call")
        let data= new FormData()
        data.append('audio',bodyData,'audio.wav')
        console.log(bodyData)
        let config = {
                header : {
                'Content-Type' : 'multipart/form-data'
                }
            }
        let response = await axios.post(url,bodyData,config)

        return response;
    }


    async function getSerialMessage() {
        console.log('function getSerialMessage.....')
        console.log("Let's get some data")
        const startTime = new Date() / 1000;
        
        let loginURL = "http://10.178.32.47/login"
        
        let done = false
        await sendAsync(loginURL) //Tells the vibe server to generate a token
        await sleep(250);   
        var x = document.getElementById("jamming"); 
        console.log(x)
        x.play()

        let intervalTime = new Date() / 1000;

        //
        let stream = null;
        let constraints={audio:true,video:false}
            try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();

            let chunks = [];

            mediaRecorder.ondataavailable = function(e) {
                chunks.push(e.data);
            }

            setTimeout(()=>{
                mediaRecorder.stop()
                console.log(mediaRecorder.state)
            },5000)

            mediaRecorder.onstop= async function(e){
                console.log(typeof chunks)
                const blob = new Blob(chunks, { 'type' : 'audio/mp3' });
                var arrayBuffer = await blob.arrayBuffer();
                const audioContext = new AudioContext()
                
                await audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {

                    // How to I now convert the AudioBuffer into an ArrayBuffer => Blob ?
                    // console.log(audioBuffer.getChannelData(0),audioBuffer.length,audioBuffer.sampleRate)
                    let data={"signal":audioBuffer.getChannelData(0),
                            "f_rate":audioBuffer.length,
                            "frames":audioBuffer.sampleRate
                    }
                    sendAsyncaudio(url,JSON.stringify(data))
                    const left =  audioBuffer.getChannelData(0)

                    // interleaved
                    const interleaved = new Float32Array(left.length)
                    for (let src=0, dst=0; src < left.length; src++, dst+=2) {
                    interleaved[dst] =   left[src]
                    }

                    // get WAV file bytes and audio params of your audio source
                    const wavBytes = getWavBytes(interleaved.buffer, {
                    isFloat: true,       // floating point or 16-bit integer
                    numChannels: 2,
                    sampleRate: 48000,
                    })
                    const wav = new Blob([wavBytes], { type: 'audio/wav' })

                    // create download link and append to Dom
                    const downloadLink = document.createElement('a')
                    downloadLink.href = URL.createObjectURL(wav)
                    downloadLink.setAttribute('download', 'my-audio.wav') // name file
                    })
            }

            } catch(err) {
            /* handle the error */
            console.log(err)
            }

        //

        let pauseTime = new Date() / 1000;
        // let result = await sendAsync(url, audio) // Then we send the recoding back to the vibe server
        const endTime = new Date() / 1000;
        console.log("recording " + (pauseTime - intervalTime).toFixed(2) + " seconds")
        console.log("2fa process took " + (endTime - startTime).toFixed(2) + " seconds")
        // console.log(fullRecording)
        document.querySelector("#serial-messages-container .message").innerText += ""
    }

    // Returns Uint8Array of WAV bytes
function getWavBytes(buffer, options) {
    const type = options.isFloat ? Float32Array : Uint16Array
    const numFrames = buffer.byteLength / type.BYTES_PER_ELEMENT
  
    const headerBytes = getWavHeader(Object.assign({}, options, { numFrames }))
    const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength);
  
    // prepend header, then add pcmBytes
    wavBytes.set(headerBytes, 0)
    wavBytes.set(new Uint8Array(buffer), headerBytes.length)
  
    return wavBytes
  }
  
  // adapted from https://gist.github.com/also/900023
  // returns Uint8Array of WAV header bytes
  function getWavHeader(options) {
    const numFrames =      options.numFrames
    const numChannels =    options.numChannels || 2
    const sampleRate =     options.sampleRate || 44100
    const bytesPerSample = options.isFloat? 4 : 2
    const format =         options.isFloat? 3 : 1
  
    const blockAlign = numChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = numFrames * blockAlign
  
    const buffer = new ArrayBuffer(44)
    const dv = new DataView(buffer)
  
    let p = 0
  
    function writeString(s) {
      for (let i = 0; i < s.length; i++) {
        dv.setUint8(p + i, s.charCodeAt(i))
      }
      p += s.length
    }
  
    function writeUint32(d) {
      dv.setUint32(p, d, true)
      p += 4
    }
  
    function writeUint16(d) {
      dv.setUint16(p, d, true)
      p += 2
    }
  
    writeString('RIFF')              // ChunkID
    writeUint32(dataSize + 36)       // ChunkSize
    writeString('WAVE')              // Format
    writeString('fmt ')              // Subchunk1ID
    writeUint32(16)                  // Subchunk1Size
    writeUint16(format)              // AudioFormat
    writeUint16(numChannels)         // NumChannels
    writeUint32(sampleRate)          // SampleRate
    writeUint32(byteRate)            // ByteRate
    writeUint16(blockAlign)          // BlockAlign
    writeUint16(bytesPerSample * 8)  // BitsPerSample
    writeString('data')              // Subchunk2ID
    writeUint32(dataSize)            // Subchunk2Size
  
    return new Uint8Array(buffer)
  }
  