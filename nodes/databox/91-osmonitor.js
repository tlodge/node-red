module.exports = function(RED) {

    "use strict";
    var request = require('request');
    var moment = require('moment');
    var databox = require('node-databox');
    var url = require("url");

    function OSMonitor(n) {

        const  API_ENDPOINT = JSON.parse(process.env[`DATASOURCE_${subtype}`] || '{}');
        const  HREF_ENDPOINT = API_ENDPOINT.href || ''; 
        this.name = n.name;

        RED.nodes.createNode(this,n);
        var node = this;
        new Promise((resolve,reject)=>{
                setTimeout(resolve,10000);
        }).then(()=>{
            var dataEmitter = null; 
            
            if (HREF_ENDPOINT != ''){

                console.log("setting up endpoints...");
                var endpointUrl = url.parse(HREF_ENDPOINT);
                var dsID = API_ENDPOINT['item-metadata'].filter((itm)=>{return itm.rel === 'urn:X-databox:rels:hasDatasourceid'; })[0].val;
                var dsUrl = endpointUrl.protocol + '//' + endpointUrl.host;
                var dsType = API_ENDPOINT['item-metadata'].filter((itm)=>{return itm.rel === 'urn:X-databox:rels:hasType';})[0].val;
        
                //pull out the latest....
                databox.timeseries.latest(dsUrl, dsID)
                .then((data)=>{
                    console.log("GOT LATEST READING!");
                    console.log(data);
                    console.log(data[0].data);
                })
                .catch((err)=>{
                    console.log("[Error getting timeseries.latest]",dsUrl, dsID);
                });

                //subscribe
                databox.subscriptions.connect(HREF_ENDPOINT)
                .then((emitter)=>{
                    dataEmitter = emitter;
                    var endpointUrl = url.parse(HREF_ENDPOINT);
                    var dsID = API_ENDPOINT['item-metadata'].filter((itm)=>{return itm.rel === 'urn:X-databox:rels:hasDatasourceid'; })[0].val;
                    var dsUrl = endpointUrl.protocol + '//' + endpointUrl.host;
                    console.log("[subscribing]",dsUrl,dsID);
                    databox.subscriptions.subscribe(dsUrl,dsID,'ts').catch((err)=>{console.log("[ERROR subscribing]",err)});
                    
                    dataEmitter.on('data',(hostname, dsID, data)=>{
                        console.log(hostname, dsID, data);
                        node.send({
                            name: n.name || "osmonitor",
                            id:  n.id,
                            subtype: n.subtype,
                            type: "osmonitor",
                            payload: {
                                ts: moment.utc(time).unix(),
                                value: data, 
                            },
                        });   
                    });

                    dataEmitter.on('error',(error)=>{
                        console.log(error);
                    });
                
                }).catch((err)=>{console.log("[Error] connecting ws endpoint ",err);});
            }
        });

        this.on("close", function() {
            console.log(`${node.id} stopping requests`);
        });
       
    }

    // Register the node by name. This must be called beforeoverriding any of the
    // Node functions.
    RED.nodes.registerType("osmonitor",OSMonitor);

}
