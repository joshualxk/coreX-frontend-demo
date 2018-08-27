(function (ctx) {

    const DEF_TYPE = 0;
    const DEF_VERSION = '1.0';

    const TYPE_RESPONSE = 4;
    const TYPE_PUSH = 5;

    const STATE_CLOSED = 0;
    const STATE_OPEN = 1;
    const STATE_WAITING = 2;

    const timeout = 10 * 1000;      // 10s

    let RPC = {};
    let ws;
    let state = STATE_CLOSED;
    let onCloseEvent;

    let idCounter = 0;
    let cbQueue = {};

    function now() {
        return +new Date();
    }

    function newPayload(id, module, api, params) {
        return {
            t: 3,
            b: {
                id: id,
                t: DEF_TYPE,
                m: {
                    m: module,
                    a: api,
                    v: DEF_VERSION
                },
                a: {
                    t: 0
                },
                ts: now(),
                b: params
            }
        }
    }

    function addCb(id, cb) {
        cbQueue[id] = {ts: now(), cb: cb};
    }

    function executeCb(resp) {
        let id = resp.id;
        let v = cbQueue[id];
        if (v) {
            delete cbQueue[id];
            v.cb(resp);
        } else {
            console.log("未处理消息:", resp);
        }
    }

    function newLocalError(msg) {
        return {'id': 0, 'code': -9999, 'msg': msg, 'ts': now(), 'b': null};
    }

    RPC.isWsOpen = function () {
        return state === STATE_OPEN;
    };

    RPC.isWsClosed = function () {
        return state === STATE_CLOSED;
    };

    RPC.openWs = function (onOpen, onPush, onClose) {
        if (!RPC.isWsClosed()) {
            throw new Error("已经连接");
        }
        state = STATE_WAITING;

        ws = new WebSocket('ws:' + location.host + '/wsapp');
        // ws.binaryType = 'arraybuffer';
        ws.onopen = function (ev) {
            state = STATE_OPEN;
            console.log('on open');

            ws.onmessage = function (ev) {
                console.log('on msg ->', ev.data);

                let v = JSON.parse(ev.data);
                let resp = v.b;
                if (v.t === TYPE_RESPONSE) {
                    executeCb(resp);
                } else if (v.t === TYPE_PUSH) {
                    if (onPush) {
                        onPush(resp);
                    }
                }
            };

            ws.onclose = function (ev) {
                state = STATE_CLOSED;
                console.log('on close');

                ws = null;

                if (onClose) {
                    onClose();
                }

                if (onCloseEvent) {
                    onCloseEvent();
                    onCloseEvent = null;
                }
            };

            if (onOpen) {
                onOpen();
            }
        };
    };

    RPC.closeWs = function (onCloseEvt) {
        if (RPC.isWsClosed()) {
            if (onCloseEvt) {
                onCloseEvt();
            }
            return;
        } else if (!RPC.isWsOpen()) {
            throw new Error('等待关闭中...');
        }

        onCloseEvent = onCloseEvt;
        ws.close();
    };

    RPC.send = function (module, api, params, cb) {
        if (!RPC.isWsOpen()) {
            if (cb) {
                cb(newLocalError('尚未连接'));
            }
            return;
        }
        let id = cb ? ++idCounter : 0;
        let payload = newPayload(id, module, api, params);
        let content = JSON.stringify(payload);
        console.log("on send ->", content);

        ws.send(content);

        if (cb) {
            addCb(id, cb);
        }
    };

    ctx.RPC = RPC;

})(window);
