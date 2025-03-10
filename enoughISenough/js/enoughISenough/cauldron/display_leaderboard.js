WL.registerComponent("display-leaderboard", {
    _myName: { type: WL.Type.String, default: '' },
    _myIsLocal: { type: WL.Type.Bool, default: false },
    _myNamesText: { type: WL.Type.Object },
    _myScoresText: { type: WL.Type.Object },
}, {
    init: function () {
        this._myCharacterWeightMap = new Map();

        this._myCharacterWeightMap.set("M", 1.4);
        this._myCharacterWeightMap.set("W", 1.4);
        this._myCharacterWeightMap.set("@", 1.4);
        this._myCharacterWeightMap.set("m", 1.3);
        this._myCharacterWeightMap.set("w", 1.3);
        this._myCharacterWeightMap.set("N", 1.2);
        this._myCharacterWeightMap.set("Q", 1.1);
        this._myCharacterWeightMap.set("U", 1.1);
        this._myCharacterWeightMap.set("V", 1.1);
        this._myCharacterWeightMap.set("X", 1.1);

        this._myCharacterWeightMap.set("f", 0.8);
        this._myCharacterWeightMap.set("i", 0.8);
        this._myCharacterWeightMap.set("j", 0.8);
        this._myCharacterWeightMap.set("l", 0.8);
        this._myCharacterWeightMap.set("t", 0.8);
        this._myCharacterWeightMap.set("1", 0.8);
        this._myCharacterWeightMap.set(" ", 0.55);
        this._myCharacterWeightMap.set(".", 0.55);
        this._myCharacterWeightMap.set("-", 0.55);

    },
    start: function () {
        this._myNamesTextComponent = this._myNamesText.pp_getComponent("text");
        this._myScoresTextComponent = this._myScoresText.pp_getComponent("text");

        if (this._myNamesTextComponent != null) {
            this._myNamesTextComponent.text = " ";
            this._myNamesTextComponent.text = "";
        }

        if (this._myScoresTextComponent != null) {
            this._myScoresTextComponent.text = " ";
            this._myScoresTextComponent.text = "";
        }
    },
    update: function (dt) {
    },
    onActivate: function () {
        PP.CAUtils.getLeaderboard(this._myName, true, this._myIsLocal, 10, this._onLeaderboardRetrieved.bind(this));
    },
    _onLeaderboardRetrieved(leaderboard) {
        let namesText = "";
        let scoresText = "";

        let maxRankDigit = 0;
        for (let value of leaderboard) {
            if (value != null && value.rank != null && value.displayName != null && value.score != null) {
                let rank = value.rank + 1;
                if (rank.toFixed(0).length > maxRankDigit) {
                    maxRankDigit = rank.toFixed(0).length;
                }
            }
        }

        for (let value of leaderboard) {
            if (value != null && value.rank != null && value.displayName != null && value.score != null) {
                let rank = value.rank + 1;
                let fixedRank = rank.toFixed(0);
                while (fixedRank.length < maxRankDigit) {
                    fixedRank = "0".concat(fixedRank);
                }

                let clampedDisplayName = this._clampDisplayName(value.displayName);

                namesText = namesText.concat(fixedRank, " - ", clampedDisplayName, "\n\n");

                let convertedScore = this._convertTime(value.score);
                scoresText = scoresText.concat(convertedScore, "\n\n");
            }
        }

        if (this._myNamesTextComponent != null) {
            this._myNamesTextComponent.text = namesText;
        }

        if (this._myScoresTextComponent != null) {
            this._myScoresTextComponent.text = scoresText;
        }
    },
    _convertTime(score) {
        let time = Math.floor(score / 1000);

        let hours = Math.floor(time / 3600);
        time -= hours * 3600;
        let minutes = Math.floor(time / 60);
        time -= minutes * 60;
        let seconds = Math.floor(time);


        let secondsText = (seconds.toFixed(0).length < 2) ? "0".concat(seconds.toFixed(0)) : seconds.toFixed(0);
        let minutesText = (minutes.toFixed(0).length < 2) ? "0".concat(minutes.toFixed(0)) : minutes.toFixed(0);
        let hoursText = (hours.toFixed(0).length < 2) ? "0".concat(hours.toFixed(0)) : hours.toFixed(0);

        let convertedTime = hoursText.concat(":", minutesText, ":", secondsText);

        return convertedTime;
    },
    _clampDisplayName(displayName) {
        let nameCharactersToShow = 0;

        let currentWeight = 0;
        for (let i = 0; i < displayName.length; i++) {
            let currentCharacter = displayName.charAt(i);
            let characterWeight = this._myCharacterWeightMap.get(currentCharacter);
            characterWeight = characterWeight != null ? characterWeight : 1;

            currentWeight += characterWeight;

            if (currentWeight > 15) {
                break;
            }

            nameCharactersToShow++;
        }

        nameCharactersToShow = Math.min(nameCharactersToShow, displayName.length);

        if (nameCharactersToShow < displayName.length) {
            return displayName.slice(0, nameCharactersToShow) + "...";
        }

        return displayName;
    }
});