class EvidenceSetup {
    constructor(objectType, randomChance, startSpawnTime = null, endSpawnTime = null, cardinalPositions = null, callbackOnUnspawned = null) {
        this.myObjectType = objectType;
        this.myRandomChance = randomChance;
        this.myStartSpawnTime = startSpawnTime;
        this.myEndSpawnTime = endSpawnTime;
        this.myCardinalPositions = cardinalPositions;
        this.myCallbackOnUnspawned = callbackOnUnspawned;
    }
}

class Evidence {
    constructor(evidenceSetup, callbackOnUnspawned) {
        this._myEvidenceSetup = evidenceSetup;
        this._myCallbackOnUnspawned = callbackOnUnspawned;

        this._myObject = Global.myGameObjects.get(this._myEvidenceSetup.myObjectType);
        this._myObjectType = this._myEvidenceSetup.myObjectType;
        this._myPhysx = this._myObject.pp_getComponentHierarchy("physx");
        this._myGrabbable = this._myObject.pp_getComponentHierarchy("pp-grabbable");
        this._myScale = this._myObject.pp_getScale();

        this._myCurrentCardinalPosition = null;
        this._myPosition = null;
        this._myFacing = null;

        this._myTimer = new PP.Timer(0);
        this._mySpawnTimer = new PP.Timer(0);
        this._myThrowTimer = new PP.Timer(6, false);
        WL.onXRSessionEnd.push(this._onXRSessionEnd.bind(this));

        this._myFSM = new PP.FSM();
        //this._myFSM.setDebugLogActive(true, "                Evidence Item");
        this._myFSM.addState("init");
        this._myFSM.addState("inactive");
        this._myFSM.addState("spawning", this._spawning.bind(this));
        this._myFSM.addState("ready", this._readyUpdate.bind(this));
        this._myFSM.addState("unspawning", this._unspawning.bind(this));

        this._myFSM.addTransition("init", "inactive", "reset", this._reset.bind(this));
        this._myFSM.addTransition("inactive", "spawning", "spawn", this._startSpawn.bind(this));
        this._myFSM.addTransition("spawning", "ready", "end", this._startReady.bind(this));
        this._myFSM.addTransition("spawning", "unspawning", "unspawn", this._startUnspawn.bind(this));
        this._myFSM.addTransition("ready", "unspawning", "unspawn", this._startUnspawn.bind(this));
        this._myFSM.addTransition("unspawning", "inactive", "end", this._startInactive.bind(this));
        this._myFSM.addTransition("inactive", "inactive", "reset", this._reset.bind(this));

        this._myFSM.init("init");
        this.init();

        this._myCollisionCount = 0;
        this._myHasBeenThrown = false;

        this._myParticlesRadius = 0.225;

        this._myAudioTimer = new PP.Timer(0);
        this._myAppearAudio = null;
        this._myDisappearAudio = null;

        this._myCollisionCallbackID = null;
    }

    getEvidenceSetup() {
        return this._myEvidenceSetup;
    }

    init() {
        this._myFSM.perform("reset");
    }

    update(dt) {
        if (this._myHasBeenThrown) {
            this._myThrowTimer.update(dt);
            if (this._myThrowTimer.isDone()) {
                this._myHasBeenThrown = false;
            }
        }

        this._myFSM.update(dt);
    }

    spawn(position) {
        this._myPosition = position.slice(0);
        this._myFacing = [0, 0, 0].vec3_sub(position).vec3_removeComponentAlongAxis([0, 1, 0]);
        this._myFSM.perform("spawn");
    }

    unspawn(avoidParticles = false) {
        this._myAvoidParticles = avoidParticles;
        this._myFSM.perform("unspawn");
    }

    canUnspawn() {
        return this._myFSM.canPerform("unspawn");
    }

    isInactive() {
        return this._myFSM.isInState("inactive");
    }

    hide() {
        this._myFSM.init("inactive");
        this._disableObject();
    }

    canHit() {
        let distanceFromCenter = this._myObject.pp_getPosition().vec3_removeComponentAlongAxis([0, 1, 0]).vec3_length();
        let isHitState = this._myFSM.isInState("spawning") || this._myFSM.isInState("ready");
        return isHitState && /*this._myHasBeenThrown &&*/ WL.xrSession && /*!this._myGrabbable.isGrabbed() &&*/ distanceFromCenter > Global.myRingRadius * 1.5/*(this._myGrabbable.isGrabbed() || this._myCollisionCount == 0)*/;
    }

    hasBeenThrown() {
        return this._myHasBeenThrown;
    }

    _reset(fsm, transition) {
        this._disableObject();
    }

    _startSpawn() {
        this._myAppearAudio = Global.myAudioPoolMap.getAudio(SfxID.EVIDENCE_APPEAR);
        this._myDisappearAudio = Global.myAudioPoolMap.getAudio(SfxID.EVIDENCE_DISAPPEAR);

        this._myEvidenceComponent = this._myObject.pp_getComponentHierarchy("evidence-component");
        this._myEvidenceComponent.setCallbackOnHit(this._onHit.bind(this));
        this._myEvidenceComponent.setCallbackOnBigHit(this._onBigHit.bind(this));
        this._myEvidenceComponent.setEvidence(this);
        this._myHasBeenThrown = false;
        this._myThrowTimer.reset();

        let position = this._myPosition.pp_clone();
        let heightDisplacement = this._myEvidenceComponent.getHeightDisplacement();
        if (Math.abs(heightDisplacement) > 0.0001) {
            position.vec3_add([0, heightDisplacement, 0], position);
        }

        this._myObject.pp_setPosition(position);
        this._myObject.pp_setScale(0);
        this._myObject.pp_translate([0, 0.2, 0]);
        this._myObject.pp_lookTo(this._myFacing, [0, 1, 0]);
        this._myObject.pp_setActive(true);

        this._myPhysx.kinematic = true;
        this._myPhysx.linearVelocity = [0, 0, 0];
        this._myPhysx.angularVelocity = [0, 0, 0];

        this._mySpawnTimer.start(1);
        this._myHitExplosion = false;
        this._myBigHitExplosion = false;
        this._myHitFloor = false;
        this._myAvoidParticles = false;

        this._myAudioTimer.start(0.2);
        this._myAppearAudio.setPosition(position);
        this._myAppearAudio.setPitch(Math.pp_random(0.85, 1.05));

        this._myGrabbable.registerThrowEventListener(this, this._onThrow.bind(this));
        this._myCollisionCallbackID = this._myPhysx.onCollision(this._onCollision.bind(this));
    }

    _spawning(dt) {
        if (this._myAudioTimer.isRunning()) {
            this._myAudioTimer.update(dt);
            if (this._myAudioTimer.isDone()) {
                this._myAppearAudio.play();
            }
        }

        this._mySpawnTimer.update(dt);

        let scaleMultiplier = PP.EasingFunction.easeInOut(this._mySpawnTimer.getPercentage());
        this._myObject.pp_setScale(this._myScale.vec3_scale(scaleMultiplier));

        this._myAppearAudio.updatePosition(this._myObject.pp_getPosition(), true);

        if (this._mySpawnTimer.isDone()) {
            this._myFSM.perform("end");
        }
    }

    _startReady() {
        this._myObject.pp_setScale(this._myScale);
        if (!this._myGrabbable.isGrabbed()) {
            this._myPhysx.kinematic = false;
        }
    }

    _readyUpdate(dt) {
        if (this._myObject.pp_getPosition()[1] <= -10 || this._myObject.pp_getPosition().vec3_length() > 50) {
            this._myHitFloor = true;
            this._myFSM.perform("unspawn");
        }
    }

    _startUnspawn() {
        if ((this._myHitFloor || this._myHitExplosion || this._myBigHitExplosion) && !Global.myIsInArcadeResult) {
            Global.myStatistics.myEvidencesThrown += 1;
            if ((this._myHitExplosion || this._myBigHitExplosion) && this._myGrabbable.isGrabbed()) {
                Global.myStatistics.myEvidencesPunched += 1;
            }

            if (this._myHitFloor) {
                Global.myStatistics.myEvidencesMissed += 1;
            }

        }

        if (this._myBigHitExplosion) {
            this._myPhysx.kinematic = true;
        }

        this._mySetKinematicTimer = this._myHitExplosion;

        this._myTimer.start(PP.myEasyTuneVariables.get("Unspawn Menu Time"));

        if (!this._myHitExplosion && !this._myBigHitExplosion) {
            this._myDisappearAudio.setPosition(this._myObject.pp_getPosition());
            this._myDisappearAudio.setPitch(Math.pp_random(0.85, 1.05));
            this._myDisappearAudio.play();
        }
    }

    _unspawning(dt) {
        this._myTimer.update(dt);

        if (this._mySetKinematicTimer && this._myTimer.getPercentage() >= 0.7) {
            this._myPhysx.kinematic = true;
            this._mySetKinematicTimer = false;
        }

        let scaleMultiplier = Math.pp_interpolate(1, PP.myEasyTuneVariables.get("Unspawn Menu Scale"), this._myTimer.getPercentage());
        this._myObject.pp_setScale(this._myScale.vec3_scale(scaleMultiplier));

        if (this._myTimer.isDone()) {
            let scaleMultiplier = 1;
            let radiusMultiplier = 1;
            if (this._myHitExplosion) {
                scaleMultiplier = 3;
                radiusMultiplier = 1.5;
            } else if (this._myBigHitExplosion) {
                scaleMultiplier = 3;
                radiusMultiplier = 2;
            }

            if (!this._myAvoidParticles) {
                Global.myParticlesManager.explosion(this._myObject.pp_getPosition(), this._myParticlesRadius * radiusMultiplier, this._myScale.vec3_scale(scaleMultiplier), this._myObjectType);
            }
            this._myFSM.perform("end");
            this._myCallbackOnUnspawned(this);
            if (this._myEvidenceSetup.myCallbackOnUnspawned) {
                this._myEvidenceSetup.myCallbackOnUnspawned(this);
            }
        }
    }

    _startInactive() {
        this._disableObject();
    }

    _disableObject() {
        if (this._myPhysx.active) {
            this._myPhysx.linearVelocity = [0, 0, 0];
            this._myPhysx.angularVelocity = [0, 0, 0];
            this._myObject.pp_setPosition([0, -10, 0]);
        }
        this._myObject.pp_setActive(false);
        this._myGrabbable.unregisterThrowEventListener(this);
        if (this._myCollisionCallbackID != null) {
            this._myPhysx.removeCollisionCallback(this._myCollisionCallbackID);
            this._myCollisionCallbackID = null;
        }

        Global.myAudioPoolMap.releaseAudio(SfxID.EVIDENCE_APPEAR, this._myAppearAudio);
        Global.myAudioPoolMap.releaseAudio(SfxID.EVIDENCE_DISAPPEAR, this._myDisappearAudio);
        this._myAppearAudio = null;
        this._myDisappearAudio = null;
    }

    _onCollision(type) {
        if (!this._myGrabbable.isGrabbed() && this._myPhysx.active && this._myPhysx.kinematic &&
            (this._myFSM.getCurrentState().myID == "spawning")) {
            this._myPhysx.kinematic = false;
        }

        if (type == WL.CollisionEventType.Touch || type == WL.CollisionEventType.TriggerTouch) {
            this._myCollisionCount += 1;
        } else if (type == WL.CollisionEventType.TouchLost || type == WL.CollisionEventType.TriggerTouchLost) {
            this._myCollisionCount -= 1;
        }
    }

    _onHit() {
        this._myHitExplosion = true;
        this._myFSM.perform("unspawn");
    }

    _onBigHit() {
        this._myBigHitExplosion = true;
        this._myFSM.perform("unspawn");
    }

    _onThrow() {
        this._myHasBeenThrown = true;
        this._myThrowTimer.start();
    }

    _onXRSessionEnd() {
        this._myHasBeenThrown = false;
    }
}

var CardinalPosition = {
    NORTH: 0,
    NORTH_EAST: 1,
    NORTH_WEST: 2,
    EAST: 3,
    WEST: 4,
    SOUTH_EAST: 5,
    SOUTH_WEST: 6,
    SOUTH: 7
};