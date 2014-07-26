(function( $, undefined ) {

$.KBWidget({
    name: "kbaseMediaEditor",
    version: "1.0.0",
    options: {
    },
    init: function(options) {
        this._super(options);
        var self = this;
        var media = options.ids[0];
        var ws = options.workspaces[0];        
        var mediadata = options.data[0];
        var container = this.$elem;
        media_view(container, mediadata);

        function media_view(container, data) {
            $('.loader-rxn').remove();

            container.append('<b>Name: </b>'+data.id+' <b>pH: </b>'+data.pH+
                '<button class="btn btn-default pull-right edit-media">Edit</button><br><br>');

            var table = $('<table class="table table-striped table-bordered">')
           
            table.append('<tr><th>Compound</th><th>Concentration</th><th>min_flux</th><th>max_flux</th></tr>')
            for (var i in data.media_compounds) {
                table.append('<tr><td>"'+data.media_compounds[i].name+'"</td>\
                    <td>'+data.media_compounds[i].concentration+'</td>\
                    <td>'+data.media_compounds[i].min_flux+'</td>\
                    <td>'+data.media_compounds[i].max_flux+'</td></tr>');
            }
            container.append(table);

            $('.edit-media').click(function() {
                container.html('');                
                media_view_editable(container, data)
            })
        }


        function media_view_editable(container, data) {
            $('.loader-rxn').remove();

            container.append('<b>Name: </b>'+data.id+' <b>pH: </b>'+data.pH+
                '<button class="btn btn-default pull-right cancel-edit-media">Cancel</button><br><br>');           

            var table = $('<table class="table table-striped table-bordered">')
           
            table.append('<tr><th>Compound</th><th>Concentration</th><th>min_flux</th><th>max_flux</th><th>Delete/Add</th></tr>')
            for (var i in data.media_compounds) {
                table.append('<tr><td><input id="cmpds'+i+'" class="form-control" value="'+data.media_compounds[i].name+'"></input></td>\
                    <td><input id="conc'+i+'" class="form-control" value='+data.media_compounds[i].concentration+'></input></td>\
                    <td><input id="minflux'+i+'" class="form-control" value='+data.media_compounds[i].min_flux+'></input></td>\
                    <td><input id="maxflux'+i+'" class="form-control" value='+data.media_compounds[i].max_flux+'></input></td>\
                    <td><button id="del'+i+'" onclick="$(this).closest(&#39;tr&#39).remove()" class="form-control"><span class="glyphicon glyphicon-trash"></span></button></tr>');
            }

            table.append('<tr><td><input id="addCmpds" class="form-control" placeholder="add Compound"></input></td>\
                    <td><input id="addConc" class="form-control" placeholder="add Concentration"></input></td>\
                    <td><input id="addMinflux" class="form-control" placeholder="add Minflux"></input></td>\
                    <td><input id="addMaxflux" class="form-control" placeholder="add Maxflux"></input></td>\
                    <td><button id="addRow" class="form-control"><span class="glyphicon glyphicon-plus"></span></button></tr>');


            container.append(table)

            $("#addRow").click(function(e) {
                e.preventDefault();

                //var table = $('<table class="table table-striped table-bordered">')
                var newCmpd = $('#addCmpds').val();
                var newConc = $('#addConc').val();
                var newMinflux = $('#addMinflux').val();
                var newMaxflux = $('#addMaxflux').val();
                var last = $('[id^=cmpds]').length
                //alert ();
                var rowToAdd = '<tr><td><input id="cmpds'+last+'" class="form-control" value="'+newCmpd+'"></input></td>\
                        <td><input id="conc'+last+'" class="form-control" value="'+newConc+'"></input></td>\
                        <td><input id="minflux'+last+'" class="form-control" value="'+newMinflux+'"></input></td>\
                        <td><input id="maxflux'+last+'" class="form-control" value="'+newMaxflux+'"></input></td>\
                        <td><button id="del'+last+'" onclick="$(this).closest(&#39;tr&#39).remove()" class="form-control"><span class="glyphicon glyphicon-trash"></span></button></tr>'

                 table.append(rowToAdd)

                var row = $(this).closest('tr');
                row.next().after(row);


           });
    

            container.append('<a class="btn btn-primary save-to-ws-btn">Save to a workspace -></a>');
            events();

            $('.cancel-edit-media').click(function() {
                container.html('');                
                media_view(container, data)
            })            
        }

        function events() {
            $('.save-to-ws-btn').unbind('click');
            $('.save-to-ws-btn').click(function() {
                //var media_id=data.id;
                //var name=data.id;
                var cmpds = [];
                var conc = [];
                var minflux = [];
                var maxflux = [];
                var compounds = $('[id^=cmpds]');
                var concentrations = $('[id^=conc]');
                var minfluxes = $('[id^=minflux]');
                var maxfluxes = $('[id^=maxflux]');
                for (var i=0;i < compounds.length; i++) {
                	cmpds.push(compounds[i].value);
                	conc.push(concentrations[i].value);
                	minflux.push(minfluxes[i].value);
                	maxflux.push(maxfluxes[i].value);
                }
                //var test = $('#save-to-ws').kbaseSimpleWSSelect({defaultWS:ws, auth: token});
                //test.show();
				var newmedia = {
                    wsid: media,
                    ws: ws,
                    name: mediadata.name,
                    isDefined: 0,
                    isMinimal: 0,
                    type: 'unknown',
					media_compounds: []
                };
				for (var i=0;i < compounds.length; i++) {
                	if (cmpds[i]) {
                		newmedia.media_compounds.push({
                			name: cmpds[i],
                			concentrations: conc[i],
                			min_flux: minflux[i],
                			max_flux: maxflux[i]          	
                		});
                	}
            	}
				var output = saveMedia(newmedia);
				//container.append('<div id="save-to-ws"><p>Media successfully saved - '+output[0]+'!</p></div>');
                //self.trigger('saveToWSClick', newmedia);
            });
        }

        function saveMedia(data) {
            var cmpds =[];
            var conc =[];
            var minflux =[];
            var maxflux =[];
            for (var i in data.media_compounds) {
                cmpds.push(data.media_compounds[i].name);
                conc.push(data.media_compounds[i].concentrations);
                minflux.push(data.media_compounds[i].min_flux);
                maxflux.push(data.media_compounds[i].max_flux);
            }
            var ajax = kb.fba.addmedia({
                media: data.wsid,
                workspace: data.ws,
                name: data.name,
                isDefined: data.isDefined,
                isMinimal: data.isMinimal,
                type: data.type,
                compounds: cmpds,
                concentrations: conc,
                maxflux: maxflux,
                minflux: minflux
            });
            self.$elem.append('<div id="save-media-loader"><p><img src="assets/img/ajax-loader.gif"> loading...</p></div>');
            $.when(ajax).done(function(data){
                var element = $('[id^=save-media-loader]');
                element[0].innerHTML = "<p>Media successfully saved!</p>";
            });
            $.when(ajax).fail(function(data){
                var array = data.error.message.split('_ERROR_');
                var element = $('[id^=save-media-loader]');
                if (array[1]) {
                	element[0].innerHTML = "<p>Media save failed with error: "+array[1]+"</p>";
                } else {
                	element[0].innerHTML = "<p>Media save failed!</p>"
                }
            });
        }
  
        function get_genome_id(ws_id) {
            var pos = ws_id.indexOf('.');
            var ws_id = ws_id.slice(0, ws_id.indexOf('.', pos+1));
            return ws_id;
        }

        $('#rxn-tabs a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        })

        //this._rewireIds(this.$elem, this);
        return this;
    }  //end init
})
}( jQuery ) );
