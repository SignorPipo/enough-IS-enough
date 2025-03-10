WL.registerComponent("activate-on-select", {
    _myHandedness: { type: WL.Type.Enum, values: ['left', 'right'], default: 'left' },
    _myTrigger: { type: WL.Type.Object },
    _myGrabberHandObject: { type: WL.Type.Object }
}, {
    init: function () {
    },
    start: function () {
        if (this._myHandedness == 0) {
            this._myGamepad = PP.myLeftGamepad;
        } else {
            this._myGamepad = PP.myRightGamepad;
        }

        this._myGrabberHand = null;
        if (this._myGrabberHandObject != null) {
            this._myGrabberHand = this._myGrabberHandObject.pp_getComponent("pp-grabber-hand");
        }

        this._myPhysx = this.object.pp_getComponent("physx");

        this._myTriggerPhysx = this._myTrigger.pp_getComponent("physx");
        this._myTriggerPhysx.onCollision(this._onCollision.bind(this));

        this._myGamepad.registerButtonEventListener(PP.ButtonType.SELECT, PP.ButtonEvent.PRESS_START, this, this._selectPressStart.bind(this));
        this._myGamepad.registerButtonEventListener(PP.ButtonType.SELECT, PP.ButtonEvent.PRESS_END, this, this._selectPressEnd.bind(this));

        this._myPhysx.active = false;
        this._myTriggerPhysx.active = false;

        this._myCollisionAudio = Global.myAudioManager.createAudioPlayer(SfxID.COLLISION);
        this._myCollisionPitch = this._myCollisionAudio.getPitch();

        this._myHandednessType = PP.InputUtils.getHandednessByIndex(this._myHandedness);

        this._mySentEventActiveTimer = new PP.Timer(7);
    },
    update(dt) {
        if (!Global.myEnableSelectPhysx ||
            PP.InputUtils.getInputSourceType(this._myHandednessType) != PP.InputSourceType.GAMEPAD ||
            (this._myGrabberHand != null && this._myGrabberHand.getHandPose() != null && !this._myGrabberHand.getHandPose().isValid())) {
            this._myPhysx.active = false;
            this._myTriggerPhysx.active = false;
        }

        if (!Global.myActivatePhysXHandEventSent) {
            if (this._myPhysx.active) {
                this._mySentEventActiveTimer.update(dt);
                if (this._mySentEventActiveTimer.isDone()) {
                    Global.myActivatePhysXHandEventSent = true;
                    Global.sendAnalytics("event", "select_physx_actived", {
                        "value": 1
                    });
                }
            }
        }
    },
    _selectPressStart() {
        if (Global.myEnableSelectPhysx && PP.InputUtils.getInputSourceType(this._myHandednessType) == PP.InputSourceType.GAMEPAD) {
            this._myPhysx.active = true;
            this._myTriggerPhysx.active = true;
        }
    },
    _selectPressEnd() {
        this._myPhysx.active = false;
        this._myTriggerPhysx.active = false;
    },
    _onCollision(type, physx) {
        if (type == WL.CollisionEventType.TriggerTouch) {
            if (physx.object.pp_getComponent("evidence-component") != null) {
                let intensity = 0.1;
                let pulseInfo = this._myGamepad.getPulseInfo();
                if (pulseInfo.myIntensity <= intensity) {
                    this._myGamepad.pulse(intensity, 0.1);
                }

                this._myCollisionAudio.setPosition(this.object.pp_getPosition());
                this._myCollisionAudio.setPitch(Math.pp_random(this._myCollisionPitch - 0.15, this._myCollisionPitch + 0.05));
                this._myCollisionAudio.play();
            }
        }
    }
});