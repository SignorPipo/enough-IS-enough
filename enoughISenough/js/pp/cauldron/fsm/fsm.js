/*
    You can also use plain functions for state/transition if u want to do something simpler and faster

    Signatures:
        stateUpdateFunction(dt, fsm, stateData)
        initFunction(fsm, initStateData)
        transitionFunction(fsm, fromStateData, toStateData, transitionData)
*/

PP.StateData = class StateData {
    constructor(stateID, stateObject) {
        this.myStateID = stateID;
        this.myStateObject = stateObject;
    }
};

PP.TransitionData = class TransitionData {
    constructor(transitionID, fromStateData, toStateData, transitionObject) {
        this.myTransitionID = transitionID;
        this.myFromStateData = fromStateData;
        this.myToStateData = toStateData;
        this.myTransitionObject = transitionObject;
    }
};

PP.FSM = class FSM {

    constructor() {
        this._myCurrentStateData = null;

        this._myStateMap = new Map();
        this._myTransitionMap = new Map();

        this._myDebugLogActive = false;
    }

    addState(stateID, state = null) {
        let stateObject = state;
        if (state && typeof state == 'function') {
            stateObject = {};
            stateObject.update = state;
        }

        let stateData = new PP.StateData(stateID, stateObject);
        this._myStateMap.set(stateID, stateData);
        this._myTransitionMap.set(stateID, new Map());
    }

    addTransition(fromStateID, toStateID, transitionID, transition = null) {
        let transitionObject = transition;
        if (transition && typeof transition == 'function') {
            transitionObject = {};
            transitionObject.perform = transition;
        }

        if (this.hasState(fromStateID) && this.hasState(toStateID)) {
            let fromMap = this._getTransitionMapFromState(fromStateID);

            let transitionData = new PP.TransitionData(transitionID, this.getState(fromStateID), this.getState(toStateID), transitionObject);
            fromMap.set(transitionID, transitionData);
        } else {
            console.error("can't add the transition, states not found inside the fsm");
        }
    }

    init(initStateID, initTransition = null) {
        let initTransitionObject = initTransition;
        if (initTransition && typeof initTransition == 'function') {
            initTransitionObject = {};
            initTransitionObject.performInit = initTransition;
        }

        if (this.hasState(initStateID)) {
            this._myCurrentStateData = this._myStateMap.get(initStateID);
            if (initTransitionObject && initTransitionObject.performInit) {
                initTransitionObject.performInit(this, this._myCurrentStateData);
            } else if (this._myCurrentStateData.myStateObject && this._myCurrentStateData.myStateObject.init) {
                this._myCurrentStateData.myStateObject.init(this);
            }

            if (this._myDebugLogActive) {
                console.log("FSM - Init:", initStateID);
            }
        }
    }

    update(dt) {
        if (this._myCurrentStateData && this._myCurrentStateData.myStateObject && this._myCurrentStateData.myStateObject.update) {
            this._myCurrentStateData.myStateObject.update(dt, this, this._myCurrentStateData);
        }
    }

    perform(transitionID) {
        if (this._myCurrentStateData) {
            if (this.canPerform(transitionID)) {
                let transitions = this._myTransitionMap.get(this._myCurrentStateData.myStateID);
                let transitionToPerform = transitions.get(transitionID);

                let fromState = this._myCurrentStateData;
                let toState = this._myStateMap.get(transitionToPerform.myToStateData.myStateID);

                if (transitionToPerform.myTransitionObject && transitionToPerform.myTransitionObject.perform) {
                    transitionToPerform.myTransitionObject.perform(this, fromState, toState, transitionToPerform);
                } else {
                    if (fromState.myStateObject && fromState.myStateObject.end) {
                        fromState.myStateObject.end(this, transitionToPerform, fromState);
                    }

                    if (toState.myStateObject && toState.myStateObject.end) {
                        toState.myStateObject.start(this, transitionToPerform, toState);
                    }
                }

                this._myCurrentStateData = transitionToPerform.myToStateData;

                if (this._myDebugLogActive) {
                    console.log("FSM - From:", fromState.myStateID, "- To:", toState.myStateID, "- With:", transitionID);
                }

                return true;
            } else if (this._myDebugLogActive) {
                console.log("FSM - No Transition:", transitionID, "- From:", this._myCurrentStateData.myStateID);
            }
        } else if (this._myDebugLogActive) {
            console.log("FSM - FSM not started yet");
        }

        return false;
    }

    canPerform(transitionID) {
        return this.hasTransitionFromState(this._myCurrentStateData.myStateID, transitionID);
    }

    canGoTo(stateID, transitionID = null) {
        return this.hasTransitionFromStateToState(this._myCurrentStateData.myStateID, stateID, transitionID);
    }

    isInState(stateID) {
        return this._myCurrentStateData != null && this._myCurrentStateData.myStateID == stateID;
    }

    getCurrentState() {
        return this._myCurrentStateData;
    }

    getCurrentTransitions() {
        return this.getTransitionsFromState(this._myCurrentStateData.myStateID);
    }

    getCurrentTransitionsToState(stateID) {
        return this.getTransitionsFromStateToState(this._myCurrentStateData.myStateID, stateID);
    }

    getState(stateID) {
        return this._myStateMap.get(stateID);
    }

    getTransitionsFromState(fromStateID) {
        let transitionMap = this._getTransitionMapFromState(fromStateID);
        return Array.from(transitionMap.values());
    }

    getTransitionsFromStateToState(fromStateID, toStateID) {
        let transitionMap = this._getTransitionMapFromState(fromStateID);

        let transitionsToState = [];
        for (let transitionData of transitionMap.values()) {
            if (transitionData.myToStateData.myStateID == toStateID) {
                transitionsToState.push(transitionData);
            }
        }

        return transitionsToState;
    }

    removeState(stateID) {
        if (this.hasState(stateID)) {
            this._myStateMap.delete(stateID);
            this._myTransitionMap.delete(stateID);

            for (let transitionMap of this._myTransitionMap.values()) {
                let toDelete = [];
                for (let [transitionID, transitionData] of transitionMap.entries()) {
                    if (transitionData.myToStateData.myStateID == stateID) {
                        toDelete.push(transitionID);
                    }
                }

                for (let transitionID of toDelete) {
                    transitionMap.delete(transitionID);
                }
            }

            return true;
        }
        return false;
    }

    removeTransitionFromState(fromStateID, transitionID) {
        let fromTransitions = this._getTransitionMapFromState(fromStateID);
        if (fromTransitions) {
            return fromTransitions.delete(transitionID);
        }

        return false;
    }

    hasState(stateID) {
        return this._myStateMap.has(stateID);
    }

    hasTransitionFromState(fromStateID, transitionID) {
        let transitions = this.getTransitionsFromState(fromStateID);

        let transitionIndex = transitions.findIndex(function (transition) {
            return transition.myTransitionID == transitionID;
        });

        return transitionIndex >= 0;
    }

    hasTransitionFromStateToState(fromStateID, toStateID, transitionID = null) {
        let transitions = this.getTransitionsFromStateToState(fromStateID, toStateID);

        let hasTransition = false;
        if (transitionID) {
            let transitionIndex = transitions.findIndex(function (transition) {
                return transition.myTransitionID == transitionID;
            });

            hasTransition = transitionIndex >= 0;
        } else {
            hasTransition = transitions.length > 0;
        }

        return hasTransition;
    }

    setDebugLogActive(active) {
        this._myDebugLogActive = active;
    }

    _getTransitionMapFromState(fromStateID) {
        return this._myTransitionMap.get(fromStateID);
    }
};