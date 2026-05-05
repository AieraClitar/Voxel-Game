export const AudioSys = {
    ctx: null, ambientNodes: [],
    
    init: function() {
        if (!this.ctx) { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.startAmbient(); }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    getDistVol: function(dist, maxVol = 1.0) { if (dist < 2) return maxVol; if (dist > 30) return 0; return maxVol * (1.0 - (dist / 30)); },

    playTone: function(freq, type, duration, vol, detune = 0) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (detune !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq - detune), this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime + duration);
    },

    playNoise: function(duration, vol, lowpassFreq = 1000) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration; const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate); const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = lowpassFreq;
        const gain = this.ctx.createGain(); gain.gain.setValueAtTime(vol, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination); noise.start();
    },

    startAmbient: function() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 2; const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate); const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 300;
        const gain = this.ctx.createGain(); gain.gain.value = 0.02; 
        noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination); noise.start();
        this.ambientNodes.push(noise);
    },

    stepGrass: function(dist = 0) { this.playNoise(0.15, this.getDistVol(dist, 0.05), 800); },
    stepStone: function(dist = 0) { this.playTone(60 + Math.random()*20, 'square', 0.1, this.getDistVol(dist, 0.05), 10); },
    hitFlesh: function(dist = 0) { this.playTone(150 + Math.random()*50, 'square', 0.15, this.getDistVol(dist, 0.2), 100); this.playNoise(0.1, this.getDistVol(dist, 0.1), 500); },
    breakBlock: function(dist = 0) { this.playTone(100 + Math.random()*40, 'triangle', 0.2, this.getDistVol(dist, 0.15), 50); this.playNoise(0.2, 0.1, 1000); },
    
    shootGun: function(dist = 0) { 
        const v = this.getDistVol(dist, 0.4);
        this.playTone(150, 'sine', 0.3, v, 100); 
        this.playNoise(0.2, v, 4000);            
    },
    shootBow: function(dist = 0) { 
        if(!this.ctx) return;
        const v = this.getDistVol(dist, 0.25);
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(350, this.ctx.currentTime + 0.15); 
        gain.gain.setValueAtTime(v, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime + 0.15);
        this.playNoise(0.15, v * 0.4, 1000); 
    },
    shootCrossbow: function(dist = 0) { 
        const v = this.getDistVol(dist, 0.3);
        this.playTone(800, 'square', 0.05, v * 0.8, 400); 
        this.playTone(200, 'sawtooth', 0.2, v, 100);      
        this.playNoise(0.1, v, 1500);
    },
    
    hurt: function() { this.playTone(200, 'sawtooth', 0.3, 0.3, 100); }
};