function isDefinedValue(v) {
    return !(v == null || typeof v === 'undefined');
}

function isUInt(v) {
    return typeof v === 'number' && Math.floor(v) === v && v >= 0;
}

module.exports = function(RED) {
    var handle_error = function(err, node, done) {
        node.log(err.body);
        node.status({ fill: "red", shape: "dot", text: err.message });

        if (done) {
            done(err);
        } else {
            node.error(err, err.message);
        }
    };

    function OdooXMLRPCExecNode(config) {
        RED.nodes.createNode(this, config);
        this.host = RED.nodes.getNode(config.host);
        var node = this;

        node.on('input', function(msg, send, done) {
            node.status({});
            send = send || function() { node.send.apply(node, arguments) }

            this.host.connect(function(err, odoo_inst) {
                if (err) {
                    return handle_error(err, node, done);
                }

                var method = config.method;
                if (isDefinedValue(msg.method)) {
                    node.log('method overwritten by msg');
                    method = msg.method;
                }

                var ids = msg.payload;
                if (!isDefinedValue(ids) && !(isDefinedValue(msg.params))) {
                    return handle_error(new Error('Payload or Params has to be the record identifier(s)'), node, done);
                }
                if (isDefinedValue(ids) && !Array.isArray(ids)) {
                    return handle_error(new Error('Payload has to be an array of record identifiers'), node, done);
                }

                var params = [];
                params.push([ids]);

                if (isDefinedValue(msg.params)) {
                    params = msg.params;
                }
                // method = read, params = [ [ ids, [ "name" ] ], { "context": { "lang": "zh_CN" } } ]
                // [*args,**kw], [(),{}]
                node.status({ fill: "green", shape: "dot", text: JSON.stringify(params) });

                odoo_inst.execute_kw(config.model, method, params, function(err, value) {
                    if (err) {
                        return handle_error(err, node, done);
                    }

                    msg.payload = value;

                    if (value === true) node.status({ fill: "green", shape: "dot", text: "'" + method + "' executed" });

                    send(msg);

                    if (done) { done(); }
                });
            });
        });
    }
    RED.nodes.registerType("odoo-xmlrpc-exec", OdooXMLRPCExecNode);
};