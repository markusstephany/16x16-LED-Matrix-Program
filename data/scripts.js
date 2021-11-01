$(function () {
    var $body = $('body');
    var $frames = $('#frames');
    var $frames1 = $('#frames1');
    var editorMatrix = [];
    var isMatrixTicker = false;
    var flags;
    var signData;
    var $insertButton = $('#insert-button');
    var $deleteButton = $('#delete-button');
    var $updateButton = $('#update-button');
    var $readButton = $('#read-button');
    var $writeButton = $('#write-button');
    var $restartFilmButton = $('#restartfilm-button');
    var $restartButton = $('#restart-button');
    var copiedFrame = "";

    var playMatrix = [];
    var playMatrixStartTime = 0;
    var playMatrixInterval = 0;
    var playMatrixIndex = -1;
    var playMatrixTotalDuration = 0;

    var savedHashState;
    var $leds;



    var matrix16x16Functions = {
        mix: function (sourceMatrix, blendMatrix, startRow = 0, startCol = 0, invert = true) {
            var blendCopy = blendMatrix.slice();
            while (startRow > 0) {
                this.shiftDown(blendCopy);
                startRow--;
            }
            while (startCol > 0) {
                this.shiftRight(blendCopy);
                startCol--;
            }
            var sourceCopy = sourceMatrix.slice();
            for (var y = 0; y < 16; y++)
                for (var x = 0; x < 16; x++)
                    if (blendCopy[y][x] == 1)
                        sourceCopy[y][x] = invert ? 1 - parseInt(sourceCopy[y][x]) : 1;
            return sourceCopy;
        },
        transpose: function (matrix) {
            for (let i = 0; i < matrix.length; i++) {
                for (let j = i; j < 16; j++) {
                    const tmp = matrix[i][j];
                    matrix[i][j] = matrix[j][i];
                    matrix[j][i] = tmp;
                }
            }
        },

        shiftLeft: function (matrix) {
            for (let i = 0; i < matrix.length; i++) {
                const len = matrix[i].length - 1;
                for (let j = 0; j < len; j++) {
                    matrix[i][j] = matrix[i][j + 1];
                }
                matrix[i][len] = 0;
            }
        },

        isEmpty: function (matrix) {
            for (var y = 0; y < 16; y++)
                for (var x = 0; x < 16; x++)
                    if (parseInt(matrix[y][x]) != 0)
                        return false;
            return true;
        },

        shiftUp: function (matrix) {
            matrix.splice(0, 1);
            matrix.push([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        },

        shiftDown: function (matrix) {
            matrix.splice(15, 1);
            matrix.unshift([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        },


        shiftRight: function (matrix) {
            for (let i = 0; i < matrix.length; i++) {
                const len = matrix[i].length - 1;
                for (let j = len; j > 0; j--) {
                    matrix[i][j] = matrix[i][j - 1];
                }
                matrix[i][0] = 0;
            }
        },

        invert: function (matrix) {
            for (let i = 0; i < matrix.length; i++) {
                for (let j = 0; j < matrix[i].length; j++) {
                    matrix[i][j] = 1 - parseInt(matrix[i][j]);
                }
            }
        },

        rotate: function (matrix) {
            matrix.reverse();
            matrix16x16Functions.transpose(matrix);
        },

        rotateBack: function (matrix) {
            matrix16x16Functions.transpose(matrix);
            matrix.reverse();
        }

    };

    var matrixTableGenerator = {
        table: function () {
            var out = [];
            for (var y = 0; y < 17; y++) {
                out.push('<tr>');
                for (var x = 0; x < 17; x++) {
                    if (y == 0) {
                        if (x == 0)
                            out.push('<td class="leds-space"></td>');
                        else
                            out.push('<td class="leds-col" data-col="' + x + '">' + x + '</td>');
                    }
                    else if (x == 0) {
                        out.push('<td class="leds-row" data-row="' + y + '">' + y + '</td>');

                    }
                    else
                        out.push('<td class="item leds-item" data-row="' + y + '" data-col="' + x + '"></td>');
                }
                out.push('</tr>');
            }
            return out.join('');
        }
    };

    class FrameData {
        #pattern = '';
        #numbers = [];
        constructor(pattern) {
            this.#pattern = pattern;
            this.#numbers = this.#patternToNumbers();
            while (this.#numbers.length < 3)
                this.#numbers.push(0);
            if (!this.isTicker) {
                while (this.#numbers.length < 19)
                    this.#numbers.push(0);
            }
            else {
                if (this.#numbers.length < 4)
                    this.#numbers.push(0x8001);
                if (this.#numbers.length > 3) {
                    if ((this.#numbers[3] & 0x8000) == 0) {
                        this.#numbers.splice(3, 0, 0x8001);
                    }
                }
            }
        }
        #splitEvery(str, n) {
            if (str == null)
                return [];
            var arr = new Array;
            for (var i = 0; i < str.length; i += n) {
                arr.push(str.substr(i, n));
            }
            return arr;
        }

        #patternToNumbers() {
            return this.#splitEvery(this.#pattern, 4).map(s => parseInt(s, 16));
        }
        #swapHighLow(value) {
            return ((value / 256) & 255) | ((value * 256) & 0xff00);
        }
        #numbersToPattern() {
            return this.#numbers.map(x => x.toString(16).padStart(4, '0')).join('');
        }
        #checkWidth(value) {
            if (this.hasFlags(8) || this.isTicker)
                return value;
            // breite berechnen
            value = 0;
            var mx = this.matrix;
            for (var y = 0; y < 16; y++)
                for (var x = 0; x < 16; x++)
                    if (mx[y][x] == 1)
                        if (x > value)
                            value = x;
            return value;
        }
        get flags() {
            return this.#numbers.length > 1 ? this.#numbers[1] & 65535 : 0;
        }
        set flags(value) {
            this.#numbers[1] = value & 65535;
            this.#pattern = this.#numbersToPattern();
        }
        hasFlags(flags) {
            return (this.flags & flags) == flags ? true : false;
        }
        get duration() {
            return this.#numbers.length > 0 ? this.#numbers[0] : 0;
        }
        set duration(value) {
            this.#numbers[0] = value & 65535;
            this.#pattern = this.#numbersToPattern();
        }
        get signData() {
            return this.#numbers.length > 2 ? this.#numbers[2] : 0;
        }
        set signData(value) {
            this.#numbers[2] = value & 65535;
            this.#pattern = this.#numbersToPattern();
        }
        get sign() {
            return this.signData == 0 ? '' : String.fromCharCode(this.signData);
        }
        get matrix() {
            if (this.isTicker)
                return [];
            return this.#numbers.slice(3, 19).map(l => l.toString(2).padStart(16, '0').split(''));
        }
        set matrix(value) {
            this.isTicker = false;
            this.#numbers = [this.duration, this.flags, this.signData];
            var temp = value.map(x => parseInt(x.join(''), 2) & 65535);
            while (temp.length < 16)
                temp.push(0);
            this.#numbers = this.#numbers.concat(temp);
            this.#pattern = this.#numbersToPattern();
        }
        get pattern() {
            return this.#pattern;
        }
        get espPattern() {
            if (this.isTicker)
                return '';
            var temp = [this.#swapHighLow(this.duration), this.#swapHighLow(this.flags), this.#swapHighLow(this.signData)];
            var m1 = this.matrix.map(x => this.#swapHighLow(parseInt(x.reverse().join(''), 2) & 65535));
            temp = temp.concat(m1);
            return temp.map(x => x.toString(16).padStart(4, '0')).join('');
        }
        get isTicker() {
            return this.hasFlags(1) ? true : false;
        }
        set isTicker(value) {
            if (value)
                this.flags |= 1;
            else
                this.flags &= ~1;
        }
        get repetitions() {
            if (!this.isTicker)
                return 1;
            var result = this.#numbers[3] & 0x7fff;
            if (result == 0)
                return 1;
            return result;
        }
        set repetitions(value) {
            this.#numbers[3] = (value & 0x7fff) | 0x8000;
            this.#pattern = this.#numbersToPattern();
        }
        get isStorage() {
            return this.hasFlags(2) ? true : false;
        }
        set isStorage(value) {
            if (value)
                this.flags |= 2;
            else
                this.flags &= ~2;
        }
        get ticker() {
            if (!this.isTicker)
                return '';
            return String.fromCharCode.apply(this, this.#numbers.slice(4));
        }
        set ticker(value) {
            this.isTicker = true;
            this.#numbers = [this.duration, this.flags, this.signData, this.repetitions | 0x8000];
            var temp = value.split('').map(x => x.charCodeAt(0) & 65535);
            this.#numbers = this.#numbers.concat(temp);
            this.#pattern = this.#numbersToPattern();
        }
        get tickerStart() {
            if (!this.isTicker)
                return 0;
            return (this.flags & 0xf00) >>> 8;
        }
        set tickerStart(value) {
            if (!this.isTicker)
                return;
            this.flags = (this.flags & 0xf0ff) | ((value & 15) << 8);
        }
        get tickerType() {
            if (!this.isTicker)
                return -1;
            return (this.flags & 192) >>> 6;
        }
        set tickerType(value) {
            if (!this.isTicker)
                return;
            this.flags = (this.flags & ~192) | ((value & 3) << 6);
        }
        get width() {
            return this.#checkWidth(((this.flags & 0xf000) >>> 12)) + 1;
        }
        set width(value) {
            if (value == 0) {
                this.flags &= ~8;
                return;
            }
            this.flags = (this.flags & 0x0fff) | (((value - 1) & 15) << 12);
            this.flags |= 8;
        }


        get frameElement() {

            var title = this.duration + " ms";
            if (this.isTicker)
                title = this.ticker.split('').map(x => '&#x' + x.charCodeAt(0).toString(16) + ';').join('') + ' / ' + title + ' / ' + this.repetitions;
            if (this.sign != '')
                title += ' (&#x' + this.signData.toString(16) + '; / ' + this.width + ')';

            var result = $('<canvas width="66" height="66" class="frame" title="' + title + '" data-matrix="' + this.#pattern + '"/>').click(onFrameClick);

            var ctx = result[0].getContext("2d");

            if (!this.isTicker) {

                var temp = this.matrix;

                ctx.fillStyle = "#000000";
                for (var i = 0; i < 16; i += 2) {
                    ctx.fillRect(1, i * 4 + 1, 64, 4);
                    ctx.fillRect(i * 4 + 1, 1, 4, 64);
                }
                ctx.stroke();

                for (var y = 0; y < 16; y++) {
                    for (var x = 0; x < 16; x++) {
                        if (temp[y][x] == 1) {
                            ctx.fillStyle = "#AA0000";
                            ctx.fillRect(x * 4 + 1, y * 4 + 1, 4, 4);
                            ctx.fillStyle = "#FF0000";
                            ctx.fillRect(x * 4 + 2, y * 4 + 1, 2, 4);
                            ctx.fillRect(x * 4 + 1, y * 4 + 2, 4, 2);
                        }
                    }
                }
            }
            else {
                var img = new Image();
                if (this.tickerType == 2) {
                    img.src = 'rep-s.png';
                }
                else if (this.tickerType == 3) {
                    img.src = 'rep-e.png';
                }
                else if (this.ticker == null || this.ticker == '') {
                    img.src = 'ticker-e.png';
                }
                else if (this.tickerType == 0) {
                    img.src = 'ticker-w.png';
                }
                else {
                    img.src = 'ticker-s.png';
                }
                img.decode().then(() => {
                    ctx.drawImage(img, 0, 0);

                });
            }
            return result;
        }

    };


    function ledsToEditorMatrix() {
        editorMatrix = [];
        for (var y = 0; y < 16; y++) {
            var line = [];
            for (var x = 0; x < 16; x++) {
                line.push($leds.find('.item[data-row=' + (y + 1) + '][data-col=' + (x + 1) + '] ').hasClass('active') ? '1' : '0');
            }
            editorMatrix.push(line);
        }
    }



    function patternToFrameElement(pattern) {
        return new FrameData(pattern).frameElement;
    }

    function disableTickerEditor() {
        isMatrixTicker = false;
        $('#matrixcontainer').show();
        $('#ticker').hide();
        $('#shift-buttons-container').css('display', "inline");
    }

    function enableTickerEditor() {
        isMatrixTicker = true;
        $('#ticker').show();
        $('#matrixcontainer').hide();
        $('#shift-buttons-container').css('display', 'none');

    }

    function generateTickerFrames(ticker, duration) {
        // find all characters
        var temp = [];
        ticker.split('').forEach(c => {
            var chd = c.charCodeAt(0);
            var found = null;
            $frames1.find('.frame').each(function () {
                var searchData = new FrameData($(this).attr('data-matrix'));
                if (!searchData.isTicker) {
                    if (searchData.signData == chd) {
                        found = searchData;
                        return false;
                    }
                }
            });
            if (found != null) {
                found.duration = duration;
                temp.push(found);
            }
        })

        var out = [];
        if (temp.length) {
            var matrix = [...new FrameData('').matrix];
            temp.forEach(c => {
                var insertPos = 15;
                for (var inserted = 0; inserted <= c.width; inserted++) {
                    matrix16x16Functions.shiftLeft(matrix);
                    matrix = matrix16x16Functions.mix(matrix, [...c.matrix], 0, insertPos, false);
                    insertPos--;
                    var nf = new FrameData('');
                    nf.matrix = matrix;
                    nf.duration = duration;
                    out.push(nf);
                }

            });
            while (!matrix16x16Functions.isEmpty(matrix)) {
                matrix16x16Functions.shiftLeft(matrix);
                var nf = new FrameData('');
                nf.matrix = matrix;
                nf.duration = duration;
                out.push(nf);
            }
            matrix16x16Functions.shiftLeft(matrix);
            var nf = new FrameData('');
            nf.matrix = matrix;
            nf.duration = duration;
            out.push(nf);
        }
        return out;
    }

    function getOverallMatrixTime() {
        var result = 0;
        playMatrix.forEach(m => result += m.duration);
        return result;
    }

    function pushPlayFrame(tickerFrameData, $sourceFrame, frameDuration, frameStart, sourceMatrix, isCurrentFrame) {
        var source = [...sourceMatrix];
        var blend = tickerFrameData.matrix;
        var matrix = matrix16x16Functions.mix(source, blend, frameStart);
        playMatrix.push({ frame: $sourceFrame, duration: frameDuration, matrix: matrix, patternData: tickerFrameData, timeStart: getOverallMatrixTime(), timeEnd: getOverallMatrixTime() + frameDuration, isCurrentFrame: isCurrentFrame });

    }

    function getGcd(a, b) {
        var Remainder;

        while (b != 0) {
            Remainder = a % b;
            a = b;
            b = Remainder;
        }

        return a;
    }

    function checkTempMatrix(tickerframes, matrixframeData, tickerStart, times) {

        if (matrixframeData.length == 0) {
            tickerframes.forEach(d => {
                pushPlayFrame(d, null, d.duration, tickerStart, [...new FrameData('').matrix], d.isCurrentFrame);
            });
        }
        else if (tickerframes.length == 0) {
            for (var i = 0; i <= times; i++)
                matrixframeData.forEach(d => {
                    playMatrix.push({
                        frame: d.frame, duration: d.duration, matrix: [...d.matrix], patternData: null,
                        timeStart: getOverallMatrixTime(), timeEnd: getOverallMatrixTime() + d.duration, isCurrentFrame: d.isCurrentFrame
                    });
                });
        }
        else {
            if (times > 1) {
                var t = [...matrixframeData];
                for (var i = 1; i < times; i++)
                    matrixframeData = [...matrixframeData, ...t];
            }
            var overall = 0;
            var minFrameDuration = 0xffff;
            matrixframeData.forEach(mfd => {
                overall += mfd.duration;
                if (mfd.duration < minFrameDuration)
                    minFrameDuration = mfd.duration;
            })
            var perTickerFrame = overall / tickerframes.length;
            var gcd = getGcd(Math.trunc(Math.trunc(perTickerFrame) / 10) * 10, minFrameDuration);
            if (gcd < 20)
                gcd = 20; // 50 pics per second max

            var tickerIndex = 0;
            var matrixIndex = 0;
            var tickers = tickerframes.length;
            var matrixes = matrixframeData.length;
            var runTime = 0;

            while ((tickerIndex < tickers) || (matrixIndex < matrixes)) {
                var currentMatrix = matrixframeData[matrixIndex >= matrixes ? matrixes - 1 : matrixIndex];
                var currentTicker = tickerframes[tickerIndex >= tickers ? tickers - 1 : tickerIndex];
                pushPlayFrame(currentTicker, currentMatrix.frame, gcd, tickerStart, [...currentMatrix.patternData.matrix], currentMatrix.isCurrentFrame);
                runTime += gcd;
                tickerIndex = Math.round(runTime / perTickerFrame);
                matrixIndex = 0;
                var tm = 0;
                while (matrixIndex < matrixes) {
                    tm += matrixframeData[matrixIndex].duration;
                    if (tm > runTime)
                        break;
                    matrixIndex++;
                }
            }

        }
    }

    function stopPlaying() {
        $('#play-button-stop').hide();
        $('#play-button-play').show();
        $deleteButton.attr('disabled', 'disabled');
        $updateButton.attr('disabled', 'disabled');
        $insertButton.removeAttr('disabled');
        $frames.find('.frame.selected').removeClass('selected');
        isPlaying = false;
        clearInterval(playMatrixInterval);
        playMatrixInterval = null;
        playMatrix = [];
        playMatrixStartTime = 0;
        playMatrixIndex = -1;
    }

    function getCurrentTime() {
        return new Date().getTime();
    }

    function startPlaying() {
        disableTickerEditor();
        if (playMatrix.length == 0)
            stopPlaying();
        else {
            isPlaying = true;
            $('#play-button-stop').show();
            $('#play-button-play').hide();
            $deleteButton.attr('disabled', 'disabled');
            $updateButton.attr('disabled', 'disabled');
            $insertButton.attr('disabled', 'disabled');
            playMatrixStartTime = 0;
            playMatrix.every(m => {
                if (m.isCurrentFrame) {
                    playMatrixStartTime = m.timeStart;
                    return false;
                }
                return true;
            });
            playMatrixIndex = -1;
            playMatrixTotalDuration = playMatrix[playMatrix.length - 1].timeEnd;
            playMatrixStartTime = getCurrentTime() - playMatrixStartTime;
            playMatrixInterval = setInterval(matrixIntervalFunc, 10);
        }
    }

    function generateSendData() {
        stopPlaying();
        var temp = [...playMatrix];
        var out = [];
        var min = -1;
        var max = -1;
        generatePlayList();
        playMatrix.forEach(md => {
            if (md.matrix && md.matrix.length) {
                var d = new FrameData('');
                d.matrix = md.matrix;
                d.duration = md.duration;
                var esp = d.espPattern;
                if (min == -1 || (min > esp.length))
                    min = esp.length;
                if (max < esp.length)
                    max = esp.length;
                out.push(esp);
            }
        });

        playMatrix = [...temp];

        if ((min != max) || (max > 65535))
            throw 'Ungültige Daten zum Senden';

        return swapBytes(out.length).toString(16).padStart(4, '0') + swapBytes((min / 2)).toString(16).padStart(4, '0') + out.join('');
    }

    function swapBytes(value) {
        return ((value / 256) & 255) | ((value * 256) & 0xff00);
    }

    function generatePlayList() {
        playMatrix = [];
        var tempTicker = [];
        var tempMatrix = [];
        var tickerStart = 0;
        var tickerTimes = 1;
        var isTicker = false;
        lastFrameData = new FrameData('');
        $frames.find('.frame').each(function () {
            var isCurrentFrame = $(this).hasClass('selected');
            var data = new FrameData($(this).attr('data-matrix'));
            if (!data.isTicker) {
                if (!isTicker)
                    playMatrix.push({ frame: $(this), duration: data.duration, matrix: [...data.matrix], patternData: data, timeStart: getOverallMatrixTime(), timeEnd: getOverallMatrixTime() + data.duration, isCurrentFrame: isCurrentFrame });
                else
                    tempMatrix.push({ frame: $(this), duration: data.duration, matrix: [...data.matrix], patternData: data, timeStart: getOverallMatrixTime(), timeEnd: getOverallMatrixTime() + data.duration, isCurrentFrame: isCurrentFrame });
                lastFrameData = new FrameData(data.pattern);
            }
            else {
                if (isTicker)
                    checkTempMatrix(tempTicker, tempMatrix, tickerStart, tickerTimes);
                tempTicker = [];
                tempMatrix = [];
                tickerStart = 0;
                tickerTimes = 1;
                isTicker = false;
                if (((data.ticker != null && data.ticker != '') || data.tickerType == 2) && data.tickerType != 3) {
                    var ticker = generateTickerFrames(data.ticker, data.duration);
                    var $frame = $(this);
                    if (data.tickerType == 0) {
                        for (var i = 0; i < data.repetitions; i++)
                            ticker.forEach(d => {
                                pushPlayFrame(d, $frame, data.duration, data.tickerStart, [...lastFrameData.matrix], isCurrentFrame);
                            });
                    }
                    else if (data.tickerType == 1) {
                        tempTicker = ticker;
                        isTicker = true;
                        tickerStart = data.tickerStart;
                        tickerTimes = data.repetitions;
                    }
                    else if (data.tickerType == 2) {
                        tempTicker = ticker;
                        isTicker = true;
                        tickerStart = 0;
                        tickerTimes = data.repetitions;
                    }
                }
            }

        });
        if (isTicker)
            checkTempMatrix(tempTicker, tempMatrix, tickerStart, tickerTimes);
        tempTicker = [];
        tempMatrix = [];
        tickerStart = 0;
        tickerTimes = 1;
        isTicker = false;
    }


    function matrixIntervalFunc() {
        if (playMatrix.length == 0) {
            $frames.find('.frame.selected').removeClass('selected');
            stopPlaying();
            return;

        }

        var currentTime = getCurrentTime() - playMatrixStartTime;
        var timeMod = currentTime % playMatrixTotalDuration;
        var index = 0;
        var showFrame = null;
        playMatrix.every(m => {
            if (timeMod >= m.timeStart && (timeMod < m.timeEnd)) {
                showFrame = m;
                return false;
            }
            index++;
            return true;
        });
        if (index == playMatrixIndex)
            return;
        playMatrixIndex = index;
        editorMatrix = showFrame.matrix;
        $frames.find('.frame.selected').removeClass('selected');
        if (showFrame.frame)
            showFrame.frame.addClass('selected');
        $('#play-delay-input').val(showFrame.duration);
        matrixToLeds();
    }

    function matrixToLeds() {
        for (var y = 0; y < 16; y++) {
            for (var x = 0; x < 16; x++) {
                $leds.find('.item[data-row=' + (y + 1) + '][data-col=' + (x + 1) + '] ').toggleClass('active', editorMatrix[y][x] == 1);
            }
        }
    }


    function editFrame(frame) {
        $frames.find('.frame.selected').removeClass('selected');
        frame.addClass('selected');
        $deleteButton.removeAttr('disabled');
        $updateButton.removeAttr('disabled');
        editPattern(frame.attr('data-matrix'));
    }


    function setTickerType(value, tickerText) {
        $('#ticker-wait').prop('checked', false);
        $('#ticker-sync').prop('checked', false);
        $('#ticker-end').prop('checked', false);
        $('#ticker-input-c').css('display', 'block');
        $('#ticker-start-c').css('display', 'block');
        $('#ticker-repeat-c').css('display', 'block');
        $('#ticker-type-1-c').css('display', 'block');
        $('#ticker-type-2-c').css('display', 'block');
        $('#ticker-type-3-c').css('display', 'block');
        if (value == 2) {
            $('#ticker-type-1-c').css('display', 'none');
            $('#ticker-type-2-c').css('display', 'none');
            $('#ticker-type-3-c').css('display', 'none');
            $('#ticker-input-c').css('display', 'none');
            $('#ticker-start-c').css('display', 'none');
            $('#play-delay-input').attr('disabled', 'disabled');
        } else if (value == 3) {
            $('#ticker-type-1-c').css('display', 'none');
            $('#ticker-type-2-c').css('display', 'none');
            $('#ticker-type-3-c').css('display', 'none');
            $('#ticker-input-c').css('display', 'none');
            $('#ticker-start-c').css('display', 'none');
            $('#ticker-repeat-c').css('display', 'none');
            $('#play-delay-input').attr('disabled', 'disabled');
        } else if (tickerText == null || tickerText == '') {
            $('#ticker-end').prop('checked', true);
            $('#play-delay-input').attr('disabled', 'disabled');
            $('#ticker-input-c').css('display', 'none');
            $('#ticker-start-c').css('display', 'none');
            $('#ticker-repeat-c').css('display', 'none');
        } else if (value == 0) {
            $('#play-delay-input').removeAttr('disabled');
            $('#ticker-wait').prop('checked', true);
        } else if (value == 1) {
            $('#ticker-sync').prop('checked', true);
            $('#play-delay-input').attr('disabled', 'disabled');
        }
    }

    function getTickerType(tickerText) {
        if ($('#ticker-type-1-c').css('display') == 'none') {
            if ($('#ticker-repeat-c').css('display') == 'none')
                return { type: 3, text: '' };
            return { type: 2, text: '' };
        }
        if ($('#ticker-wait').is(':checked'))
            return { type: 0, text: tickerText };
        if ($('#ticker-end').is(':checked'))
            return { type: 0, text: '' };
        if ($('#ticker-sync').is(':checked'))
            return { type: 1, text: tickerText };
    }


    function editPattern(pattern) {
        var hashData = new FrameData(pattern);
        hashData.isStorage = false;
        flags = hashData.flags;
        signData = hashData.signData;
        $('#play-delay-input').removeAttr('disabled');
        $("#play-delay-input").val(hashData.duration);
        if (hashData.isTicker) {
            enableTickerEditor();
            $('#ticker-input').val(hashData.ticker);
            $('#ticker-start').val(hashData.tickerStart + 1);
            $('#ticker-repeat').val(hashData.repetitions);
            setTickerType(hashData.tickerType, hashData.ticker);
        }
        else {
            disableTickerEditor();
            editorMatrix = hashData.matrix;
            matrixToLeds();
        }
    }


    function editorToFrameElement(isStorage = false) {
        var hashData = new FrameData('');
        hashData.duration = parseInt($("#play-delay-input").val(), 10);
        hashData.flags = flags;
        hashData.signData = signData;
        hashData.isStorage = isStorage;
        if (isMatrixTicker) {
            var data = getTickerType($('#ticker-input').val());
            hashData.ticker = data.text;
            hashData.tickerType = data.type;
            hashData.tickerStart = hashData.tickerType > 1 ? 0 : $('#ticker-start').val() - 1;
            hashData.repetitions = $('#ticker-repeat').val();
        }
        else
            hashData.matrix = editorMatrix;
        return hashData.frameElement;
    }

    function getFrameDataForHash(frames, isStorage) {
        var out = frames.map(function () {
            var hashData = new FrameData($(this).attr("data-matrix"));
            hashData.isStorage = isStorage;
            return hashData.pattern;
        });
        return out;
    }

    function splitEvery(str, n) {
        if (str == null)
            return [];
        var arr = new Array;
        for (var i = 0; i < str.length; i += n) {
            arr.push(str.substr(i, n));
        }
        return arr;
    }



    async function sendDataFor(url, data) {

        let response = await fetch('/reset' + url);

        if (!response.ok) {
            alert("HTTP-Fehler: " + response.status);
            return false;
        }
        let text = await response.text();
        if (text != 'OK') {
            alert("Fehler beim Speichern");
            return false;
        }


        var data = splitEvery(data, 8192).concat('');
        for (var i = 0; i < data.length; i++) {
            response = await fetch('/write' + url + '?p=' + data[i]);
            if (!response.ok) {
                alert("HTTP-Fehler: " + response.status);
                return false;
            }
            let text = await response.text();
            if (text != data[i]) {
                alert("Fehler beim Speichern");
                return false;
            }

        }

        return true;
    }

    async function callEsp(url, data) {

        let response = await fetch(url);

        if (!response.ok) {
            alert("HTTP-Fehler: " + response.status);
            return false;
        }
        let text = await response.text();
        if (text != 'OK') {
            alert("Fehler beim Aufrufen des Controllers");
            return false;
        }

        return true;
    }

    async function pingEsp() {
        try {
            var response = await fetch('ping');
            if (!response.ok)
                return false;
            var text = await response.text();
            return text == 'OK';
        }
        catch {
            return false;
        }
    }

    function saveStateToHash() {

        var out = [...getFrameDataForHash($frames.find('.frame'), false), ...getFrameDataForHash($frames1.find('.frame'), true)];

        window.location.hash = savedHashState = out.join('|');

    }

    function loadStateFromHash() {
        disableTickerEditor();
        $body.addClass("loading");
        stopPlaying();
        window.scrollBy(0, 1);
        setTimeout(function () {
            savedHashState = window.location.hash.slice(1);
            var emptyFrames = true;
            var emptyFrames1 = true;

            if (savedHashState.substr(0, 2).indexOf('_') > -1) {
                savedHashState = savedHashState.replace('_', '');
                emptyFrames1 = false;
            }

            if (savedHashState.substr(0, 1).indexOf('+') > -1) {
                savedHashState = savedHashState.replace('+', '');
                emptyFrames = false;
            }

            savedHashState.split('|').map(p => new FrameData(p)).forEach(hd => {

                var frame = hd.frameElement;
                if (hd.isStorage) {
                    if (emptyFrames1)
                        $frames1.empty();
                    emptyFrames1 = false;
                    $frames1.append(frame);
                }
                else {
                    if (emptyFrames) {
                        $frames.empty();
                        disableTickerEditor();
                    }
                    emptyFrames = false;
                    $frames.append(frame);
                    editFrame(frame);
                }

            });

            window.scrollBy(0, -1);
            $body.removeClass("loading");
        }, 100);


    }


    function onFrameClick() {
        if (isPlaying)
            return;
        var par = $(this).parent();
        var pClass = par.attr("id");
        if (pClass === "frames") {
            $frames.find('.frame.selected').removeClass('selected');
            $(this).addClass('selected');
            $deleteButton.removeAttr('disabled');
            $updateButton.removeAttr('disabled');
            editFrame($(this));
        }
    }

    function processToSave($focusToFrame) {
        $frames.find('.frame.selected').removeClass('selected');

        if ($focusToFrame != null && $focusToFrame.length) {
            $focusToFrame.addClass('selected');
            $deleteButton.removeAttr('disabled');
            $updateButton.removeAttr('disabled');
        } else {
            $deleteButton.attr('disabled', 'disabled');
            $updateButton.attr('disabled', 'disabled');
        }
        saveStateToHash();
    }

    $('#matrix').append($(matrixTableGenerator.table()));

    $leds = $('#matrix');

    $leds.find('.item').mousedown(function () {
        $(this).toggleClass('active');
        ledsToEditorMatrix();
    });

    $('#invert-button').click(function () {
        matrix16x16Functions.invert(editorMatrix);
        matrixToLeds();
    });

    $('#shift-up-button').click(function () {
        matrix16x16Functions.shiftUp(editorMatrix);
        matrixToLeds();
    });

    $('#shift-down-button').click(function () {
        matrix16x16Functions.shiftDown(editorMatrix);
        matrixToLeds();
    });

    $('#shift-right-button').click(function () {
        matrix16x16Functions.shiftRight(editorMatrix);
        matrixToLeds();
    });

    $('#shift-left-button').click(function () {
        matrix16x16Functions.shiftLeft(editorMatrix);
        matrixToLeds();
    });


    $('#rotate-button').click(function () {
        matrix16x16Functions.rotate(editorMatrix);
        matrixToLeds();
    });

    $('#rotate-back-button').click(function () {
        matrix16x16Functions.rotateBack(editorMatrix);
        matrixToLeds();
    });

    $leds.find('.leds-col').mousedown(function () {
        var col = $(this).attr('data-col');
        $leds.find('.item[data-col=' + col + ']').toggleClass('active',
            $leds.find('.item[data-col=' + col + '].active').length != 16);
        ledsToEditorMatrix();
    });

    $leds.find('.leds-row').mousedown(function () {
        var row = $(this).attr('data-row');
        $leds.find('.item[data-row=' + row + ']').toggleClass('active',
            $leds.find('.item[data-row=' + row + '].active').length != 16);
        ledsToEditorMatrix();
    });


    $deleteButton.click(function () {
        var $selectedFrames = $frames.find('.frame.selected');

        if ($selectedFrames.length) {
            var $selectedFrame = $selectedFrames.first();
            var $nextFrame = $selectedFrame.next('.frame').first();

            if (!$nextFrame.length) {
                $nextFrame = $selectedFrame.prev('.frame').first();
            }

            $selectedFrame.remove();

            if ($nextFrame.length) {
                editFrame($nextFrame);
            }

            processToSave($nextFrame);

            matrixToLeds();
        }

        $selectedFrames = $frames1.find('.frame.selected');

        if ($selectedFrames.length) {
            var $selectedFrame = $selectedFrames.first();
            var $nextFrame = $selectedFrame.next('.frame').first();

            if (!$nextFrame.length) {
                $nextFrame = $selectedFrame.prev('.frame').first();
            }

            $selectedFrame.remove();


            processToSave($nextFrame);
            matrixToLeds();

        }
    });

    $insertButton.click(function () {
        ledsToEditorMatrix();
        var $newFrame = editorToFrameElement();
        var $selectedFrame = $frames.find('.frame.selected').first();

        if ($selectedFrame.length) {
            $selectedFrame.after($newFrame);
        } else {
            $frames.append($newFrame);
        }

        processToSave($newFrame);
    });

    $updateButton.click(function () {
        ledsToEditorMatrix();
        var $newFrame = editorToFrameElement();
        var $selectedFrame = $frames.find('.frame.selected').first();

        if ($selectedFrame.length) {
            $selectedFrame.replaceWith($newFrame);
        } else {
            $frames.append($newFrame);
        }

        processToSave($newFrame);
    });

    $writeButton.click(async function () {
        new $.Zebra_Dialog(
            "Daten im Mikrocontroller mit aktuellem Film überschreiben?",
            {
                type: "warning",
                title: "Speichern",
                buttons: ["Ja", "Nein"],
                custom_class: "dialog",
                onClose: async function (caption) {

                    if (caption === "Ja") {
                        saveStateToHash();

                        $body.addClass("loading");

                        var args = window.location.hash.slice(1);
                        console.log(args);
                        var sendData = generateSendData();
                        //$('#debug').val(sendData);
                        console.log(sendData.length);
                        console.log(sendData);
                        if (await sendDataFor("text", args))
                            await sendDataFor("data", sendData)

                        $body.removeClass("loading");
                    }

                }
            }
        );
    });

    $restartFilmButton.click(async function () {
        $body.addClass("loading");
        stopPlaying();
        await callEsp("restartfilm");
        $body.removeClass("loading");
        $('#play-button-stop').show();
        $('#play-button-play').hide();
        generatePlayList();
        startPlaying();
    });

    const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

    $restartButton.click(async function () {
        new $.Zebra_Dialog(
            "Controller neu starten?",
            {
                type: "warning",
                title: "Neustart ESP32",
                buttons: ["Ja", "Nein"],
                custom_class: "dialog",
                onClose: async function (caption) {

                    if (caption === "Ja") {
                        saveStateToHash();

                        $body.addClass("loading");

                        await callEsp("restart");
                        await sleep(2000);

                        while (! await pingEsp()) {
                            await sleep(500);

                        }

                        $body.removeClass("loading");
                    }

                }
            }
        );
    });


    $readButton.click(async function () {

        new $.Zebra_Dialog(
            "Aktuellen Film mit Daten aus Mikrocontroller überschreiben?",
            {
                type: "warning",
                title: "Laden",
                buttons: ["Ja", "Nein"],
                custom_class: "dialog",
                onClose: async function (caption) {

                    if (caption === "Ja") {
                        saveStateToHash();
                        $body.addClass("loading");
                        let response = await fetch('/data.txt');

                        if (response.ok) {
                            let text = await response.text();
                            if (text != "") {
                                window.location.hash = text;
                            }
                        } else {
                            alert("HTTP-Fehler: " + response.status);
                        }
                        $body.removeClass("loading");

                    }

                }
            }
        );

    });



    $('#matrix-toggle').mousedown(function () {
        var col = $(this).attr('data-col');
        $leds.find('.item').toggleClass('active', $leds.find('.item.active').length != 256);
        ledsToEditorMatrix();
    });




    $('#clear-film-button').click(function () {
        new $.Zebra_Dialog(
            "Alle Bilder im Film löschen?",
            {
                type: "warning",
                title: "Film leeren",
                buttons: ["Ja", "Nein"],
                custom_class: "dialog",
                onClose: function (caption) {

                    if (caption === "Ja") {
                        $frames.empty();
                        disableTickerEditor();
                        processToSave(null);

                    }

                }
            }
        );
    });

    $('#store-film-button').click(function () {
        $frames.find('.frame').each(function () {
            $frames1.append(patternToFrameElement($(this).attr("data-matrix")));
        });
        saveStateToHash();
    });


    $('#clear-store-button').click(function () {
        new $.Zebra_Dialog(
            "Alle Bilder im Zwischenspeicher löschen?",
            {
                type: "warning",
                title: "Zwischenspeicher leeren",
                buttons: ["Ja", "Nein"],
                custom_class: "dialog",
                onClose: function (caption) {

                    if (caption === "Ja") {
                        $frames1.empty();
                        processToSave(null);
                    }

                }
            }
        );
    });


    $('#load-store-button').click(function () {
        new $.Zebra_Dialog(
            "Alle Bilder aus Zwischenspeicher an Film anhängen?",
            {
                type: "question",
                title: "Bilder kopieren",
                buttons: ["Ja", "Nein"],
                custom_class: "dialog",
                onClose: function (caption) {

                    if (caption === "Ja") {
                        $frames1.find('.frame').each(function () {
                            $frames.append(patternToFrameElement($(this).attr("data-matrix")));
                        });
                        processToSave(null);
                    }

                }
            }
        );
    });


    $('#timeset-film-button').click(function () {
        new $.Zebra_Dialog(
            "Bitte die Anzeigedauer für alle Bilder im Film in Millisekunden (ms) eingeben:",
            {
                default_value: $('#play-delay-input').val(),
                title: "Anzeigedauer der Bilder ändern",
                type: "prompt",
                buttons: ["OK", "Abbrechen"],
                custom_class: "dialog",
                onClose: function (caption, prompt) {

                    if (caption === "OK" || caption === true) {
                        $frames.find('.frame').each(function () {
                            var hashData = new FrameData($(this).attr('data-matrix'));
                            hashData.duration = prompt;
                            var newFrame = hashData.frameElement;
                            $(this).attr('data-matrix', newFrame.attr('data-matrix'));
                            $(this).attr('title', newFrame.attr('title'));
                        });
                        saveStateToHash();
                        $('#play-delay-input').val(prompt);
                    }

                }
            }
        );
    });

    $('#insert-ticker-button').click(function () {
        enableTickerEditor();
        setTickerType(0, 'x');
        var $newFrame = editorToFrameElement();
        var $selectedFrame = $frames.find('.frame.selected').first();

        if ($selectedFrame.length) {
            $selectedFrame.after($newFrame);
        } else {
            $frames.append($newFrame);
        }

        processToSave($newFrame);
    });

    $('#insert-repeat-button').click(function () {
        enableTickerEditor();
        setTickerType(2, '');
        var $newFrame = editorToFrameElement();
        var $selectedFrame = $frames.find('.frame.selected').first();

        if ($selectedFrame.length) {
            $selectedFrame.after($newFrame);
        } else {
            $frames.append($newFrame);
        }
        enableTickerEditor();
        setTickerType(3, '');
        $selectedFrame = $newFrame;
        $newFrame = editorToFrameElement();

        $selectedFrame.after($newFrame);

        processToSave($newFrame);
    });



    $('#ticker-sync').click(function () {
        setTickerType(1, 'x');
    });

    $('#ticker-wait').click(function () {
        setTickerType(0, 'x');
    });

    $('#ticker-end').click(function () {
        setTickerType(0, '');
    });

    $('#play-button').click(function () {
        if (playMatrixInterval) {
            stopPlaying();
        } else {
            $('#play-button-stop').show();
            $('#play-button-play').hide();
            generatePlayList();

            startPlaying();
        }
    });


    $(window).on('hashchange', function () {
        if (window.location.hash.slice(1) != savedHashState) {
            loadStateFromHash();
        }
    });

    $("#frames, #frames1").sortable({
        items: "> canvas",
        connectWith: ".connectedSortable",
        remove: function (e, li) {
            $frames.find('.frame.selected').removeClass('selected');
            $deleteButton.attr('disabled', 'disabled');
            $updateButton.attr('disabled', 'disabled');
            patternToFrameElement(li.item.attr("data-matrix")).insertAfter(li.item);
            $(this).sortable('cancel');
            return patternToFrameElement(li.item.attr("data-matrix"));
        },
        stop: function (e, ui) {
            processToSave(null);
        }
    });


    function performDeleteMenuCommand(node) {
        saveStateToHash();
        node[0].remove();
        processToSave(null);
    }
    function performCopyMenuCommand(node) {
        copiedFrame = $(node[0]).attr("data-matrix");
    }
    function performCutMenuCommand(node) {
        copiedFrame = $(node[0]).attr("data-matrix");
        saveStateToHash();
        node[0].remove();
        processToSave(null);
    }
    function performPasteAfterMenuCommand(node) {
        var newElement = patternToFrameElement(copiedFrame);
        saveStateToHash();
        node.after(newElement);
        processToSave(null);
    }
    function performPasteMenuCommand(node) {
        var newElement = patternToFrameElement(copiedFrame);
        saveStateToHash();
        node.append(newElement);
        processToSave(null);
    }
    function performInsertImageMenuCommand(node) {
        $("#imagefiles").click();
    }


    function performEditSignMenuCommand(node) {
        new $.Zebra_Dialog(
            "Bitte das zugeordnete Textzeichen eingeben:",
            {
                default_value: new FrameData(node.attr('data-matrix')).sign,
                title: "Zeichen festlegen",
                type: "prompt",
                buttons: ["OK", "Abbrechen"],
                custom_class: "dialog",
                onClose: function (caption, prompt) {

                    if (caption === "OK" || caption === true) {

                        var data = new FrameData(node.attr('data-matrix'));
                        data.signData = 0;

                        if (prompt != "" && prompt != null) {
                            data.signData = prompt.substr(0, 1).charCodeAt(0);
                        }
                        var newFrame = data.frameElement;
                        node.attr('title', newFrame.attr('title'));
                        node.attr('data-matrix', newFrame.attr('data-matrix'));

                        saveStateToHash();
                    }

                }
            }
        );
    }

    function performEditSignWidthMenuCommand(node) {
        new $.Zebra_Dialog(
            "Bitte die Breite des Zeichen eingeben (0-16):",
            {
                default_value: new FrameData(node.attr('data-matrix')).width,
                title: "Zeichenbreite festlegen",
                type: "prompt",
                buttons: ["OK", "Abbrechen"],
                custom_class: "dialog",
                onClose: function (caption, prompt) {

                    if (caption === "OK" || caption === true) {

                        var data = new FrameData(node.attr('data-matrix'));
                        data.width = prompt;

                        var newFrame = data.frameElement;
                        node.attr('title', newFrame.attr('title'));
                        node.attr('data-matrix', newFrame.attr('data-matrix'));

                        saveStateToHash();
                    }

                }
            }
        );
    }

    $.contextMenu({
        selector: '#frames .frame',
        items: {
            cut: {
                name: "Ausschneiden",
                callback: function () {
                    performCutMenuCommand($(this));
                }
            },
            copy: {
                name: "Kopieren",
                callback: function () {
                    performCopyMenuCommand($(this));
                }
            },
            paste: {
                name: "Einfügen",
                disabled: function () {
                    return copiedFrame == "" || copiedFrame == null;
                },
                callback: function () {
                    performPasteAfterMenuCommand($(this));
                }
            },

            delete: {
                name: "Löschen",
                callback: function () {
                    performDeleteMenuCommand($(this));
                }
            },
        }
    });

    $.contextMenu({
        selector: '#frames',
        items: {
            paste: {
                name: "Einfügen",
                disabled: function () {
                    return copiedFrame == "" || copiedFrame == null;
                },
                callback: function () {
                    performPasteMenuCommand($(this));
                }
            },
            image: {
                name: "Bild einfügen",
                callback: function () {
                    performInsertImageMenuCommand($(this));
                }
            }
        },


    });

    $.contextMenu({
        selector: '#frames1 .frame',
        items: {
            cut: {
                name: "Ausschneiden",
                callback: function () {
                    performCutMenuCommand($(this));
                }
            },
            copy: {
                name: "Kopieren",
                callback: function () {
                    performCopyMenuCommand($(this));
                }
            },
            paste: {
                name: "Einfügen",
                disabled: function () {
                    return copiedFrame == "" || copiedFrame == null;
                },
                callback: function () {
                    performPasteAfterMenuCommand($(this));
                }
            },
            delete: {
                name: "Löschen",
                callback: function () {
                    performDeleteMenuCommand($(this));
                }
            },
            editSign: {
                name: "Zeichen festlegen",
                callback: function () {
                    performEditSignMenuCommand($(this));
                }
            },
            editWidth: {
                name: "Zeichenbreite festlegen",
                callback: function () {
                    performEditSignWidthMenuCommand($(this));
                }
            },
        }
    });

    $.contextMenu({
        selector: '#frames1',
        items: {
            paste: {
                name: "Einfügen",
                disabled: function () {
                    return copiedFrame == "" || copiedFrame == null;
                },
                callback: function () {
                    performPasteMenuCommand($(this));
                }
            }
        },


    });


    function appendImageFrame(img) {
        var canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 16, 16);

        var imageData = ctx.getImageData(0, 0, 16, 16);
        var pixels = imageData.data;
        var temp = [];

        var y = 0;
        var x = 0;
        for (var i = 0; i < pixels.length; i += 4) {
            var r = pixels[i];
            var g = pixels[i + 1];
            var b = pixels[i + 2];
            var v = r | g | b;
            var y1 = Math.trunc(y);
            var x1 = Math.trunc(x);
            while (temp.length <= y1)
                temp.push([]);
            while (temp[y1].length <= x1)
                temp[y1].push(0);
            temp[y1][x1] += v;
            x++;
            if (x >= 16) {
                y++;
                x = 0;
            }
        }

        var min = -1;
        var max = -1;
        for (var y = 0; y < 16; y++)
            for (var x = 0; x < 16; x++) {
                if (min == -1 || min < temp[y][x])
                    min = temp[y][x];
                if (max == -1 || max > temp[y][x])
                    max = temp[y][x];
            }
        var thr = (min + max) / 2;
        for (var y = 0; y < 16; y++)
            for (var x = 0; x < 16; x++) {
                if (temp[y][x] < thr)
                    temp[y][x] = 0;
                else
                    temp[y][x] = 1;

            }

        var frame = new FrameData('');
        frame.matrix = temp;
        frame.duration = 100;
        $frames.append(frame.frameElement);
    }

    function loadImageClicked(evt) {
        var tgt = evt.target,
            files = tgt.files;
        if (files) {
            [...files].every(f => {
                // FileReader support
                const img = new Image();
                img.src = URL.createObjectURL(f);
                img.onload = function () {
                    URL.revokeObjectURL(this.src);
                    appendImageFrame(this);
                    document.getElementById('imagefiles').value = null;
                }
                return true;
            });
        }
    }


    document.getElementById('imagefiles').addEventListener('change', loadImageClicked, false);

    loadStateFromHash();


});