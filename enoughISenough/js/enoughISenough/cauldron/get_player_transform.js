WL.registerComponent('get-player-transform', {
}, {
    init: function () {
    },
    start: function () {
    },
    update: function (dt) {
        Global.myPlayerPosition = this.object.pp_getPosition();
        Global.myPlayerRotation = this.object.pp_getRotation();
        Global.myPlayerForward = this.object.pp_getForward();
        Global.myPlayerUp = this.object.pp_getUp();
    },
});