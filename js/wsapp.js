(function (ctx) {

    let RPC = {};

    let idCounter = 0;

    const DEF_TYPE = 0;
    const DEF_VERSION = '1.0';

    RPC.newPayload = function (module, api, token, params, cb) {
        let id = cb == null ? 0 : ++idCounter;
        let authType = token == '' ? 0 : 1;

        // TODO register cb
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
                    t: authType,
                    to: token
                },
                ts: now(),
                b: params
            }
        }
    };

    function now() {
        return +new Date();
    }

    ctx.RPC = RPC;

})(window);
