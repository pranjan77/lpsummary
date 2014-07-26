(function( $, undefined ) {

$.KBWidget({
    name: "kbaseModelTabs",    
    version: "1.0.0",
    options: {
    },

    getData: function() {
        return {
            id: this.options.id,
            type: "Model",
            workspace: this.options.ws,
            title: this.options.title
        };
    },

    init: function(options) {
        this._super(options);
        var self = this;        
        var models = options.id;
        var ws = options.ws
        var data = options.modelsData;
        var token = options.token;
        var fba = new fbaModelServices("http://kbase.us/services/fba_model_services"); //options.api;
        console.log(data)

        var container = this.$elem;

        var tables = ['Reactions', 'Compounds', 'Compartment', 'Biomass', 'Gapfill', 'Gapgen'];
        var tableIds = ['reaction', 'compound', 'compartment', 'biomass', 'gapfill', 'gapgen'];

        // build tabs
        var tabs = $('<ul id="table-tabs" class="nav nav-tabs"> \
                        <li class="active" > \
                        <a href="#'+tableIds[0]+'" data-toggle="tab" >'+tables[0]+'</a> \
                      </li></ul>');
        for (var i=1; i<tableIds.length; i++) {
            tabs.append('<li><a href="#'+tableIds[i]+'" data-toggle="tab">'+tables[i]+'</a></li>');
        }

        // add tabs
        container.append(tabs);

        var tab_pane = $('<div id="tab-content" class="tab-content">')
        // add table views (don't hide first one)
        tab_pane.append('<div class="tab-pane in active" id="'+tableIds[0]+'"> \
                            <table cellpadding="0" cellspacing="0" border="0" id="'+tableIds[0]+'-table" \
                            class="table table-bordered table-striped" style="width: 100%;"></table>\
                        </div>');

        for (var i=1; i<tableIds.length; i++) {
            var tableDiv = $('<div class="tab-pane in" id="'+tableIds[i]+'"> ');
            var table = $('<table cellpadding="0" cellspacing="0" border="0" id="'+tableIds[i]+'-table" \
                            class="table table-striped table-bordered">');
            tableDiv.append(table);
            tab_pane.append(tableDiv);
        }

        container.append(tab_pane)

        // event for showing tabs
        $('#table-tabs a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        })

        var tableSettings = {
            "sPaginationType": "bootstrap",
            "iDisplayLength": 10,
            "aLengthMenu": [5, 10, 25,50,100],            
            "aaData": [],
            "oLanguage": {
                "sSearch": "Search all:"
            }
        }


        model = data[0].data;

        // compartment table
        var dataDict = model.modelcompartments;
        var keys = ["label", "pH", "potential"];
        var labels = ["name", "pH", "potential"];
        var cols = getColumns(keys, labels);
        tableSettings.aoColumns = cols;
        var table = $('#compartment-table').dataTable(tableSettings);
        table.fnAddData(dataDict);

        // reaction table
        var dataDict = formatRxnObjs(model.modelreactions);
        var keys = ["reaction", "name", "eq"]
        var labels = ["reaction", "name", "eq"]// "equation", features","name"];
        var cols = getColumns(keys, labels);
        var rxnTableSettings = $.extend({}, tableSettings, {fnDrawCallback: rxnEvents});   
        rxnTableSettings.aoColumns = cols;
        rxnTableSettings.aoColumns[0].sWidth = '15%';        
        var table = $('#reaction-table').dataTable(rxnTableSettings);
        table.fnAddData(dataDict);

        // compound table
        var dataDict = formatCpdObjs(model.modelcompounds);
        var keys = ["id", "name", "formula"]//["compartment", "compound", "name"];
        var labels = ["id", "name", "formula"]//["compartment", "compound", "name"];
        var cols = getColumns(keys, labels);
        var cpdTableSettings = $.extend({}, tableSettings, {fnDrawCallback: cpdEvents});           
        cpdTableSettings.aoColumns = cols;
        var table = $('#compound-table').dataTable(cpdTableSettings);
        table.fnAddData(dataDict);

        // biomass table
        var dataDict = model.biomasses;
        var keys = ["id", "name", "eq"];
        var labels = ["id", "name", "eq"];
        var cols = getColumns(keys, labels);
        tableSettings.aoColumns = cols;
        var table = $('#biomass-table').dataTable(tableSettings);
        table.fnAddData(dataDict);

        // gapfilling table
        
        /*
        var dataDict = model.gapfillings;
        console.log(dataDict)
        var keys = ["id", "integrated"];
        var labels = ["ID", "Integrated"];
        var cols = getColumns(keys, labels);
        tableSettings.aoColumns = cols;
        var table = $('#gapfill-table').dataTable(tableSettings);
        table.fnAddData(dataDict);
        */
        gapFillTableWS(model.gapfillings);

        // gapgen table
        /*
        var model_gapgen = model.gapgen;
        var keys = ["id", "index", "name", "pH","potential"];
        var labels = ["id", "index", "name", "pH","potential"];
        var cols = getColumns(keys, labels);
        tableSettings.aoColumns = cols;
        var table = $('#gapgen-table').dataTable(tableSettings);
        */
        function formatRxnObjs(rxnObjs) {
            var rxn_objs = []
            for (var i in rxnObjs) {
                var rxn = $.extend({}, rxnObjs[i] );
                rxn.reaction = '<a class="rxn-click" data-rxn="'+rxn.id.split('_')[0]+'">'
                            +rxn.id.split('_')[0]+'</a> ('+rxn.id.split('_')[1] +')'
                //rxn.features = rxn.features.join('<br>')
                rxn_objs.push(rxn)
            }
            return rxn_objs;
        }

        function formatCpdObjs(cpdObjs) {
            var cpd_objs = []
            for (var i in cpdObjs) {
                var cpd = $.extend({}, cpdObjs[i] );
                cpd.id = '<a class="cpd-click" data-cpd="'+cpd.id.split('_')[0]+'">'
                            +cpd.id.split('_')[0]+'</a> ('+cpd.id.split('_')[1] +')'
                //rxn.features = rxn.features.join('<br>')
                cpd_objs.push(cpd)
            }
            return cpd_objs;
        }

        function getColumns(keys, labels) {
            var cols = [];

            for (var i=0; i<keys.length; i++) {
                cols.push({sTitle: labels[i], mData: keys[i]})
            }
            return cols;
        }

        function rxnEvents() {
            $('.rxn-click').unbind('click');
            $('.rxn-click').click(function() {
                var rxn = [$(this).data('rxn')];
                self.trigger('rxnClick', {ids: rxn});
            });
        }

        function cpdEvents() {
            $('.cpd-click').unbind('click');
            $('.cpd-click').click(function() {
                var cpd = [$(this).data('cpd')];
                self.trigger('cpdClick', {ids: cpd});
            });
        }        



        function gapFillTableWS(gapfillings) {
            var tableSettings = {
                "sPaginationType": "bootstrap",
                "iDisplayLength": 10,
                "aLengthMenu": [5, 10, 25,50,100],            
                "aaData": [],
                "oLanguage": {
                    "sSearch": "Search all:",
                    "sEmptyTable": "No gapfill objects for this model."
                },
               "fnDrawCallback": events,                
            }

            var data = $.extend(model.gapfillings, {})
            var keys = ["id", "integrated"];
            var labels = ["ID", "Integrated"];
            var cols = getColumns(keys, labels);
            tableSettings.aoColumns = cols;
            var gapTable = $('#gapfill-table').dataTable(tableSettings);


            var refs = []
            console.log('data', data)
            for (var i in data) {
                var obj = {}
                var ref =  data[i].gapfill_ref
                obj.wsid = ref.split('/')[0];
                obj.objid = ref.split('/')[1];
                obj.name = data[i].id
                refs.push(obj)
            }
            console.log(refs)

            for (var i in refs) {
                var ws =  refs[i].wsid;
                var id = refs[i].objid;
                var name = refs[i].name

                data[i].id = '<a class="show-gap" data-name="'+name+'" data-id="'+id+'" data-ws="'+ws+'">'+name+'</a>';
                data[i].integrated = (data[i].integrated == 1 ? 'Yes' : 'No')
            }

            gapTable.fnAddData(data);



            function events() {
                $('.show-gap').unbind('click');
                $('.show-gap').click(function() {
                    var id = $(this).data('id');
                    var ws = $(this).data('ws');
                    var gap_name = $(this).data('name');
                    console.log('gap name', gap_name)

                    var tr = $(this).closest('tr')[0];
                    if ( gapTable.fnIsOpen( tr ) ) {
                        gapTable.fnClose( tr );
                    } else {
                        gapTable.fnOpen( tr, '', "info_row" );
                        $(this).closest('tr').next('tr').children('.info_row').append('<p class="muted loader-gap-sol"> \
                            <img src="assets/img/ajax-loader.gif"> loading possible solutions...</p>')                
                        showGapfillSolutionsWS(tr, id, ws, gap_name);
                    }


                })
            }


            function showGapfillSolutionsWS(tr, id, ws, gap_name){
                var p = kb.fba.get_gapfills({gapfills: [id], workspaces: [ws]})
                $.when(p).done(function(data) {
                    console.log('gapfill solutions ', data)
                    var data = data[0];  // only one gap fill solution at a time is cliclsked
                    var sols = data.solutions;

                    //$(tr).next().children('td').append('<h5>Gapfill Details</h5>');

                    var solList = $('<div class="gap-selection-list">');

                    for (var i in sols) {
                        var sol = sols[i];
                        var solID = sol.id;

                        var accepted_id = gap_name.replace(/(\.|\|)/g,'_')+solID.replace(/\./g,'_')

                        if (sol.integrated == "1") {
                            solList.append('<div> <a type="button" class="gap-sol"\
                                data-toggle="collapse" data-target="#'+accepted_id+'" >'+
                                solID+'</a> (Integrated)<span class="caret" style="vertical-align: middle;"></span>\
                                 </div>');
                            /*
                            <div class="radio inline gapfill-radio"> \
                                    <input type="radio" name="gapfillRadios" id="gapfillRadio'+i+'" value="integrated" checked>\
                                </div> <span class="label integrated-label">Integrated</span>\
                                    <button data-gapfill="'+gapRef+solID+'"\
                                     class="hide btn btn-primary btn-mini integrate-btn">Integrate</button> \
                            */
                        } else {
                            solList.append('<div> <a type="button" class="gap-sol"\
                                data-toggle="collapse" data-target="#'+accepted_id+'" >'+
                                solID+'</a> <span class="caret" style="vertical-align: middle;"></span>\
                                </div>');

                            /*
                                <div class="radio inline gapfill-radio"> \
                                    <input type="radio" name="gapfillRadios" id="gapfillRadio'+i+'" value="unitegrated">\
                                </div>\
                                <button data-gapfill="'+gapRef+solID+'"\
                                 class="hide btn btn-primary btn-mini integrate-btn">Integrate</button> \
                            */
                        }

                        var rxnAdditions = sol.reactionAdditions;
                        if (rxnAdditions.length == 0) {
                            var rxnInfo = $('<p>No reaction additions in this solution</p>')
                        } else {
                            var rxnInfo = $('<table class="gapfill-rxn-info">');
                            var header = $('<tr><th>Reaction</th>\
                                                <th>Equation</th></tr>');
                            rxnInfo.append(header);

                            for (var j in rxnAdditions) {
                                var rxnArray = rxnAdditions[j];
                                var row = $('<tr>');
                                row.append('<td><a class="gap-rxn" data-rxn="'+rxnArray[0]+'" >'+rxnArray[0]+'</a></td>');
                                row.append('<td>'+rxnArray[4]+'</td>');
                                rxnInfo.append(row);
                            }
                        }

                        var solResults = $('<div id="'+accepted_id+'" class="collapse">')
                        solResults.append(rxnInfo);

                        solList.append(solResults);
                    }

                    $(tr).next().children('td').append(solList.html());
                    $('.loader-gap-sol').remove();   

                })

            }            

        }

        
        function gapFillTable(models) {
            var gapTable = undefined;
            var active = false;

            var init_data = {
             "sPaginationType": "bootstrap",                
              "fnDrawCallback": events,      
              "iDisplayLength": 20,
              "aoColumns": [
                  { "sTitle": "Integrated", "sWidth": "10%"},
                  {"bVisible":    false},
                  { "sTitle": "Ref", "sWidth": "40%"},
                  { "sTitle": "Media"},
                  { "sTitle": "Media WS", "sWidth": "20%"},
                  {"bVisible": false},
                  {"bVisible": false}
              ],     
              "oLanguage": {
                "sSearch": "Search all:",
                "sEmptyTable": "No gapfill objects for this model."
              }
            }

            var initTable = function(settings){
                if (settings) {
                    gapTable = $('#gapfill-table').dataTable(settings);
                } else { 
                    gapTable = $('#gapfill-table').dataTable(init_data);
                }

                //add_search_boxes()
            }

            function add_search_boxes() {
                var single_search = '<th rowspan="1" colspan="1"><input type="text" \
                                          name="search_reactions" placeholder="Search" \
                                          class="search_init input-mini"> \
                                     </th>';
                var searches = $('<tr>');
                $('#gapfill-table thead tr th').each(function(){
                    $(this).css('border-bottom', 'none');
                    searches.append(single_search);
                })

                $('#gapfill-table thead').append(searches);
                $("thead input").keyup( function () {
                    gapTable.fnFilter( this.value, $("thead input").index(this) );
                });

                active = true;                
            }

            this.load_table = function(models) {
                var gaps = [];
                console.log(models)
                var ref = models.gapfillings[0].gapfill_ref

                var p = kb.ws.get_object_info([{wsid: ref.split('/')[0], objid: ref.split('/')[1] }])
                $.when(p).done(function(info) {
                    var ws =  info[0][5];
                    var id = info[0][1];

                })

                console.log('ref', ref)
                
                var p = kb.ws.get_objects([{ref: ref}])
                $.when(p).done(function(d){
                    console.log(JSON.stringify(d[0].data))
                    console.log(d)
                })

                var intGapfills = models.gapfillings;



                for (var i in intGapfills) {
                    var intGap = intGapfills[i];
                    if (intGap.length == 6) {
                        intGap.splice(0, 0, "Yes");
                        intGap.splice(2, 1, '<a class="show-gap" data-ref="'+intGap[2]+'" data-ws="'+ws+'">'
                            +intGap[2]+'</a>');
                    }
                }
                
                var unIntGapfills = models.gapfillings;
                for (var i in unIntGapfills) {
                    var unIntGap = unIntGapfills[i];
                    if (unIntGap.length == 6) {            
                        unIntGap.splice(0, 0, "No")
                        unIntGap.splice(2, 1, '<a class="show-gap" data-ref="'+unIntGap[2]+'" data-ws="'+ws+'" >'+
                            unIntGap[2]+'</a>');
                    }
                }

                if (unIntGapfills ) {
                    var gapfills = unIntGapfills.concat(intGapfills)                    
                }
                var gapfills = intGapfills;

                init_data.aaData = gapfills;
                initTable();
                gapTable.fnSort( [[1,'desc']] );
                //gapTable.fnAddData(gapfills);
                //gapTable.fnAdjustColumnSizing()
            }

            this.load_table(models);

            function events() {
                // tooltip for version hover
                $('.show-gap').tooltip({html: true, title:'show more info \
                    <i class="icon-list-alt icon-white history-icon"></i>'
                    , placement: 'right'});

                $('.show-gap').unbind('click');
                $('.show-gap').click(function() {
                    var gapRef = $(this).data('ref');
                    var ws = $(this).data('ref');                    

                    var tr = $(this).closest('tr')[0];
                    if ( gapTable.fnIsOpen( tr ) ) {
                        gapTable.fnClose( tr );
                    } else {
                        gapTable.fnOpen( tr, '', "info_row" );
                        $(this).closest('tr').next('tr').children('.info_row').append('<p class="muted loader-gap-sol"> \
                            <img src="assets/img/ajax-loader.gif"> loading possible solutions...</p>')                
                        showGapfillSolutions(tr, gapRef, ws);
                    }
                });
            }

            function showGapfillSolutions(tr, gapRef) {
                var gap_id = gapRef.split('/')[1]
                var gapAJAX = fba.get_gapfills({gapfills: [gap_id], workspaces: [ws]});
                $.when(gapAJAX).done(function(data) {
                    var data = data[0];  // only one gap fill solution at a time is cliclsked
                    var sols = data.solutions;

                    //$(tr).next().children('td').append('<h5>Gapfill Details</h5>');

                    var solList = $('<div class="gap-selection-list">');

                    for (var i in sols) {
                        var sol = sols[i];
                        var solID = sol.id;

                        if (sol.integrated == "1") {
                            solList.append('<div> <a type="button" class="gap-sol"\
                                data-toggle="collapse" data-target="#'+gap_id+solID.replace(/\./g,'_')+'" >'+
                                solID+'</a> <span class="caret" style="vertical-align: middle;"></span>\
                                 </div>');
                            /*
                            <div class="radio inline gapfill-radio"> \
                                    <input type="radio" name="gapfillRadios" id="gapfillRadio'+i+'" value="integrated" checked>\
                                </div> <span class="label integrated-label">Integrated</span>\
                                    <button data-gapfill="'+gapRef+solID+'"\
                                     class="hide btn btn-primary btn-mini integrate-btn">Integrate</button> \
                            */
                        } else {
                            solList.append('<div> <a type="button" class="gap-sol"\
                                data-toggle="collapse" data-target="#'+gap_id+solID.replace(/\./g,'_')+'" >'+
                                solID+'</a> <span class="caret" style="vertical-align: middle;"></span>\
                                </div>');

                            /*
                                <div class="radio inline gapfill-radio"> \
                                    <input type="radio" name="gapfillRadios" id="gapfillRadio'+i+'" value="unitegrated">\
                                </div>\
                                <button data-gapfill="'+gapRef+solID+'"\
                                 class="hide btn btn-primary btn-mini integrate-btn">Integrate</button> \
                            */                            
                        }

                        var rxnAdditions = sol.reactionAdditions;
                        if (rxnAdditions.length == 0) {
                            var rxnInfo = $('<p>No reaction additions in this solution</p>')
                        } else {
                            var rxnInfo = $('<table class="gapfill-rxn-info">');
                            var header = $('<tr><th>Reaction</th>\
                                                <th>Equation</th></tr>');
                            rxnInfo.append(header);

                            for (var j in rxnAdditions) {
                                var rxnArray = rxnAdditions[j];
                                var row = $('<tr>');
                                row.append('<td><a class="gap-rxn" data-rxn="'+rxnArray[0]+'" >'+rxnArray[0]+'</a></td>');
                                row.append('<td>'+rxnArray[4]+'</td>');
                                rxnInfo.append(row);
                            }
                        }

                        var solResults = $('<div id="'+gap_id+solID.replace(/\./g,'_')+'" class="collapse">')
                        solResults.append(rxnInfo);

                        solList.append(solResults);
                    }

                    $(tr).next().children('td').append(solList.html());
                    $('.loader-gap-sol').remove();


                    // events for gapfill page
                    $("input[name='gapfillRadios']").unbind('change');
                    $("input[name='gapfillRadios']").change(function(){
                        $('.integrate-btn').hide();
                        $(this).parent().next('.integrate-btn').show();
                    });

                    $('.gap-sol').unbind('click')
                    $('.gap-sol').click(function() {
                        var caret = $(this).next('span');
                        if (caret.hasClass('caret')) {
                            caret.removeClass('caret');
                            caret.addClass('caret-up');
                        } else {
                            caret.removeClass('caret-up');
                            caret.addClass('caret');                    
                        }

                    })
                    $('.integrate-btn').unbind('click');
                    $('.integrate-btn').click(function() {
                        $(this).after('<span class="muted loader-integrating" > \
                              <img src="assets/img/ajax-loader.gif"> loading...</span>')
                        var gapfill_id = $(this).data('gapfill');
                        var model = modelspace.active_kbids()[0]
                        var fbaAJAX = fba.integrate_reconciliation_solutions({model: model,
                            model_workspace: ws,
                            gapfillSolutions: [gapfill_id],
                            gapgenSolutions: [''],
                            workspace: ws})

                        $.when(fbaAJAX).done(function(data){
                            alert('NOTE: This functionality is still under development\n', data)
                            $('.loader-integrating').remove()
                        })
                    })

                    $('.gap-rxn').unbind('click');
                    $('.gap-rxn').click(function() {
                        var rxn = [$(this).data('rxn')];
                        self.trigger('rxnClick', {ids: rxn});
                    });            

                });

            }

        }
        

        //this._rewireIds(this.$elem, this);
        return this;
    }  //end init


})
}( jQuery ) );
