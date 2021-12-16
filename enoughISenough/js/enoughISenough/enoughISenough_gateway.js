WL.registerComponent("enough-IS-enough-gateway", {
    _myPlayerRumbleObject: { type: WL.Type.Object },
    _myRingsAnimator: { type: WL.Type.Object },
    _myLeftHandAnimator: { type: WL.Type.Object },
    _myRightHandAnimator: { type: WL.Type.Object },
}, {
    init: function () {
        Global.myAudioManager = new PP.AudioManager();
        Global.myParticlesManager = new ParticlesManager();
        Global.myMeshObjectPoolMap = new ObjectPoolMap();
        Global.myGameObjectPoolMap = new ObjectPoolMap();
        Global.myScene = this.object;

        Global.myPlayerRumbleObject = this._myPlayerRumbleObject;
        Global.myRingsAnimator = this._myRingsAnimator.pp_getComponent("rings-animator");
        Global.myLeftHandAnimator = this._myLeftHandAnimator.pp_getComponent("hand-animator");
        Global.myRightHandAnimator = this._myRightHandAnimator.pp_getComponent("hand-animator");

        this.enoughISenough = new enoughISenough();
    },
    start: function () {
        {
            let staringCube = Global.myGameObjects.get(GameObjectType.STARING_CUBE);
            PP.MeshUtils.setClonedMaterials(staringCube);
            let cloneParams = new PP.CloneParams();
            cloneParams.myComponentsToInclude.push("mesh");
            Global.myMeshObjects.set(GameObjectType.STARING_CUBE, staringCube.pp_clone(cloneParams));
        }

        for (let entry of Global.myMeshObjects.entries()) {
            if (entry[0] != GameObjectType.STARING_CUBE && entry[0] != GameObjectType.ZESTY_MARKET) {
                PP.MeshUtils.setClonedMaterials(entry[1]);
            }
        }

        for (let entry of Global.myGameObjects.entries()) {
            if (entry[0] != GameObjectType.STARING_CUBE && entry[0] != GameObjectType.ZESTY_MARKET) {
                PP.MeshUtils.setClonedMaterials(entry[1]);
            }
        }

        for (let entry of Global.myMeshObjects.entries()) {
            Global.myMeshObjectPoolMap.addPool(entry[0], entry[1], 5);
        }

        let cloneParams = new PP.CloneParams();
        cloneParams.myMesh_MaterialDeepCloneOverride = true;
        Global.myGameObjectPoolMap.addPool(GameObjectType.MR_NOT_CLONE, Global.myGameObjects.get(GameObjectType.MR_NOT_CLONE), 10, cloneParams);
        Global.myGameObjectPoolMap.addPool(GameObjectType.MR_NOT, Global.myGameObjects.get(GameObjectType.MR_NOT), 10, cloneParams);

        PP.myEasyTuneVariables.add(new PP.EasyTuneNumber("Float", 0, 0.1, 3));
        PP.myEasyTuneVariables.add(new PP.EasyTuneInt("Int", 0, 1));
        PP.myEasyTuneVariables.add(new PP.EasyTuneBool("Bool", false));

        PP.myEasyTuneVariables.add(new PP.EasyTuneNumber("mr NOT Clone Scale", 0.45, 0.1, 3));
        PP.myEasyTuneVariables.add(new PP.EasyTuneBool("Prevent Vent Lost", false));

        PP.CAUtils.setDummyServer(new EIECADummyServer());

        this.enoughISenough.start();
    },
    update: function (dt) {
        Global.myFirstUpdateDone = true;
        this.enoughISenough.update(dt);
        Global.myParticlesManager.update(dt);
    }
});

var Global = {
    myScene: null,
    myFirstUpdateDone: false,
    myAudioManager: null,
    myParticlesManager: null,
    myPlayerRumbleObject: null,
    myRingsAnimator: null,
    myLeftHandAnimator: null,
    myRightHandAnimator: null,
    myGameObjects: new Map(),
    myMeshObjects: new Map(),
    myRingRadius: 0,
    myRingHeight: 0,
    myTitlesObject: null,
    myTitlesRumbleObject: null,
    myTitleObject: null,
    mySubtitleObject: null,
    myMeshObjectPoolMap: null,
    myGameObjectPoolMap: null,
    myMaterials: null,
    myStoryDuration: 0,
    myArcadeDuration: 0,
    myVentDuration: 0,
    myDebugShortcutsEnabled: false,
    myDebugShortcutsPress: 2,
    myPlayerPosition: [0, 0, 0],
    myPlayerRotation: [0, 0, 0],
    myPlayerForward: [0, 0, 1],
};