class NotEnough {
    constructor(audioPosition = null) {
        this._myTimer = new PP.Timer(1, false);
        this._myNotEnoughAudio = Global.myAudioManager.createAudioPlayer(SfxID.NOT_ENOUGH);
        this._myAudioPosition = audioPosition;
    }

    start() {
        this._myTimer.start();

        if (this._myAudioPosition) {
            this._myNotEnoughAudio.setPosition(this._myAudioPosition);
        } else {
            let position = vec3_create();
            position[0] = Math.pp_random(5, 10) * Math.pp_randomSign();
            position[1] = Math.pp_random(5, 10);
            position[2] = Math.pp_random(5, 10) * Math.pp_randomSign();
            this._myNotEnoughAudio.setPosition(position);
        }

        this._myNotEnoughAudio.play();
    }

    stop() {
        this._myTimer.reset();
        Global.myPlayerRumbleObject.pp_resetPositionLocal();
        Global.myTitlesRumbleObject.pp_resetPositionLocal();
    }

    update(dt) {
        if (this._myTimer.isRunning()) {
            this._myTimer.update(dt);

            let rumbleValue = 0.04;
            Global.myPlayerRumbleObject.pp_setPositionLocal([Math.pp_random(-rumbleValue, rumbleValue), Math.pp_random(-rumbleValue, rumbleValue), Math.pp_random(-rumbleValue, rumbleValue)]);
            rumbleValue = 8;
            Global.myTitlesRumbleObject.pp_setPositionLocal([Math.pp_random(-rumbleValue, rumbleValue), Math.pp_random(-rumbleValue, rumbleValue), Math.pp_random(-rumbleValue, rumbleValue)]);

            if (this._myTimer.isDone()) {
                this.stop();
            }
        }
    }

    isNotEnoughing() {
        return this._myTimer.isRunning();
    }
}