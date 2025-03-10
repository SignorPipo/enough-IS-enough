class ArcadeResultState extends PP.State {
    constructor(isDispute) {
        super();

        this._myFSM = new PP.FSM();
        //this._myFSM.setDebugLogActive(true, "        Result");
        this._myFSM.addState("init");
        this._myFSM.addState("first_wait", new PP.TimerState(1.5, "end"));
        this._myFSM.addState("result");
        this._myFSM.addState("clean", this._updateClean.bind(this));
        this._myFSM.addState("second_wait", new PP.TimerState(2, "end"));
        this._myFSM.addState("done");

        this._myFSM.addTransition("init", "first_wait", "start", this._prepareState.bind(this));
        this._myFSM.addTransition("first_wait", "result", "end", this._prepareResult.bind(this));
        this._myFSM.addTransition("result", "clean", "end", this._prepareClean.bind(this));
        this._myFSM.addTransition("clean", "second_wait", "end");
        this._myFSM.addTransition("second_wait", "done", "end", this._resultCompleted.bind(this));
        this._myFSM.addTransition("done", "first_wait", "start", this._prepareState.bind(this));

        this._myFSM.addTransition("init", "done", "skip");
        this._myFSM.addTransition("first_wait", "done", "skip");
        this._myFSM.addTransition("second_wait", "done", "skip");
        this._myFSM.addTransition("result", "done", "skip", this._hideEvidences.bind(this));
        this._myFSM.addTransition("clean", "done", "skip", this._hideEvidences.bind(this));

        this._myFSM.init("init");

        this._myParentFSM = null;

        let evidenceSetupList = [];
        evidenceSetupList.push(new EvidenceSetup(GameObjectType.VENT_TIMER, 5, null, null, [CardinalPosition.NORTH], this._onTimerUnspawned.bind(this)));
        this._myEvidenceManager = new EvidenceManager(evidenceSetupList);

        this._myIsDispute = isDispute;
    }

    update(dt, fsm) {
        this._myFSM.update(dt);
        this._myEvidenceManager.update(dt);

        if (Global.myDebugShortcutsEnabled) {
            //TEMP REMOVE THIS
            if (PP.myRightGamepad.getButtonInfo(PP.ButtonType.SELECT).isPressEnd(Global.myDebugShortcutsPress)) {
                this._myFSM.perform("skip");
                this._resultCompleted();
            }
        }
    }

    _prepareState(fsm, transition) {
    }

    _prepareResult() {
        this._myEvidenceManager.start();
    }

    _prepareClean() {
        this._myEvidenceManager.clean();
    }

    _updateClean(dt, fsm) {
        if (this._myEvidenceManager.isDone()) {
            this._myFSM.perform("end");
        }
    }

    _resultCompleted() {
        this._myParentFSM.perform("end");
    }

    _hideEvidences() {
        this._myEvidenceManager.hide();
    }

    start(fsm, transition) {
        this._myParentFSM = fsm;
        this._myFSM.perform("start");

        Global.sendAnalytics("event", "arcade_seconds", {
            "value": Global.myVentDuration.toFixed(2)
        });

        if (this._myIsDispute) {
            if (Global.myStatistics.myDisputeBestTime < 0 || Global.myVentDuration > Global.myStatistics.myDisputeBestTime) {
                Global.myStatistics.myDisputeBestTime = Global.myVentDuration;
            }

            Global.sendAnalytics("event", "arcade_dispute_seconds", {
                "value": Global.myVentDuration.toFixed(2)
            });
        } else {
            if (Global.myStatistics.myChatBestTime < 0 || Global.myVentDuration > Global.myStatistics.myChatBestTime) {
                Global.myStatistics.myChatBestTime = Global.myVentDuration;
            }

            Global.sendAnalytics("event", "arcade_chat_seconds", {
                "value": Global.myVentDuration.toFixed(2)
            });
        }

        let leaderboardID = "enough-is-enough";
        if (this._myIsDispute) {
            leaderboardID = leaderboardID.concat("-dispute");
        } else {
            leaderboardID = leaderboardID.concat("-chat");
        }

        let score = Math.floor(Global.myVentDuration * 1000);

        let scoreSubmittedSucceded = false;
        let scoreStopSubmitting = false;
        let scoreSubmittedEventID = (this._myIsDispute ? "arcade_dispute" : "arcade_chat") + "_score_submitted";
        let submitScoreSuccessCallback = function () {
            if (!scoreSubmittedSucceded) {
                scoreSubmittedSucceded = true;
                Global.sendAnalytics("event", "arcade_score_submitted", {
                    "value": 1
                });

                Global.sendAnalytics("event", scoreSubmittedEventID, {
                    "value": 1
                });
            }
        };
        let submitScoreErrorCallback = function (error) {
            if (error != null && error.type != PP.CAUtils.CAError.SUBMIT_SCORE_FAILED) {
                scoreStopSubmitting = true;
            }
        };

        PP.CAUtils.submitScore(leaderboardID, score, submitScoreSuccessCallback, submitScoreErrorCallback, false);

        setTimeout(function () {
            if (!scoreSubmittedSucceded && !scoreStopSubmitting) {
                PP.CAUtils.submitScore(leaderboardID, score, submitScoreSuccessCallback, submitScoreErrorCallback, false);
            }
        }, 5000);

        setTimeout(function () {
            if (!scoreSubmittedSucceded && !scoreStopSubmitting) {
                PP.CAUtils.submitScore(leaderboardID, score, submitScoreSuccessCallback, submitScoreErrorCallback, false);
            }
        }, 10000);

        Global.myIsInArcadeResult = true;

        Global.myStatisticsManager.saveStatistics();
    }

    end(fsm, transitionID) {
        if (!this._myFSM.isInState("done")) {
            this._myFSM.perform("skip");
        }

        Global.myIsInArcadeResult = false;
    }

    _onTimerUnspawned(evidence) {
        if (PP.XRUtils.isXRSessionActive() && evidence.hasBeenThrown() &&
            (WL.xrSession == null || WL.xrSession.visibilityState == null || WL.xrSession.visibilityState == "visible")) {
            this._myFSM.perform("end");
        }
    }
}