PP.HandPose = class HandPose {

    constructor(handedness, fixForward = true, forceEmulatedVelocities = false) {
        this._myInputSource = null;

        this._myHandedness = handedness;
        this._myFixForward = fixForward;
        this._myForceEmulatedVelocities = forceEmulatedVelocities;

        this._myReferenceSpace = null;

        this._myPosition = [0, 0, 0];
        this._myRotation = [0, 0, 0, 1];

        this._myPrevPosition = [0, 0, 0];
        this._myPrevRotation = [0, 0, 0, 1];

        this._myLinearVelocity = [0, 0, 0];
        this._myAngularVelocity = [0, 0, 0]; // Radians

        this._myValid = false;
    }

    isValid() {
        return this._myValid;
    }

    getReferenceSpace() {
        return this._myReferenceSpace;
    }

    getPosition() {
        return this._myPosition.slice(0);
    }

    getRotation() {
        return this.getRotationDegrees();
    }

    getRotationDegrees() {
        return this.getRotationQuat().quat_toDegrees();
    }

    getRotationRadians() {
        return this.getRotationQuat().quat_toRadians();
    }

    getRotationQuat() {
        // Implemented outside class definition
    }

    getTransform() {
        return this.getTransformMatrix();
    }

    getTransformMatrix() {
        return mat4_fromPositionRotationQuat(this._myPosition, this.getRotationQuat());
    }

    getTransformQuat() {
        return quat2_fromPositionRotationQuat(this._myPosition, this.getRotationQuat());
    }

    getLinearVelocity() {
        return this._myLinearVelocity.slice(0);
    }

    getAngularVelocity() {
        return this.getAngularVelocityDegrees();
    }

    getAngularVelocityDegrees() {
        return this._myAngularVelocity.vec3_toDegrees();
    }

    getAngularVelocityRadians() {
        return this._myAngularVelocity.slice(0);
    }

    setFixForward(fixForward) {
        this._myFixForward = fixForward;
    }

    setForceEmulatedVelocities(forceEmulatedVelocities) {
        this._myForceEmulatedVelocities = forceEmulatedVelocities;
    }

    start() {
        if (WL.xrSession) {
            this._onXRSessionStart(true, WL.xrSession);
        }
        WL.onXRSessionStart.push(this._onXRSessionStart.bind(this, false));
        WL.onXRSessionEnd.push(this._onXRSessionEnd.bind(this));
    }

    update(dt) {
        glMatrix.vec3.copy(this._myPrevPosition, this._myPosition);
        glMatrix.quat.copy(this._myPrevRotation, this._myRotation);

        let xrFrame = Module['webxr_frame'];
        if (xrFrame && this._myInputSource) {
            let xrPose = null;
            try {
                xrPose = xrFrame.getPose(this._myInputSource.gripSpace, this._myReferenceSpace);
            } catch (error) {
                // Do nothing
            }

            if (xrPose) {
                this._myPosition[0] = xrPose.transform.position.x;
                this._myPosition[1] = xrPose.transform.position.y;
                this._myPosition[2] = xrPose.transform.position.z;

                this._myRotation[0] = xrPose.transform.orientation.x;
                this._myRotation[1] = xrPose.transform.orientation.y;
                this._myRotation[2] = xrPose.transform.orientation.z;
                this._myRotation[3] = xrPose.transform.orientation.w;

                if (xrPose.linearVelocity && !this._myForceEmulatedVelocities) {
                    this._myLinearVelocity[0] = xrPose.linearVelocity.x;
                    this._myLinearVelocity[1] = xrPose.linearVelocity.y;
                    this._myLinearVelocity[2] = xrPose.linearVelocity.z;
                } else {
                    this._computeEmulatedLinearVelocity(dt);
                }

                if (xrPose.angularVelocity && !this._myForceEmulatedVelocities) {
                    this._myAngularVelocity[0] = xrPose.angularVelocity.x;
                    this._myAngularVelocity[1] = xrPose.angularVelocity.y;
                    this._myAngularVelocity[2] = xrPose.angularVelocity.z;
                } else {
                    this._computeEmulatedAngularVelocity(dt);
                }

                this._myValid = true;
            } else {
                //keep previous position and rotation but reset velocity because reasons

                this._myLinearVelocity[0] = 0;
                this._myLinearVelocity[1] = 0;
                this._myLinearVelocity[2] = 0;

                this._myAngularVelocity[0] = 0;
                this._myAngularVelocity[1] = 0;
                this._myAngularVelocity[2] = 0;

                this._myValid = false;
            }
        } else {
            //keep previous position and rotation but reset velocity because reasons

            this._myLinearVelocity[0] = 0;
            this._myLinearVelocity[1] = 0;
            this._myLinearVelocity[2] = 0;

            this._myAngularVelocity[0] = 0;
            this._myAngularVelocity[1] = 0;
            this._myAngularVelocity[2] = 0;

            this._myValid = false;
        }
    }

    _computeEmulatedLinearVelocity(dt) {
        if (dt > 0) {
            glMatrix.vec3.subtract(this._myLinearVelocity, this._myPosition, this._myPrevPosition);
            glMatrix.vec3.scale(this._myLinearVelocity, this._myLinearVelocity, 1 / dt);
        } else {
            this._myLinearVelocity[0] = 0;
            this._myLinearVelocity[1] = 0;
            this._myLinearVelocity[2] = 0;
        }
    }

    _computeEmulatedAngularVelocity(dt) {
        if (dt > 0) {
            glMatrix.vec3.subtract(this._myAngularVelocity, this._myRotation.quat_toRadians(), this._myPrevRotation.quat_toRadians());
            glMatrix.vec3.scale(this._myAngularVelocity, this._myAngularVelocity, 1 / dt);
        } else {
            this._myAngularVelocity[0] = 0;
            this._myAngularVelocity[1] = 0;
            this._myAngularVelocity[2] = 0;
        }
    }

    _onXRSessionStart(manualStart, session) {
        session.requestReferenceSpace(WebXR.refSpace).then(function (referenceSpace) { this._myReferenceSpace = referenceSpace; }.bind(this));

        this._myInputSource = null;

        if (session.inputSources != null && session.inputSources.length > 0) {
            for (let i = 0; i < session.inputSources.length; i++) {
                let inputSource = session.inputSources[i];
                if (inputSource.handedness == this._myHandedness) {
                    this._myInputSource = inputSource;
                }
            }
        }

        session.addEventListener('inputsourceschange', function () {
            this._myInputSource = null;

            if (session.inputSources != null && session.inputSources.length > 0) {
                for (let i = 0; i < session.inputSources.length; i++) {
                    let inputSource = session.inputSources[i];
                    if (inputSource.handedness == this._myHandedness) {
                        this._myInputSource = inputSource;
                    }
                }
            }
        }.bind(this));
    }

    _onXRSessionEnd(session) {
        this._myReferenceSpace = null;
        this._myInputSource = null;
    }
};

PP.HandPose.prototype.getRotationQuat = function () {
    let up = glMatrix.vec3.create();
    let right = glMatrix.vec3.create();
    return function getRotationQuat() {
        let out = this._myRotation.slice(0);

        if (PP.InputUtils.getInputSourceType(this._myHandedness) == PP.InputSourceType.HAND) {
            if (this._myFixForward) {
                out.quat_rotateAxisDegrees(180, out.quat_getUp(up), out);
            }

            out.quat_rotateAxisDegrees(-90, out.quat_getRight(right), out);
        } else if (this._myFixForward) {
            out = glMatrix.quat.rotateY(out, out, Math.PI);
        }

        return out;
    };
}();